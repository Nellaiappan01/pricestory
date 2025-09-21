#!/usr/bin/env node
// scripts/batch-backfill-missing.js
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { getDb } from "../src/lib/mongodb.js"; // must exist
import { chromium } from "playwright";

const argv = process.argv.slice(2);
const save = argv.includes("--save");
const limitArg = argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 50;

function extractFlipkartItemId(urlOrText) {
  if (!urlOrText) return null;
  const m = String(urlOrText).match(/(itm[a-zA-Z0-9]+)/i);
  if (m) return m[1];
  const m2 = String(urlOrText).match(/[?&]pid=([A-Z0-9]+)/i);
  if (m2) return m2[1];
  return null;
}

async function tryFlipkartApi(itemId) {
  const ID = process.env.FLIPKART_AFFILIATE_ID || process.env.NEXT_PUBLIC_FLIPKART_AFFID || "";
  const TOKEN = process.env.FLIPKART_AFFILIATE_TOKEN || "";
  if (!itemId || !TOKEN) return null;

  const url = `https://affiliate-api.flipkart.net/affiliate/product/json?id=${encodeURIComponent(itemId)}`;
  try {
    const r = await fetch(url, { headers: { "Fk-Affiliate-Id": ID, "Fk-Affiliate-Token": TOKEN, Accept: "application/json" } });
    if (!r.ok) {
      return { ok: false, status: r.status };
    }
    const json = await r.json().catch(()=>null);
    const maybe = json?.productBaseInfoV1 || json?.product_base_info_v1 || json?.product || json;
    const title = maybe?.title || maybe?.productTitle || maybe?.name || null;
    let image = null;
    if (maybe) {
      if (maybe.imageUrls && typeof maybe.imageUrls === "object") {
        const vals = Object.values(maybe.imageUrls);
        if (vals.length) image = Array.isArray(vals[0]) ? vals[0][0] : vals[0];
      }
      image = image || maybe?.imageUrl || maybe?.image || null;
    }
    return { title: title || null, image: image || null, source: "flipkart-api" };
  } catch (err) {
    console.warn("Flipkart API fetch error (continuing):", err && err.message ? err.message : err);
    return null;
  }
}

async function playwrightScrape(url) {
  if (!url) return null;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
    const context = await browser.newContext({ userAgent: ua, viewport: { width: 1200, height: 800 } });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(700);

    const meta = await page.evaluate(() => {
      const pick = (selectors) => {
        for (const s of selectors) {
          const el = document.querySelector(s);
          if (!el) continue;
          if (el.tagName === "META") {
            const c = el.getAttribute("content");
            if (c) return c;
            continue;
          }
          const text = el.textContent && el.textContent.trim();
          if (text) return text;
        }
        return null;
      };
      const title = pick([
        'meta[property="og:title"]',
        'meta[name="og:title"]',
        'meta[name="twitter:title"]',
        'meta[property="twitter:title"]',
        'meta[name="title"]',
        'h1[itemprop="name"]',
        'h1',
        'title'
      ]) || document.title || null;

      const image = pick([
        'meta[property="og:image"]',
        'meta[name="og:image"]',
        'meta[name="twitter:image"]',
        'meta[property="twitter:image"]',
        'img#imgC',
        'img[src*="rukmini"]',
        'img'
      ]);

      return { title, image };
    });

    await page.close();
    await context.close();
    await browser.close();
    return { title: meta.title || null, image: meta.image || null, source: "playwright" };
  } catch (err) {
    try { if (browser) await browser.close(); } catch (e) {}
    console.warn("playwright error:", err && (err.message || err));
    return null;
  }
}

function looksLikePlaceholderTitle(title) {
  if (!title) return true;
  const t = String(title).trim();
  if (!t) return true;
  if (/^www\./i.test(t)) return true;
  if (/^itm[a-z0-9]+$/i.test(t)) return true;
  return false;
}

(async function main() {
  const db = await getDb();
  const q = {
    $or: [
      { title: null },
      { title: { $exists: false } },
      { image: null },
      { image: { $exists: false } },
      { title: { $regex: /^www\\./, $options: "i" } },
      { title: { $regex: /^itm[a-z0-9]+$/i } }
    ]
  };

  const cursor = db.collection("trackedProducts").find(q).limit(limit);
  const docs = await cursor.toArray();
  console.log(`Found ${docs.length} docs to attempt backfill (limit) ${limit} dry: ${!save}`);

  for (const doc of docs) {
    console.log("----");
    console.log("Doc:", String(doc._id), "url:", doc.url, " current title:", doc.title);
    let found = null;
    const itemId = extractFlipkartItemId(doc.url || doc.title || "");
    if (itemId) {
      console.log("Trying Flipkart API for", itemId);
      const apiRes = await tryFlipkartApi(itemId);
      if (apiRes && (apiRes.title || apiRes.image)) {
        console.log("Flipkart API returned:", !!apiRes.title, !!apiRes.image);
        found = apiRes;
      } else {
        if (apiRes && apiRes.ok === false) {
          console.log("Flipkart API status", apiRes.status);
        }
      }
    } else {
      console.log("No itemId extracted for API");
    }

    if (!found) {
      console.log("Trying Playwright scrape:", doc.url);
      const scraped = await playwrightScrape(doc.url);
      if (scraped && (scraped.title || scraped.image)) {
        console.log("Playwright scraped:", !!scraped.title, !!scraped.image);
        found = scraped;
      } else {
        console.log("No metadata found — skipping.");
      }
    }

    if (found) {
      const updates = {};
      if (found.title && looksLikePlaceholderTitle(doc.title)) updates.title = found.title;
      if (found.image && !doc.image) updates.image = found.image;
      if (Object.keys(updates).length) {
        console.log("Would update:", updates);
        if (save) {
          try {
            await db.collection("trackedProducts").updateOne({ _id: doc._id }, { $set: updates, $currentDate: { updatedAt: true } });
            console.log("Saved update for", String(doc._id));
          } catch (err) {
            console.warn("DB update failed:", err && err.message);
          }
        }
      } else {
        console.log("No meaningful updates needed for this doc.");
      }
    }
  }

  console.log("Done.");
  process.exit(0);
})();
