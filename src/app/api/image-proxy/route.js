// src/app/api/image-proxy/route.js
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const target = searchParams.get("url");
    if (!target) {
      return NextResponse.json({ ok: false, error: "Missing url" }, { status: 400 });
    }

    // optional: allowlist hosts (uncomment and adjust if you want)
    // const allowed = ["rukmini1.flixcart.com", "rukminim1.flixcart.com", "i.ebayimg.com"];
    // const hostname = new URL(target).hostname;
    // if (!allowed.some(a => hostname.endsWith(a))) {
    //   return NextResponse.json({ ok: false, error: "host not allowed" }, { status: 403 });
    // }

    const res = await fetch(target, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: "fetch_failed", status: res.status }, { status: 502 });
    }

    const arrayBuffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const headers = { "Content-Type": contentType, "Cache-Control": "public, max-age=86400" };

    // Node runtime (Buffer available) -> return Buffer
    if (typeof Buffer !== "undefined") {
      return new NextResponse(Buffer.from(arrayBuffer), { headers });
    }

    // Edge-ish runtime fallback -> return ArrayBuffer directly
    return new NextResponse(arrayBuffer, { headers });
  } catch (err) {
    console.error("image-proxy error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
