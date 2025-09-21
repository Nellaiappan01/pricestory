#!/usr/bin/env node
/**
 * scripts/batch-backfill-prices.js
 *
 * Attempt to fill missing `price` for trackedProducts.
 * Usage:
 *   node scripts/batch-backfill-prices.js --limit=50           (dry-run; no DB writes)
 *   node scripts/batch-backfill-prices.js --limit=50 --save    (persist updates)
 *
 * Requirements:
 *  - scripts should be run where .env.local is available (MONGODB_URI)
 *  - Playwright optional: install `npm i -D playwright` if you want the Playwright fallback.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { getDb } from "../src/lib/mongodb.js";

const argv = process.argv.slice(2);
const SAVE = argv.includes("--save");
const LIMIT_ARG = argv.find((a) => a.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Math.max(1, Number(LIMIT_ARG.split("=")[1]) || 50) : 50;
const DRY = !SAVE;

console.log("batch-backfill-prices starting", { LIMIT, dry: DRY });

// small helpers
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function extractFlipkartItemId(url) {
  if (!url) return null;
  try {
    const s = String(url);
    let m = s.match(/\/(itm[a-zA-Z0-9]+)/i);
    if (m) return m[1];
    m = s.match(/[?&]pid=([A-Z0-9]+)/i);
    if (m) return m[1];
    return null;
  } catch {
    return null;
  }
}

// Try Flipkart affiliate API for price (if token present)
async function tryFlipkartPrice(itemId) {
  const ID = process.env.FLIPKART_AFFILIATE_ID || process.env.NEXT_PUBLIC_FLIPKART_AFFID || "";
  const TOKEN = process.env.FLIPKART_AFFILIATE_TOKEN || "";
  if (!itemId || !TOKEN) return null;

  const url = `https://affiliate-api.flipkart.net/affiliate/product/json?id=${encodeURIComponent(itemId)}`;
  try {
    const res = await fetch(url, {
      headers: { "Fk-Affiliate-Id": ID, "Fk-Affiliate-Token": TOKEN, Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const base = json?.productBaseInfoV1 || json?.product_base_info_v1 || json?.product || json;
    if (!base) return null;
    // possible price fields
    const priceObj = base?.productRetailPrice || base?.productBaseInfo?.productRetailPrice || base?.price || null;
    // try typical shapes
    let price = null;
    if (priceObj) {
      if (typeof priceObj === "object") {
        // Flipkart sometimes returns { amount: 1234, currency: 'INR' }
        price = priceObj.amount ?? priceObj.value ?? priceObj;
      } else {
        price = priceObj;
      }
    }
    // fallback: some responses have "sellingPrice" or "price"
    price = price ?? base?.sellingPrice?.amount ?? base?.sellingPrice?.value ?? base?.price;
    if (price == null) return null;
    return Number(price);
  } catch (err) {
    console.warn("flipkart API price error:", err?.message || err);
    return null;
  }
}

// Try Amazon API? (only if you have credentials) — placeholder, currently disabled
async function tryAmazonPriceFromJson(asinOrUrl) {
  return null;
}

// Playwright fallback to scrape price from product page
async function playwrightGetPrice(url) {
  if (!url) return null;
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      viewport: { width: 1200, height: 800 },
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    // slight wait to let dynamic content paint
    await page.waitForTimeout(700);

    // Evaluate page for likely price selectors and OG meta
    const result = await page.evaluate(() => {
      const pickMeta = (names) => {
        for (const n of names) {
          const el = document.querySelector(`meta[property="${n}"], meta[name="${n}"]`);
          if (el) {
            const c = el.getAttribute("content");
            if (c) return c;
          }
        }
        return null;
      };

      const textFromSel = (sels) => {
        for (const s of sels) {
          const el = document.querySelector(s);
          if (!el) continue;
          const t = el.textContent && el.textContent.trim();
          if (t) return t;
        }
        return null;
      };

      // common Flipkart / Amazon selectors (not guaranteed)
      const priceSelectors = [
        'meta[property="product:price:amount"]',
        'meta[name="twitter:data1"]',
        'meta[property="og:price:amount"]',
        'span._30jeq3', // Flipkart price class
        'div._30jeq3', // sometimes
        'span.price', // generic
        '#priceblock_ourprice', // amazon old id
        '#priceblock_dealprice',
        '.a-price .a-offscreen' // amazon new
      ];

      // try meta price first
      let price = pickMeta(["product:price:amount", "og:price:amount"]);
      if (price) return price;

      // try selectors text
      const selText = textFromSel(priceSelectors);
      if (selText) return selText;

      // fallback: look for digits with rupee sign in the document
      const bodyText = document.body.innerText || "";
      const rupeeMatch = bodyText.match(/[₹₹\u20B9]\s?[\d,]+(\.\d+)?/);
      if (rupeeMatch) return rupeeMatch[0];

      const numMatch = bodyText.match(/\b\d{3,}([,.\d]{0,})\b/);
      if (numMatch) return numMatch[0];
      return null;
    });

    await page.close();
    await context.close();
    await browser.close();

    if (!result) return null;
    // normalize price string -> number
    const s = String(result).replace(/[^\d.]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  } catch (err) {
    console.warn("playwrightGetPrice error:", err?.message || err);
    return null;
  }
}

(async function main() {
  try {
    const db = await getDb();
    const q = {
      $or: [{ price: null }, { price: { $exists: false } }],
    };
    const docs = await db.collection("trackedProducts").find(q).limit(LIMIT).toArray();
    console.log("Found docs to backfill price:", docs.length, " (dry-run:", DRY, ")");

    for (const doc of docs) {
      const url = doc.url || "";
      console.log("----");
      console.log("Doc:", String(doc._id), "url:", url, "current price:", doc.price);

      let price = null;
      const itemId = extractFlipkartItemId(url);

      // 1) try Flipkart affiliate API (if available)
      if (itemId) {
        console.log("Trying Flipkart API for price, itemId:", itemId);
        price = await tryFlipkartPrice(itemId);
        if (price != null) console.log("Flipkart API price:", price);
      }

      // 2) try Amazon API (if implemented) — placeholder
      if (price == null) {
        // price = await tryAmazonPriceFromJson(url);
      }

      // 3) Playwright fallback
      if (price == null) {
        console.log("Trying Playwright scrape for price...");
        price = await playwrightGetPrice(url);
        if (price != null) console.log("Playwright price:", price);
      }

      if (price == null) {
        console.log("No price found for doc:", String(doc._id));
      } else {
        console.log("Normalized price ->", price);
        if (!DRY) {
          try {
            await db.collection("trackedProducts").updateOne({ _id: doc._id }, { $set: { price }, $currentDate: { updatedAt: true } });
            console.log("Saved price for", String(doc._id));
          } catch (err) {
            console.warn("DB update failed:", err?.message || err);
          }
        } else {
          console.log("DRY RUN - would save price:", price);
        }
      }

      // polite sleep to avoid hammering
      await sleep(300 + rand(0, 500));
    }

    console.log("Done.");
    process.exit(0);
  } catch (err) {
    console.error("Fatal:", err?.message || err);
    process.exit(1);
  }
})();
