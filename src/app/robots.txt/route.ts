// src/app/robots.txt/route.ts
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const content = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;
  return new Response(content, { status: 200, headers: { "Content-Type": "text/plain" } });
}
