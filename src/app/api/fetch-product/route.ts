// src/app/api/fetch-product/route.js
import { NextResponse } from "next/server";

const SCRAPINGBEE_KEY = process.env.SCRAPINGBEE_KEY;

export async function POST(req) {
  try {
    const body = await req.json();
    const url = body?.url;
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

    // If no key -> return mock product data (safe for local dev)
    if (!SCRAPINGBEE_KEY) {
      console.warn("SCRAPINGBEE_KEY missing — returning mock product data");
      return NextResponse.json({
        title: "Mock Product — Flipkart",
        image: "https://via.placeholder.com/150",
        price: "₹3,499",
        source: "mock.local",
        url,
      });
    }

    // If key exists -> call the scraping service
    const apiUrl = `https://app.scrapingbee.com/api/v1?api_key=${encodeURIComponent(
      SCRAPINGBEE_KEY
    )}&url=${encodeURIComponent(url)}&render_js=true&country_code=in`;

    const res = await fetch(apiUrl, { method: "GET", headers: { Accept: "text/html" } });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return NextResponse.json({ error: "scraper returned non-200", status: res.status, snippet: txt.slice(0, 800) }, { status: 502 });
    }

    const html = await res.text();

    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i)?.[1];
    const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)?.[1];
    const titleTag = ogTitle || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || null;

    let price = null;
    const priceMatch = html.match(/(?:₹|Rs\.?|INR)\s?[\d,]+(?:\.\d{1,2})?/i);
    if (priceMatch) price = priceMatch[0].trim();

    const source = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; } })();

    return NextResponse.json({ title: titleTag, image: ogImage ?? null, price, source, url });
  } catch (err) {
    console.error("fetch-product error (dev):", err && (err.stack || err.message || err));
    // Return error detail so PowerShell/Browser shows it
    return NextResponse.json({ error: "server error", detail: String(err && (err.stack || err.message || err)) }, { status: 500 });
  }
}
