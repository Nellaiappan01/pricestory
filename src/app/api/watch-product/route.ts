// src/app/api/watch-product/route.js
import { getDb } from "../../../lib/mongodb";

export async function POST(req) {
  try {
    const { url, productId } = await req.json();
    const db = await getDb();
    const products = db.collection("products");

    if (productId) {
      await products.updateOne({ _id: typeof productId === "string" ? { $eq: productId } : productId }, { $set: { watching: true } });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    if (url) {
      const p = await products.findOne({ url });
      if (!p) return new Response(JSON.stringify({ error: "product not found" }), { status: 404 });
      await products.updateOne({ _id: p._id }, { $set: { watching: true } });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "productId or url required" }), { status: 400 });
  } catch (err) {
    console.error("watch-product error:", err && (err.stack || err.message || err));
    return new Response(JSON.stringify({ error: "internal", detail: String(err && err.message) }), { status: 500 });
  }
}
