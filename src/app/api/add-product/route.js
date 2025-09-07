// src/app/api/add-product/route.js
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(req) {
  console.log("📩 [add-product] request received");
  try {
    const body = await req.json();
    const { url, title } = body;

    console.log("➡️ body:", body);

    if (!url) {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }

    const db = await getDb();
    console.log("✅ got DB:", db.databaseName);

    const products = db.collection("products");

    // check duplicates
    const existing = await products.findOne({ url });
    if (existing) {
      console.log("♻️ existing product found:", existing._id.toString());
      return NextResponse.json(
        { ok: true, id: existing._id.toString(), fromCache: true },
        { status: 200 }
      );
    }

    const doc = {
      url,
      title: title || null,
      createdAt: new Date(),
      lastChecked: null,
      currentPrice: null,
      priceHistory: [],
    };

    const r = await products.insertOne(doc);
    console.log("✅ inserted new product:", r.insertedId.toString());

    return NextResponse.json(
      { ok: true, id: r.insertedId.toString() },
      { status: 201 }
    );
  } catch (err) {
    console.error("🔥 add-product error:", err);
    return NextResponse.json(
      { error: "internal", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
