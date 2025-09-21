#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { getDb } from '../src/lib/mongodb.js';
import { chromium } from 'playwright';

function extractItemId(urlOrText){
  if(!urlOrText) return null;
  const m = String(urlOrText).match(/(itm[a-zA-Z0-9]+)/i);
  if(m) return m[1];
  const m2 = String(urlOrText).match(/[?&]pid=([A-Z0-9]+)/i);
  if(m2) return m2[1];
  return null;
}

async function playwrightScrape(url){
  if(!url) return null;
  let browser;
  try{
    browser = await chromium.launch({ headless: true, args:['--no-sandbox'] });
    const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(700);
    const meta = await page.evaluate(()=>{
      const pick = (sels)=>{
        for(const s of sels){
          const el = document.querySelector(s);
          if(!el) continue;
          if(el.tagName === 'META') {
            const c = el.getAttribute('content'); if(c) return c; else continue;
          }
          const t = el.textContent && el.textContent.trim();
          if(t) return t;
        }
        return null;
      };
      return {
        title: pick(['meta[property=\"og:title\"]','meta[name=\"og:title\"]','h1','title']) || document.title || null,
        image: pick(['meta[property=\"og:image\"]','meta[name=\"og:image\"]','img[src*=\"rukmini\"]','img']) || null
      };
    });
    await page.close();
    await context.close();
    await browser.close();
    return meta;
  }catch(e){
    try{ if(browser) await browser.close(); }catch(_){}
    console.warn('playwright error', e && e.message);
    return null;
  }
}

async function tryFlipkartApi(itemId){
  const ID = process.env.FLIPKART_AFFILIATE_ID || '';
  const TOKEN = process.env.FLIPKART_AFFILIATE_TOKEN || '';
  if(!ID || !TOKEN || !itemId) return null;
  const url = `https://affiliate-api.flipkart.net/affiliate/product/json?id=${encodeURIComponent(itemId)}`;
  try {
    const res = await fetch(url, { headers: { 'Fk-Affiliate-Id': ID, 'Fk-Affiliate-Token': TOKEN }});
    if(!res.ok) return { ok: false, status: res.status };
    const json = await res.json().catch(()=>null);
    const maybe = json?.productBaseInfoV1 || json?.product || json;
    const title = maybe?.title || maybe?.productTitle || null;
    let image = null;
    if(maybe){
      image = maybe.imageUrl || maybe.image || null;
      if(!image && maybe.imageUrls) image = Object.values(maybe.imageUrls)[0];
    }
    return { title, image };
  } catch(e){
    console.warn('flipkart api error', e && e.message);
    return null;
  }
}

(async ()=>{
  const arg = process.argv[2];
  if(!arg){ console.error('Usage: node scripts/backfill-one.js <_id|itm...|url>'); process.exit(1); }
  const db = await getDb();
  // try to find doc by _id first
  let doc = null;
  try {
    // attempt ObjectId lookup if possible
    try{ const { ObjectId } = await import('mongodb'); doc = await db.collection('trackedProducts').findOne({ _id: new ObjectId(arg) }); }catch{}
    if(!doc) doc = await db.collection('trackedProducts').findOne({ $or: [{ url: arg }, { title: arg }, { id: arg }] });
    if(!doc) {
      console.log('No DB doc found, will try to backfill using arg as URL/itemId');
    } else {
      console.log('Found doc:', String(doc._id), doc.url, doc.title);
    }
  } catch(e){ console.error('DB lookup error', e); process.exit(1); }

  const urlToCheck = doc?.url || (arg.startsWith('http') ? arg : (arg.includes('itm') ? `https://www.flipkart.com/p/${arg}` : arg));
  const itemId = extractItemId(urlToCheck) || extractItemId(arg);

  let result = null;
  if(itemId){
    console.log('Trying Flipkart API for', itemId);
    result = await tryFlipkartApi(itemId);
    if(result && (result.title || result.image)) console.log('API result', !!result.title, !!result.image);
  }
  if(!result || (!result.title && !result.image)){
    console.log('Falling back to Playwright for', urlToCheck);
    result = await playwrightScrape(urlToCheck);
    console.log('Playwright result', !!result?.title, !!result?.image);
  }

  if(!result || (!result.title && !result.image)){
    console.log('No metadata found.');
    process.exit(0);
  }

  const updates = {};
  if(result.title) updates.title = result.title;
  if(result.image) updates.image = result.image;
  console.log('Updates to apply:', updates);

  if(doc){
    await db.collection('trackedProducts').updateOne({ _id: doc._id }, { $set: updates, $currentDate: { updatedAt: true } });
    console.log('Saved updates to DB for', String(doc._id));
  } else {
    console.log('No DB doc to update. You can manually update or re-run with a DB _id.');
  }
  process.exit(0);
})();
