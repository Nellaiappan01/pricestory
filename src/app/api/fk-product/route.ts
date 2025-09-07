// src/app/api/fk-product/route.ts
import { NextResponse } from "next/server";
import { extractFlipkartProductId } from "@/utils/extractFlipkartProductId";

const AFFILIATE_ID = process.env.FLIPKART_AFFILIATE_ID;
const AFFILIATE_TOKEN = process.env.FLIPKART_AFFILIATE_TOKEN;

// small helper: fetch with timeout
async function fetchWithTimeout(input: RequestInfo, init: RequestInit = {}, timeout = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// optional light HTML price extractor (fallback)
function extractPriceFromHtml(html: string) {
  // try rupee sign first
  const r1 = html.match(/₹\s*([\d,]{2,})/);
  if (r1) return Number(r1[1].replace(/,/g, ""));
  // generic numbers fallback
  const r2 = html.match(/([\d,]{2,})/);
  if (r2) return Number(r2[1].replace(/,/g, ""));
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = body?.url;
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

    if (!AFFILIATE_ID || !AFFILIATE_TOKEN) {
      return NextResponse.json({ error: "flipkart credentials missing" }, { status: 500 });
    }

    const productId = extractFlipkartProductId(url);
    if (!productId) {
      return NextResponse.json({ error: "could not extract product id from URL", url }, { status: 400 });
    }

    const apiUrl = `https://affiliate-api.flipkart.net/affiliate/1.0/product.json?id=${encodeURIComponent(productId)}`;

    const res = await fetchWithTimeout(apiUrl, {
      headers: {
        "Fk-Affiliate-Id": AFFILIATE_ID,
        "Fk-Affiliate-Token": AFFILIATE_TOKEN,
        "Accept": "application/json",
      },
    }, 15000);

    if (!res.ok) {
      const snippet = await res.text().catch(() => "");
      return NextResponse.json({ error: "flipkart api error", status: res.status, snippet }, { status: res.status });
    }

    const data = await res.json();
    const base = data?.productBaseInfoV1 || {};

    // Prefer special price (discount) -> selling price -> MRP
    const price =
      base.flipkartSpecialPrice?.amount ??
      base.flipkartSellingPrice?.amount ??
      base.maximumRetailPrice?.amount ??
      null;

    // If price is MRP or null and we were asked to do fallback, optionally try a light scrape
    let finalPrice = price;
    if ((finalPrice === null || finalPrice === base.maximumRetailPrice?.amount) && body?.allowScrapeFallback) {
      try {
        const pageRes = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0" } }, 10000);
        if (pageRes.ok) {
          const html = await pageRes.text();
          const scraped = extractPriceFromHtml(html);
          if (scraped && scraped > 0) finalPrice = scraped;
        }
      } catch (e) {
        // ignore fallback scrape errors, still return API price
        console.warn("fk-product: fallback scrape failed", e);
      }
    }

    const image =
      (base.imageUrls && (base.imageUrls["200x200"] || Object.values(base.imageUrls)[0])) || null;

    const affiliateUrl = base.productUrl || url;

    return NextResponse.json({
      title: base.title || null,
      price: finalPrice,
      image,
      affiliateUrl,
      source: "flipkart",
      rawBase: undefined, // avoid returning big raw objects; enable only for debugging if needed
    });
  } catch (err: any) {
    console.error("fk-product error:", err);
    return NextResponse.json(
      { error: "server error", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
