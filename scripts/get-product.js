// scripts/get-product.js
// Usage:
//   node scripts/get-product.js <id-or-item-or-url-fragment> [--save]
// Examples:
//   node scripts/get-product.js 68cf7eeb875c5b7b5e7e0c0c
//   node scripts/get-product.js itm91e9841aadcae
//   node scripts/get-product.js "flipkart.com itm91e9" --save

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { getDb } from "../src/lib/mongodb.js";
import { ObjectId } from "mongodb";

const FLIPKART_ID = process.env.FLIPKART_AFFILIATE_ID || "";
const FLIPKART_TOKEN = process.env.FLIPKART_AFFILIATE_TOKEN || "";

/* ---------------- utils ---------------- */
function isObjectIdLike(s) {
  return typeof s === "string" && /^[0-9a-fA-F]{24}$/.test(s);
}

function parseNumericPrice(text) {
  if (!text) return null;
  try {
    const n = Number(String(text).replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? Math.round(n) : null;
  } catch {
    return null;
  }
}

function latestPriceFromHistory(history) {
  if (!Array.isArray(history) || history.length === 0) return null;
  const last = history[history.length - 1];
  return last && typeof last === "object" && last.p ? Number(last.p) : null;
}

/* ---------------- Flipkart API helper (same logic as server) ---------------- */
async function tryFlipkartApi(itemId) {
  if (!itemId || !FLIPKART_TOKEN) return null;
  const apiUrls = [
    `https://affiliate-api.flipkart.net/affiliate/product/json?id=${encodeURIComponent(itemId)}`,
    `https://affiliate-api.flipkart.net/affiliate/product/json?itemId=${encodeURIComponent(itemId)}`,
  ];

  for (const apiUrl of apiUrls) {
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

      const candidates = [
        json.productBaseInfoV1,
        json.product_base_info_v1,
        json.product,
        json,
      ];

      for (const base of candidates) {
        if (!base) continue;
        const title = base.title || base.name || base.product_title || null;
        let image = null;
        if (base.imageUrls && typeof base.imageUrls === "object") {
          if (base.imageUrls["200x200"]) image = base.imageUrls["200x200"];
          else {
            const vals = Object.values(base.imageUrls);
            if (vals.length) image = Array.isArray(vals[0]) ? vals[0][0] : vals[0];
          }
        }
        if (!image && base.imageUrl) image = base.imageUrl;
        if (!image && base.image_url) image = base.image_url;

        // price heuristics
        let price = null;
        try {
          const selling = base.flipkartSellingPrice || base.flipkart_selling_price || base.flipkartSellingPriceV1;
          const mrp = base.maximumRetailPrice || base.mrp || base.maximum_retail_price;
          if (selling && (selling.amount || selling.value)) {
            price = parseNumericPrice(selling.amount ?? selling.value);
          } else if (mrp && (mrp.amount || mrp.value)) {
            price = parseNumericPrice(mrp.amount ?? mrp.value);
          } else if (base.price) {
            price = parseNumericPrice(base.price);
          }
        } catch (e) {
          price = null;
        }

        if (title || image || price != null) {
          return {
            title: title ? String(title).trim() : null,
            image: image ? String(image) : null,
            price: price != null ? Number(price) : null,
          };
        }
      }
    } catch (err) {
      continue;
    }
  }
  return null;
}

/* ---------------- extract Flipkart item-id ---------------- */
function extractFlipkartItemId(url) {
  if (!url) return null;
  try {
    if (url.startsWith("http")) {
      const u = new URL(url);
      const path = u.pathname || "";
      const m = path.match(/\/(itm[a-zA-Z0-9]+)/i) || path.match(/\/([a-zA-Z0-9]{10,})/);
      if (m && m[1]) return m[1];
      const parts = path.split("-");
      for (let i = parts.length - 1; i >= 0; i--) {
        if (/^itm[a-zA-Z0-9]+$/i.test(parts[i])) return parts[i];
      }
      return null;
    } else {
      const m = url.match(/^(itm[a-zA-Z0-9]+)$/i);
      return m ? m[1] : null;
    }
  } catch {
    return null;
  }
}

/* ---------------- Playwright fallback ---------------- */
async function playwrightExtract(url) {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    });
    const page = await browser.newPage({ timeout: 20000 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(600);

    const meta = await page.evaluate(() => {
      const get = (prop) => {
        const el = document.querySelector(`meta[property="${prop}"]`) || document.querySelector(`meta[name="${prop}"]`);
        return el ? el.getAttribute("content") : null;
      };

      const title = get("og:title") || get("twitter:title") || document.title || null;

      const image =
        get("og:image") ||
        get("twitter:image") ||
        document.querySelector("img[src*='rukmini']")?.getAttribute("src") ||
        document.querySelector("img")?.getAttribute("src") ||
        null;

      // price selector heuristics
      const selCandidates = ["._30jeq3._16Jk6d", "._30jeq3", ".selling-price-offer .price", ".price", "[data-price]"];
      let priceText = null;
      for (const sel of selCandidates) {
        const el = document.querySelector(sel);
        if (el && el.textContent && el.textContent.trim()) {
          priceText = el.textContent.trim();
          break;
        }
      }

      return { title, image, priceText };
    });

    await browser.close();
    if (!meta) return null;
    return {
      title: meta.title ? String(meta.title).trim() : null,
      image: meta.image ? String(meta.image) : null,
      price: meta.priceText ? String(meta.priceText) : null,
    };
  } catch (err) {
    console.error("playwrightExtract failed:", err?.message || err);
    return null;
  }
}

/* ---------------- main ---------------- */
async function main() {
  const raw = process.argv[2];
  const save = process.argv.includes("--save");
  if (!raw) {
    console.error("Usage: node scripts/get-product.js <id|itemId|url-fragment> [--save]");
    process.exit(1);
  }

  const db = await getDb();
  let doc = null;

  if (isObjectIdLike(raw)) {
    doc = await db.collection("trackedProducts").findOne({ _id: new ObjectId(raw) });
  }

  if (!doc) {
    // match by url fragment (case-insensitive)
    const regex = new RegExp(raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    doc = await db.collection("trackedProducts").findOne({ url: { $regex: regex } });
  }

  if (!doc) {
    doc = await db.collection("trackedProducts").findOne({ id: raw });
  }

  if (!doc) {
    console.error("No product found for:", raw);
    process.exit(2);
  }

  console.log("Found document (DB):");
  console.dir(doc, { depth: 4, colors: true });

  // enrichment attempt
  const url = doc.url ?? doc.link ?? null;
  let title = doc.title && String(doc.title).trim() ? String(doc.title).trim() : null;
  let image = doc.image ?? null;
  let price = typeof doc.price === "number" ? doc.price : (doc.price != null ? parseNumericPrice(String(doc.price)) : null);
  const history = Array.isArray(doc.priceHistory) ? doc.priceHistory.slice() : [];

  // Flipkart API if relevant
  if (url && url.includes("flipkart.com")) {
    const itemId = extractFlipkartItemId(url);
    if (itemId) {
      console.log("Trying Flipkart API for", itemId);
      const apiDetails = await tryFlipkartApi(itemId).catch(() => null);
      console.log("Flipkart API result:", apiDetails);
      if (apiDetails) {
        if (apiDetails.title && !title) title = apiDetails.title;
        if (apiDetails.image && !image) image = apiDetails.image;
        if (apiDetails.price != null && (price == null || Number(price) !== Number(apiDetails.price))) {
          price = Number(apiDetails.price);
        }
      }
    }
  }

  // Playwright fallback if needed (or to get price)
  if (url && (!title || !image || price == null)) {
    console.log("Falling back to Playwright for", url);
    const scraped = await playwrightExtract(url).catch(() => null);
    console.log("Playwright result:", scraped);
    if (scraped) {
      if (scraped.title && !title) title = scraped.title;
      if (scraped.image && !image) image = scraped.image;
      if (scraped.price) {
        const n = parseNumericPrice(scraped.price);
        if (n != null) price = n;
      }
    }
  }

  // fallback title
  if (!title) {
    try {
      title = url ? new URL(url).hostname.replace(/^www\./, "") + (doc.id ? ` ${doc.id}` : "") : doc.id || "Untitled";
    } catch {
      title = doc.id || "Untitled";
    }
  }

  // prepare updates (if --save)
  const updates = {};
  const push = {};
  if (title && title !== doc.title) updates.title = title;
  if (image && image !== doc.image) updates.image = image;
  if (price != null && Number(price) !== (doc.price == null ? null : Number(doc.price))) {
    updates.price = price;
    push.priceHistory = { t: new Date().toISOString(), p: Number(price) };
  }

  console.log("\nEnriched values:");
  console.log({ title, image, price });
  if (save) {
    if (Object.keys(updates).length === 0 && !push.priceHistory) {
      console.log("\nNothing to save — DB already up to date.");
    } else {
      const op = {};
      if (Object.keys(updates).length) op.$set = updates;
      if (push.priceHistory) op.$push = { priceHistory: push.priceHistory };
      console.log("\nSaving updates to DB:", op);
      await db.collection("trackedProducts").updateOne({ _id: doc._id }, op).catch((err) => {
        console.error("DB update failed:", err.message || err);
      });
      console.log("Saved.");
    }
  } else {
    console.log("\nRun with --save to persist updates to DB (title/image/price/priceHistory).");
  }

  process.exit(0);
}

/* run */
main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
