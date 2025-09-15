// app/api/sitemap/route.ts  (or your existing sitemap route file)
import { getDb } from "../../lib/mongodb";
import { NextRequest } from "next/server";

const SITEMAP_MAX_URLS = parseInt(process.env.SITEMAP_MAX_URLS || "45000", 10); // safe below 50k
const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://pricestory.vercel.app").replace(/\/$/, "");

function formatDateYYYYMMDD(dateInput?: string | Date) {
  const d = dateInput ? new Date(dateInput) : new Date();
  // to YYYY-MM-DD
  return d.toISOString().split("T")[0];
}

function buildUrlEntry(loc: string, lastmod: string, changefreq = "daily", priority = "0.6") {
  return `<url>
  <loc>${loc}</loc>
  <lastmod>${lastmod}</lastmod>
  <changefreq>${changefreq}</changefreq>
  <priority>${priority}</priority>
</url>`;
}

export async function GET(req: NextRequest) {
  try {
    const urlObj = new URL(req.url);
    const pageParam = urlObj.searchParams.get("page"); // optional page index (1-based)
    const pageIndex = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : null;

    const db = await getDb();
    console.log("[SITEMAP] Connected to MongoDB");

    // Count and optionally fetch product IDs + lastChecked
    const totalProducts = await db.collection("products").countDocuments();
    console.log(`[SITEMAP] Total products: ${totalProducts}`);

    // static urls (use YYYY-MM-DD)
    const today = formatDateYYYYMMDD();
    const staticUrls = [
      { url: `${BASE_URL}/`, lastMod: today, changefreq: "daily", priority: "1.0" },
      { url: `${BASE_URL}/about`, lastMod: today, changefreq: "weekly", priority: "0.5" },
      { url: `${BASE_URL}/contact`, lastMod: today, changefreq: "monthly", priority: "0.4" },
    ];

    // If product count small enough → return single sitemap with all
    if (totalProducts <= SITEMAP_MAX_URLS) {
      // fetch all products minimal projection
      const products = await db
        .collection("products")
        .find({}, { projection: { _id: 1, lastChecked: 1 } })
        .toArray();

      const productEntries = products.map((p: any) =>
        buildUrlEntry(
          `${BASE_URL}/products/${p._id}`,
          formatDateYYYYMMDD(p.lastChecked),
          "daily",
          "0.6"
        )
      );

      const allEntries = [
        ...staticUrls.map((s) => buildUrlEntry(s.url, s.lastMod, s.changefreq, s.priority)),
        ...productEntries,
      ];

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allEntries.join("\n")}
</urlset>`;

      return new Response(xml, { status: 200, headers: { "Content-Type": "application/xml" } });
    }

    // === Large site handling: sitemap index + paged sitemaps ===
    // Determine number of pages
    const urlsPerPage = SITEMAP_MAX_URLS;
    const pageCount = Math.ceil(totalProducts / urlsPerPage);
    console.log(`[SITEMAP] Will paginate into ${pageCount} sitemap pages (limit ${urlsPerPage}).`);

    // If pageIndex provided -> return that sitemap page
    if (pageIndex) {
      if (pageIndex > pageCount) {
        return new Response("<!-- page out of range -->", { status: 404, headers: { "Content-Type": "text/plain" } });
      }

      const skip = (pageIndex - 1) * urlsPerPage;
      const products = await db
        .collection("products")
        .find({}, { projection: { _id: 1, lastChecked: 1 } })
        .skip(skip)
        .limit(urlsPerPage)
        .toArray();

      const productEntries = products.map((p: any) =>
        buildUrlEntry(
          `${BASE_URL}/products/${p._id}`,
          formatDateYYYYMMDD(p.lastChecked),
          "daily",
          "0.6"
        )
      );

      // Only include static URLs on page 1 (optional)
      const includeStatic = pageIndex === 1;
      const allEntries = [
        ...(includeStatic ? staticUrls.map((s) => buildUrlEntry(s.url, s.lastMod, s.changefreq, s.priority)) : []),
        ...productEntries,
      ];

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allEntries.join("\n")}
</urlset>`;

      return new Response(xml, { status: 200, headers: { "Content-Type": "application/xml" } });
    }

    // No page param and large site -> return sitemap-index pointing to each page endpoint
    const sitemapIndexEntries = [];
    for (let i = 1; i <= pageCount; i++) {
      // using the same endpoint with query param
      const loc = `${BASE_URL}/api/sitemap.xml?page=${i}`;
      sitemapIndexEntries.push(`<sitemap>
  <loc>${loc}</loc>
  <lastmod>${today}</lastmod>
</sitemap>`);
    }

    const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapIndexEntries.join("\n")}
</sitemapindex>`;

    return new Response(indexXml, { status: 200, headers: { "Content-Type": "application/xml" } });
  } catch (err) {
    console.error("[SITEMAP] Generation error:", err);
    // fallback: small sitemap with static pages only
    const today = formatDateYYYYMMDD();
    const xmlFallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[
  { url: `${BASE_URL}/`, lastMod: today },
  { url: `${BASE_URL}/about`, lastMod: today },
  { url: `${BASE_URL}/contact`, lastMod: today },
]
  .map((u) => `<url>
  <loc>${u.url}</loc>
  <lastmod>${u.lastMod}</lastmod>
</url>`)
  .join("\n")}
</urlset>`;
    return new Response(xmlFallback, { status: 200, headers: { "Content-Type": "application/xml" } });
  }
    }
