// src/app/api/tracked-products/route.js
export const dynamic = "force-dynamic"; // ⬅️ Force runtime (fixes dynamic server usage errors)

import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

const FLIPKART_ID = process.env.FLIPKART_AFFILIATE_ID || "";
const FLIPKART_TOKEN = process.env.FLIPKART_AFFILIATE_TOKEN || "";
const AMAZON_TAG = process.env.AMAZON_ASSOCIATE_TAG || "";

/* ---------------- Affiliate URL Helpers ---------------- */
function appendQueryParam(url, key, value) {
  try {
    const u = new URL(url);
    if (!u.searchParams.get(key)) u.searchParams.set(key, value);
    return u.toString();
  } catch {
    return url;
  }
}

const DOMAIN_HANDLERS = {
  "flipkart.com": (url) =>
    FLIPKART_ID ? appendQueryParam(url, "affid", FLIPKART_ID) : url,
  "amazon.in": (url) =>
    AMAZON_TAG ? appendQueryParam(url, "tag", AMAZON_TAG) : url,
  "amazon.com": (url) =>
    AMAZON_TAG ? appendQueryParam(url, "tag", AMAZON_TAG) : url,
};

function hostnameMatches(host, domain) {
  return (
    host === domain ||
    host.endsWith("." + domain) ||
    host.endsWith(domain)
  );
}

function deriveAffiliate(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    for (const domain of Object.keys(DOMAIN_HANDLERS)) {
      if (hostnameMatches(host, domain)) {
        return DOMAIN_HANDLERS[domain](url);
      }
    }
    return url;
  } catch {
    return url;
  }
}

/* ---------------- Price Helpers ---------------- */
function parseNumericPrice(text) {
  if (!text) return null;
  try {
    const num = Number(String(text).replace(/[^0-9.]/g, ""));
    return Number.isFinite(num) ? Math.round(num) : null;
  } catch {
    return null;
  }
}

function latestPriceFromHistory(history) {
  if (!Array.isArray(history) || history.length === 0) return null;
  const last = history[history.length - 1];
  return typeof last === "object" && last.p ? Number(last.p) : null;
}

/* ---------------- Flipkart Affiliate API ---------------- */
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

      const base =
        json.productBaseInfoV1 ||
        json.product_base_info_v1 ||
        json.product ||
        json;

      if (!base) continue;

      const title =
        base.title || base.name || base.product_title || null;

      let image = null;
      if (base.imageUrls && typeof base.imageUrls === "object") {
        if (base.imageUrls["200x200"]) image = base.imageUrls["200x200"];
        else {
          const vals = Object.values(base.imageUrls);
          if (vals.length)
            image = Array.isArray(vals[0]) ? vals[0][0] : vals[0];
        }
      }
      if (!image && base.imageUrl) image = base.imageUrl;
      if (!image && base.image_url) image = base.image_url;

      let price = null;
      const selling =
        base.flipkartSellingPrice ||
        base.flipkart_selling_price ||
        base.flipkartSellingPriceV1;
      const mrp =
        base.maximumRetailPrice ||
        base.mrp ||
        base.maximum_retail_price;

      if (selling && (selling.amount || selling.value)) {
        price = parseNumericPrice(selling.amount ?? selling.value);
      } else if (mrp && (mrp.amount || mrp.value)) {
        price = parseNumericPrice(mrp.amount ?? mrp.value);
      } else if (base.price) {
        price = parseNumericPrice(base.price);
      }

      return {
        title: title ? String(title).trim() : null,
        image: image ? String(image) : null,
        price: price ?? null,
      };
    } catch {
      continue;
    }
  }
  return null;
}

/* ---------------- Flipkart Item-ID Extractor ---------------- */
function extractFlipkartItemId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const path = u.pathname || "";
    const m =
      path.match(/\/(itm[a-zA-Z0-9]+)/i) ||
      path.match(/\/([a-zA-Z0-9]{10,})/);
    if (m && m[1]) return m[1];
    const parts = path.split("-");
    for (let i = parts.length - 1; i >= 0; i--) {
      if (/^itm[a-zA-Z0-9]+$/i.test(parts[i])) return parts[i];
    }
    return null;
  } catch {
    return null;
  }
}

/* ---------------- Playwright Scraper ---------------- */
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
        const el =
          document.querySelector(`meta[property="${prop}"]`) ||
          document.querySelector(`meta[name="${prop}"]`);
        return el ? el.getAttribute("content") : null;
      };

      const title =
        get("og:title") || get("twitter:title") || document.title || null;
      const image =
        get("og:image") ||
        get("twitter:image") ||
        document.querySelector("img[src*='rukmini']")?.getAttribute("src") ||
        document.querySelector("img")?.getAttribute("src") ||
        null;

      const selCandidates = [
        "._30jeq3._16Jk6d", // Flipkart
        "._30jeq3",
        ".price",
        "[data-price]",
      ];
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

/* ---------------- GET Handler ---------------- */
export async function GET(req) {
  try {
    const db = await getDb();
    const qp = req.nextUrl.searchParams;

    const limit = Math.max(1, Math.min(200, Number(qp.get("limit") ?? 25)));
    const page = Math.max(1, Number(qp.get("page") ?? 1));
    const sort = qp.get("sort") ?? "popular";

    const skip = (page - 1) * limit;
    const col = db.collection("trackedProducts");

    const cursor =
      sort === "newest"
        ? col.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit)
        : col.find({}).sort({ watchCount: -1, updatedAt: -1 }).skip(skip).limit(limit);

    const docs = await cursor.toArray();

    const enriched = await Promise.all(
      docs.map(async (p) => {
        const url = p.url ?? null;
        const affiliate = p.affiliateUrl || deriveAffiliate(url) || null;

        let title = p.title?.trim() || null;
        let image = p.image ?? null;
        let price =
          typeof p.price === "number"
            ? p.price
            : parseNumericPrice(p.price);

        // Flipkart API first
        if (url?.includes("flipkart.com")) {
          const itemId = extractFlipkartItemId(url);
          if (itemId) {
            const apiDetails = await tryFlipkartApi(itemId);
            if (apiDetails) {
              if (apiDetails.title && !title) title = apiDetails.title;
              if (apiDetails.image && !image) image = apiDetails.image;
              if (apiDetails.price != null && !price)
                price = Number(apiDetails.price);
            }
          }
        }

        // Playwright fallback
        if (url && (!title || !image || price == null)) {
          const scraped = await playwrightExtract(url);
          if (scraped) {
            if (scraped.title && !title) title = scraped.title;
            if (scraped.image && !image) image = scraped.image;
            const scrapedPrice = parseNumericPrice(scraped.price);
            if (scrapedPrice != null && price == null) price = scrapedPrice;
          }
        }

        if (!title) {
          try {
            title = new URL(url).hostname.replace(/^www\./, "");
          } catch {
            title = "Untitled";
          }
        }

        const finalHistory = Array.isArray(p.priceHistory)
          ? p.priceHistory.slice()
          : [];
        const last = latestPriceFromHistory(finalHistory);
        if (price != null && Number(price) !== last) {
          finalHistory.push({ t: new Date().toISOString(), p: Number(price) });
        }

        return {
          id: String(p._id || p.id || ""),
          title,
          price: price ?? null,
          url,
          image,
          priceHistory: finalHistory,
          affiliateUrl: affiliate,
          source: p.source ?? null,
          watchCount: p.watchCount ?? 0,
          createdAt: p.createdAt ?? null,
          updatedAt: p.updatedAt ?? null,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      data: enriched,
      meta: { page, limit, count: enriched.length },
    });
  } catch (err) {
    console.error("tracked-products error", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
