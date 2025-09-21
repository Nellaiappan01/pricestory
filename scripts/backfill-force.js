// scripts/backfill-force.js
// Run: node scripts/backfill-force.js
// WARNING: this will attempt to re-fetch title/image for every trackedProducts doc and overwrite existing values.
// Use small BATCH_SIZE to avoid heavy load.

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { getDb } from "../src/lib/mongodb.js"; // adjust path if your helper is elsewhere
import { chromium } from "playwright";

const FLIPKART_ID = process.env.FLIPKART_AFFILIATE_ID || "";
const FLIPKART_TOKEN = process.env.FLIPKART_AFFILIATE_TOKEN || "";
const BATCH_SIZE = Number(process.env.BACKFILL_BATCH_SIZE ?? 10); // items per run
const DELAY_MS = Number(process.env.BACKFILL_DELAY_MS ?? 500); // pause between items

function extractFlipkartItemId(url) {
  if (!url) return null;
  try {
    if (!url.startsWith("http")) {
      const m = url.match(/^(itm[a-zA-Z0-9]+)/i);
      return m ? m[1] : null;
    }
    const u = new URL(url);
    const path = u.pathname || "";
    const m = path.match(/\/(itm[a-zA-Z0-9]+)/i) || path.match(/\/([a-zA-Z0-9]{12,})/);
    if (m && m[1]) return m[1];
    const parts = path.split("-");
    for (let i = parts.length - 1; i >= 0; i--) {
      if (/^itm[a-zA-Z0-9]+$/i.test(parts[i])) return parts[i];
    }
  } catch {}
  return null;
}

async function tryFlipkartApi(itemId) {
  if (!itemId || !FLIPKART_TOKEN) return null;
  const urls = [
    `https://affiliate-api.flipkart.net/affiliate/product/json?id=${encodeURIComponent(itemId)}`,
    `https://affiliate-api.flipkart.net/affiliate/product/json?itemId=${encodeURIComponent(itemId)}`
  ];
  for (const apiUrl of urls) {
    try {
      const res = await fetch(apiUrl, {
        headers: {
          "Fk-Affiliate-Id": FLIPKART_ID,
          "Fk-Affiliate-Token": FLIPKART_TOKEN,
          Accept: "application/json",
        },
      });
      if (!res.ok) continue;
      const json = await res.json().catch(() => null);
      if (!json) continue;

      const bases = [json.productBaseInfoV1, json.product_base_info_v1, json.product, json];
      for (const base of bases) {
        if (!base) continue;
        const title = base.title || base.name || base.product_title || null;
        let image = null;
        if (base.imageUrls) {
          if (base.imageUrls["200x200"]) image = base.imageUrls["200x200"];
          else {
            const vals = Object.values(base.imageUrls);
            if (vals.length) image = Array.isArray(vals[0]) ? vals[0][0] : vals[0];
          }
        }
        if (!image && base.imageUrl) image = base.imageUrl;
        if (title || image) return { title, image };
      }
    } catch (err) {
      // continue to next endpoint
      continue;
    }
  }
  return null;
}

async function playwrightExtract(url) {
  try {
    const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"], headless: true });
    const page = await browser.newPage({ timeout: 20000 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(700);
    const meta = await page.evaluate(() => {
      const get = (prop) => {
        const el = document.querySelector(`meta[property="${prop}"]`) || document.querySelector(`meta[name="${prop}"]`);
        return el ? el.getAttribute("content") : null;
      };
      return {
        title: get("og:title") || get("twitter:title") || document.title || null,
        image: get("og:image") || get("twitter:image") || null,
      };
    });
    await browser.close();
    return meta;
  } catch (err) {
    console.warn("playwrightExtract error:", err?.message || err);
    return null;
  }
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function processDoc(db, doc) {
  const url = doc.url ?? doc.link ?? null;
  let newTitle = null;
  let newImage = null;

  if (url && url.includes("flipkart.com")) {
    const itemId = extractFlipkartItemId(url);
    if (itemId) {
      const apiRes = await tryFlipkartApi(itemId);
      if (apiRes) { newTitle = apiRes.title ?? null; newImage = apiRes.image ?? null; }
    }
  }

  // Playwright fallback (always try if we don't have both)
  if (url && (!newTitle || !newImage)) {
    const scraped = await playwrightExtract(url);
    if (scraped) {
      if (scraped.title) newTitle = scraped.title;
      if (scraped.image) newImage = scraped.image;
    }
  }

  // Persist back (overwrite if values found)
  const updates = {};
  if (newTitle) updates.title = newTitle;
  if (newImage) updates.image = newImage;
  if (Object.keys(updates).length) {
    await db.collection("trackedProducts").updateOne({ _id: doc._id }, { $set: updates });
    console.log("Overwrote", doc._id.toString(), updates);
  } else {
    console.log("No new data for", doc._id.toString());
  }
}

async function main() {
  console.log("Force backfill start — batch:", BATCH_SIZE, "delay(ms):", DELAY_MS);
  const db = await getDb();
  const cursor = db.collection("trackedProducts").find({}).limit(BATCH_SIZE);
  const docs = await cursor.toArray();
  if (!docs.length) { console.log("No docs to process"); process.exit(0); }

  for (const doc of docs) {
    try {
      console.log("Processing:", doc._id.toString(), doc.url ?? "");
      await processDoc(db, doc);
    } catch (err) {
      console.error("Error processing", doc._id?.toString?.(), err?.message || err);
    }
    await sleep(DELAY_MS);
  }

  console.log("Force backfill finished for this batch.");
  process.exit(0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
