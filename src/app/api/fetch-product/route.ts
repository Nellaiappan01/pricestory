// src/app/api/fetch-product/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = body?.url;
    if (!url) {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }

    // For now, return mock product data (no scraping)
    return NextResponse.json({
      title: "Sample Product",
      image: "https://via.placeholder.com/150",
      price: "₹499",
      source: "demo.local",
      url,
    });
  } catch (err: any) {
    console.error("fetch-product error:", err?.stack || err?.message || err);
    return NextResponse.json(
      { error: "server error", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
