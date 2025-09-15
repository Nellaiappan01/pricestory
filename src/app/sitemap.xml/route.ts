// src/app/sitemap.xml/route.ts
import { getDb } from "../../lib/mongodb";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pricestory.vercel.app/";

  const staticUrls = [
    { url: `${baseUrl}/`, lastMod: new Date().toISOString() },
    { url: `${baseUrl}/about`, lastMod: new Date().toISOString() },
    { url: `${baseUrl}/contact`, lastMod: new Date().toISOString() },
  ];

  try {
    const db = await getDb();
    const products = await db.collection("products").find({}, { projection: { _id: 1, lastChecked: 1 } }).toArray();

    const productUrls = (products || []).map((p: any) => ({
      url: `${baseUrl}/products/${p._id}`,
      lastMod: p.lastChecked ? new Date(p.lastChecked).toISOString() : new Date().toISOString(),
    }));

    const all = [...staticUrls, ...productUrls];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all
  .map(
    (u) => `<url>
  <loc>${u.url}</loc>
  <lastmod>${u.lastMod}</lastmod>
</url>`
  )
  .join("\n")}
</urlset>`;

    return new Response(xml, { status: 200, headers: { "Content-Type": "application/xml" } });
  } catch (err) {
    // Narrow `err` safely (TypeScript: catch variable is `unknown` under strict settings)
    const errInfo = err instanceof Error ? (err.stack || err.message) : String(err ?? "unknown error");
    console.error("Sitemap generation error:", errInfo);

    const xmlFallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls
  .map(
    (u) => `<url>
  <loc>${u.url}</loc>
  <lastmod>${u.lastMod}</lastmod>
</url>`
  )
  .join("\n")}
</urlset>`;
    return new Response(xmlFallback, { status: 200, headers: { "Content-Type": "application/xml" } });
  }
}
