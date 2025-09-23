// src/app/sitemap-products-[page]/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getCached, setCached } from "@/lib/sitemapCache";

/**
 * Generate sitemap XML for a given page (1-indexed).
 * Exports generateSitemapPage so server code (e.g. add-product) can prime the cache.
 */
export async function generateSitemapPage(page = 1): Promise<string> {
  const cacheKey = `sitemap-products-${page}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // page size must match your code which serves tracked products
  const PAGE_SIZE = 500; // tune to your sitemap-sharding strategy (<= 50k per sitemap)
  const skip = (page - 1) * PAGE_SIZE;

  const db = await getDb();
  const col = db.collection("trackedProducts");

  // newest-first makes sense for fresh entries; adjust sort as needed
  const docs = await col
    .find({})
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(PAGE_SIZE)
    .project({ url: 1, updatedAt: 1, createdAt: 1 })
    .toArray();

  // build urlset XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const d of docs) {
    const loc = String(d.url);
    // lastmod prefer updatedAt then createdAt
    const lastmod = d.updatedAt ? new Date(d.updatedAt).toISOString() : d.createdAt ? new Date(d.createdAt).toISOString() : null;
    xml += "  <url>\n";
    xml += `    <loc>${escapeXml(loc)}</loc>\n`;
    if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += "  </url>\n";
  }

  xml += "</urlset>";

  // cache result for short TTL (so newly added products can cause invalidation)
  setCached(cacheKey, xml, 1000 * 30); // 30s TTL — tune as needed

  return xml;
}

// small XML escape helper
function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] || c));
}

/* route handler for /sitemap-products-<page>.xml */
export async function GET(req: NextRequest) {
  try {
    const pathname = req.nextUrl?.pathname || "";
    // extract page number from path, fallback to 1
    const m = pathname.match(/sitemap-products-(\d+)\.xml$/i);
    const page = m ? Math.max(1, Number(m[1])) : 1;

    const xml = await generateSitemapPage(page);

    return new NextResponse(xml, {
      headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=30" },
    });
  } catch (err) {
    console.error("sitemap-products GET error", err);
    return new NextResponse("<?xml version='1.0'?><urlset></urlset>", {
      headers: { "Content-Type": "application/xml; charset=utf-8" },
      status: 500,
    });
  }
}
