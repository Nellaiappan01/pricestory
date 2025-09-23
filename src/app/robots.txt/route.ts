// src/app/robots.txt/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const SITE = process.env.SITE_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";

  const txt = `User-agent: *
Disallow:

Sitemap: ${SITE}/sitemap.xml
`;

  return new NextResponse(txt, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
