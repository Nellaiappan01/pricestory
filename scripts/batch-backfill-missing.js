#!/usr/bin/env node
// scripts/batch-backfill-missing.js
// Purpose: backfill missing title/image for tracked products (Flipkart-first, Playwright fallback)
// Usage:
//   node scripts/batch-backfill-missing.js --limit=50          (dry-run default, no DB writes)
//   node scripts/batch-backfill-missing.js --limit=50 --save   (actually persist updates)
//   node scripts/batch-backfill-missing.js --limit=30 --dry    (explicit dry-run)

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { getDb } from "../src/lib/mongodb.js";

const argv = process.argv.slice(2);
const SAVE_FLAG = argv.includes("--save") || argv.includes("save");
const DRY_FLAG = argv.includes("--dry") || argv.includes("dry");
const limitArg = argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Math.max(1, Number(limitArg.split("=")[1]) || 50) : 50;
const actuallySave = SAVE_FLAG && !DRY_FLAG;

console.log("batch-backfill-missing starting", { LIMIT, dry: !actuallySave, saveFlag: SAVE_FLAG });

/* Helpers */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* Try extract Flipkart item id from URL or text */
function extractFlipkartItemId(urlOrText) {
  if (!urlOrText) return null;
  try {
    const s = String(urlOrText);
    // common: /.../itmXXXXXXXX or query pid=...
    let m = s.match(/\/(itm[a-zA-Z0-9]+)/i);
    if (m && m[1]) return m[1];
    m = s.match(/[?&]pid=([A-Z0-9]{6,})/i);
    if (m && m[1]) return m[1];
    // sometimes the id is given as 'itm...' inside text
    m = s.match(/\b(itm[a-zA-Z0-9]+)\b/i);
    if (m && m[1]) return m[1];
    return null;
  } catch {
    return null;
  }
}

/* Flipkart affiliate API attempt */
async function tryFlipkartApi(itemId) {
  const ID = process.env.FLIPKART_AFFILIATE_ID || process.env.NEXT_PUBLIC_FLIPKART_AFFID || "";
  const TOKEN = process.env.FLIPKART_AFFILIATE_TOKEN || "";
  if (!itemId || !TOKEN) return null;

  const urls = [
    `https://affiliate-api.flipkart.net/affiliate/product/json?id=${encodeURIComponent(itemId)}`,
    `https://affiliate-api.flipkart.net/affiliate/product/json?itemId=${encodeURIComponent(itemId)}`
  ];

  for (const apiUrl of urls) {
    try {
      const res = await fetch(apiUrl, {
        headers: {
          "Fk-Affiliate-Id": ID,
          "Fk-Affiliate-Token": TOKEN,
          Accept: "application/json",
        },
        // Node 18+ has global fetch; if older Node you'll need node-fetch installed
      });
      if (!res.ok) {
        console.warn("Flipkart API returned status", res.status, "for", itemId);
        continue;
      }
      const json = await res.json().catch(() => null);
      if (!json) continue;

      const candidateBases = [json.productBaseInfoV1, json.product_base_info_v1, json.product, json];
      for (const base of candidateBases) {
        if (!base) continue;
        const title = base.title || base.name || base.productTitle || base.product_title || null;
        let image = null;
        if (base.imageUrls && typeof base.imageUrls === "object") {
          if (base.imageUrls["200x200"]) image = base.imageUrls["200x200"];
          else {
            const vals = Object.values(base.imageUrls);
            if (vals.length) image = Array.isArray(vals[0]) ? vals[0][0] : vals[0];
          }
        }
        image = image || base.imageUrl || base.image || base.image_url || null;

        if (title || image) {
          return {
            title: title ? String(title).trim() : null,
            image: image ? String(image) : null,
            source: "flipkart-api",
          };
        }
      }
    } catch (err) {
      console.warn("Flipkart API fetch error (continuing):", err?.message || err);
      continue;
    }
  }
  return null;
}

/* Playwright fallback: dynamic import so not required unless used */
async function playwrightScrape(url) {
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
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(600);

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
          const src = el.getAttribute && el.getAttribute("src");
          const text = el.textContent && el.textContent.trim();
          if (src) return src;
          if (text) return text;
        }
        return null;
      };

      const title = pick([
        'meta[property="og:title"]',
        'meta[name="og:title"]',
        'meta[property="twitter:title"]',
        'meta[name="twitter:title"]',
        "h1[itemprop='name']",
        "h1",
        "title",
      ]) || document.title || null;

      const image = pick([
        'meta[property="og:image"]',
        'meta[name="og:image"]',
        'meta[property="twitter:image"]',
        'meta[name="twitter:image"]',
        "img#imgC",
        "img[src*='rukmini']",
        "img",
      ]);

      return { title, image };
    });

    await page.close();
    await context.close();
    await browser.close();

    if (!meta || (!meta.title && !meta.image)) return null;
    return { title: meta.title ? String(meta.title).trim() : null, image: meta.image ? String(meta.image) : null, source: "playwright" };
  } catch (err) {
    console.warn("playwright error:", err?.message || err);
    return null;
  }
}

/* crude placeholder-detection */
function looksLikePlaceholderTitle(title) {
  if (!title) return true;
  const t = String(title).trim();
  if (!t) return true;
  if (/^www\./i.test(t)) return true;
  if (/^itm[a-z0-9]+$/i.test(t)) return true;
  // Flipkart fallback titles sometimes are long but still better than placeholder — treat short hashed strings as placeholders
  if (/^[a-f0-9]{8,}$/i.test(t)) return true;
  return false;
}

/* Query and run */
(async function main() {
  try {
    const db = await getDb();
    const q = {
      $or: [
        { title: null },
        { title: { $exists: false } },
        { image: null },
        { image: { $exists: false } },
        { title: { $regex: /^www\./i } },
        { title: { $regex: /^itm[a-z0-9]+$/i } },
      ],
    };

    const cursor = db.collection("trackedProducts").find(q).limit(LIMIT);
    const docs = await cursor.toArray();
    console.log(`Found ${docs.length} docs to attempt backfill (limit ${LIMIT}) - dry: ${!actuallySave}`);

    for (const doc of docs) {
      console.log("----");
      console.log("Doc:", String(doc._id), "url:", doc.url, " current title:", doc.title);
      let found = null;

      // try Flipkart API when possible
      const itemId = extractFlipkartItemId(doc.url || doc.title || "");
      if (itemId) {
        console.log("Trying Flipkart API for", itemId);
        const apiRes = await tryFlipkartApi(itemId);
        if (apiRes && (apiRes.title || apiRes.image)) {
          console.log("Flipkart API returned", { title: !!apiRes.title, image: !!apiRes.image });
          found = apiRes;
        }
      } else {
        console.log("No Flipkart itemId extracted");
      }

      // fallback to Playwright if nothing useful yet
      if (!found) {
        console.log("Trying Playwright scrape:", doc.url);
        const scraped = await playwrightScrape(doc.url);
        if (scraped && (scraped.title || scraped.image)) {
          console.log("Playwright returned", { title: !!scraped.title, image: !!scraped.image });
          found = scraped;
        } else {
          console.log("No metadata found via Playwright");
        }
      }

      if (found) {
        const updates = {};
        if (found.title && looksLikePlaceholderTitle(doc.title)) updates.title = found.title;
        if (found.image && !doc.image) updates.image = found.image;

        if (Object.keys(updates).length) {
          console.log("Would update:", updates);
          if (actuallySave) {
            try {
              await db.collection("trackedProducts").updateOne({ _id: doc._id }, { $set: updates, $currentDate: { updatedAt: true } });
              console.log("Saved update for", String(doc._id));
            } catch (err) {
              console.warn("DB update failed:", err?.message || err);
            }
          }
        } else {
          console.log("No meaningful updates needed for this doc.");
        }
      } else {
        console.log("Skipping — no new metadata found.");
      }

      // polite delay
      await sleep(300 + rand(0, 400));
    }

    console.log("Done.");
    process.exit(0);
  } catch (err) {
    console.error("Fatal error:", err?.message || err);
    process.exit(1);
  }
})();
