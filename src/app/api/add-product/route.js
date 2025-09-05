// src/app/api/add-product/route.js
import { getDb } from "../../../lib/mongodb";

export async function POST(req) {
  try {
    const body = await req.json();
    const { url, title } = body;
    if (!url) return new Response(JSON.stringify({ error: "url required" }), { status: 400 });

    const db = await getDb();
    const products = db.collection("products");

    // avoid exact-URL duplicates
    const existing = await products.findOne({ url });
    if (existing) {
      return new Response(JSON.stringify({ ok: true, id: existing._id.toString() }), { status: 200 });
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
    return new Response(JSON.stringify({ ok: true, id: r.insertedId.toString() }), { status: 201 });
  } catch (err) {
    console.error("add-product error:", err && (err.stack || err.message || err));
    return new Response(JSON.stringify({ error: "internal", detail: String(err && err.message) }), { status: 500 });
  }
}
