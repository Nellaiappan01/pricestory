// src/app/sitemap.xml/route.ts
import { getDb } from "../../lib/mongodb";

/**
 * Produce a sitemap index that points to paginated sitemap-products-N.xml files.
 * - Uses NEXT_PUBLIC_SITE_URL (falls back to https://pricestory.vercel.app)
 * - Reads count from trackedProducts collection (production) or products (fallback)
 * - Splits into pages using SITEMAP_MAX (50k URLs per sitemap by spec)
 *
 * This route intentionally returns a sitemap *index* (not the full product urlset).
 * Individual product pages are served by /sitemap-products-[page]/route.ts
 */

export async function GET() {
  const rawBase = process.env.NEXT_PUBLIC_SITE_URL || "https://pricestory.vercel.app";
  // normalize: remove trailing slash
  const BASE = rawBase.replace(/\/$/, "");

  const staticSitemaps = [
    // static pages may be listed directly in a sitemap-products-*.xml if you prefer.
    // Here we keep those as separate static urls inside the first sitemap-products-1 (optional).
    // For index we only point to product sitemaps so search engines can discover them.
    `${BASE}/sitemap-products-1.xml`,
  ];

  try {
    const db = await getDb();

    // prefer the collection you actually use
    const collectionNames = await db.listCollections().toArray();
    const usesTracked = collectionNames.some((c: any) => c.name === "trackedProducts");
    const collectionName = usesTracked ? "trackedProducts" : "products";

    // count total product pages
    const totalCount = await db.collection(collectionName).countDocuments();

    // per sitemap limit (sitemaps.org max is 50,000)
    const SITEMAP_MAX = 50000;
    const totalPages = Math.max(1, Math.ceil(totalCount / SITEMAP_MAX));

    // Build sitemap index XML
    const now = new Date().toISOString();
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // include any static sitemaps first (keeps 1-based product pages afterwards)
    for (const loc of staticSitemaps) {
      xml += `  <sitemap>\n    <loc>${loc}</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>\n`;
    }

    // add product sitemap pages
    for (let i = 1; i <= totalPages; i++) {
      xml += `  <sitemap>\n    <loc>${BASE}/sitemap-products-${i}.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>\n`;
    }

    xml += `</sitemapindex>`;

    return new Response(xml, {
      status: 200,
      headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=60" },
    });
  } catch (err) {
    const errInfo = err instanceof Error ? (err.stack || err.message) : String(err ?? "unknown error");
    console.error("Sitemap index generation error:", errInfo);

    // fallback: still return at least a minimal index pointing to page 1
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE}/sitemap-products-1.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
</sitemapindex>`;

    return new Response(fallbackXml, {
      status: 200,
      headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=30" },
    });
  }
}
