// src/app/api/tracked-products/route.js
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb"; // <-- adjust path if needed

const FLIPKART_ID = process.env.FLIPKART_AFFILIATE_ID || "";
const FLIPKART_TOKEN = process.env.FLIPKART_AFFILIATE_TOKEN || "";
const AMAZON_TAG = process.env.AMAZON_ASSOCIATE_TAG || "";

function appendQueryParam(url, key, value) {
  try {
    const u = new URL(url);
    if (!u.searchParams.get(key)) u.searchParams.set(key, value);
    return u.toString();
  } catch {
    return url + (url.includes("?") ? "&" : "?") + `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  }
}

const DOMAIN_HANDLERS = {
  "flipkart.com": (url) => (FLIPKART_ID ? appendQueryParam(url, "aff", FLIPKART_ID) : url),
  "amazon.in": (url) => (AMAZON_TAG ? appendQueryParam(url, "tag", AMAZON_TAG) : url),
  "amazon.com": (url) => (AMAZON_TAG ? appendQueryParam(url, "tag", AMAZON_TAG) : url),
};

function hostnameMatches(host, domain) {
  return host === domain || host.endsWith("." + domain) || host.endsWith(domain);
}
function deriveAffiliate(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    for (const domain of Object.keys(DOMAIN_HANDLERS)) {
      if (hostnameMatches(host, domain)) return DOMAIN_HANDLERS[domain](url);
    }
    return url;
  } catch {
    return url;
  }
}

/* Flipkart API attempt (returns {title,image} or null) */
async function tryFlipkartApi(itemId) {
  if (!itemId || !FLIPKART_TOKEN) return null;
  const apiUrls = [
    `https://affiliate-api.flipkart.net/affiliate/product/json?id=${encodeURIComponent(itemId)}`,
    `https://affiliate-api.flipkart.net/affiliate/product/json?itemId=${encodeURIComponent(itemId)}`
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
      const bases = [json.productBaseInfoV1, json.product_base_info_v1, json.product, json];
      for (const base of bases) {
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
        if (title || image) return { title: title ? String(title).trim() : null, image: image ? String(image) : null };
      }
    } catch (err) {
      continue;
    }
  }
  return null;
}

/* extract flipkart item id heuristics */
function extractFlipkartItemId(url) {
  if (!url) return null;
  try {
    if (url.startsWith("http")) {
      const u = new URL(url);
      const path = u.pathname;
      const m = path.match(/\/(itm[a-zA-Z0-9]+)/i) || path.match(/\/([a-zA-Z0-9]{12,})/);
      if (m && m[1]) return m[1];
      const parts = path.split("-");
      for (let i = parts.length - 1; i >= 0; i--) if (/^itm[a-zA-Z0-9]+$/i.test(parts[i])) return parts[i];
      return null;
    } else {
      const m = url.match(/^(itm[a-zA-Z0-9]+)$/i);
      return m ? m[1] : null;
    }
  } catch {
    return null;
  }
}

/* Playwright fallback: lazy import */
async function playwrightExtract(url) {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"], headless: true });
    const page = await browser.newPage({ timeout: 15000 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(600);
    const meta = await page.evaluate(() => {
      const get = (prop) => {
        const el = document.querySelector(`meta[property="${prop}"]`) || document.querySelector(`meta[name="${prop}"]`);
        return el ? el.getAttribute("content") : null;
      };
      return { title: get("og:title") || get("twitter:title") || document.title || null, image: get("og:image") || get("twitter:image") || null };
    });
    await browser.close();
    return meta;
  } catch (err) {
    console.error("playwrightExtract failed:", err?.message || err);
    return null;
  }
}

export async function GET() {
  try {
    const db = await getDb();
    const products = await db.collection("trackedProducts").find({}).limit(500).toArray();

    const enriched = await Promise.all(products.map(async (p) => {
      const url = p.url ?? p.link ?? null;
      const affiliateFromDb = p.affiliateUrl ?? null;
      const affiliate = affiliateFromDb || deriveAffiliate(url) || null;

      let title = p.title && String(p.title).trim() ? String(p.title).trim() : null;
      let image = p.image ?? null;

      // try Flipkart API if flipkart url and missing data
      if (url && url.includes("flipkart.com") && (!title || !image)) {
        const itemId = extractFlipkartItemId(url);
        if (itemId) {
          const apiDetails = await tryFlipkartApi(itemId);
          if (apiDetails) {
            if (apiDetails.title && !title) title = apiDetails.title;
            if (apiDetails.image && !image) image = apiDetails.image;
            // cache
            const updates = {};
            if (apiDetails.title && !p.title) updates.title = apiDetails.title;
            if (apiDetails.image && !p.image) updates.image = apiDetails.image;
            if (Object.keys(updates).length) db.collection("trackedProducts").updateOne({ _id: p._id }, { $set: updates }).catch(() => {});
          }
        }
      }

      // Playwright fallback (if still missing)
      if (url && (!title || !image)) {
        const scraped = await playwrightExtract(url).catch(() => null);
        if (scraped) {
          if (scraped.title && !title) title = scraped.title;
          if (scraped.image && !image) image = scraped.image;
          const updates = {};
          if (scraped.title && !p.title) updates.title = scraped.title;
          if (scraped.image && !p.image) updates.image = scraped.image;
          if (Object.keys(updates).length) db.collection("trackedProducts").updateOne({ _id: p._id }, { $set: updates }).catch(() => {});
        }
      }

      // final fallbacks
      if (!title) {
        try {
          title = url ? new URL(url).hostname.replace(/^www\./, "") + (p.id ? ` ${p.id}` : "") : p.id || "Untitled";
        } catch { title = p.id || "Untitled"; }
      }

      return {
        id: String(p._id || p.id || ""),
        title,
        price: p.price ?? null,
        url,
        image,
        priceHistory: p.priceHistory ?? [],
        affiliateUrl: affiliate,
        source: p.source ?? null,
      };
    }));

    return NextResponse.json({ ok: true, data: enriched });
  } catch (err) {
    console.error("tracked-products error", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
