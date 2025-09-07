// src/app/api/add-product/route.js
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

// dev fallback store (non-persistent)
const inMemoryProducts = new Map();

async function createOrGetProduct(db, url) {
  // prefer DB if available
  if (db) {
    const existing = await db.collection("products").findOne({ url });
    if (existing) {
      return { id: existing._id.toString(), created: false, product: existing };
    }
    const doc = { url, title: (() => { try { const u = new URL(url); return u.hostname + (u.pathname !== "/" ? ` ${u.pathname.split("/").pop() || ""}` : ""); } catch { return url; } })(), price: null, createdAt: new Date() };
    const r = await db.collection("products").insertOne(doc);
    return { id: r.insertedId?.toString() ?? null, created: true, product: doc };
  }

  // fallback: in-memory store (dev only)
  for (const [id, p] of inMemoryProducts.entries()) {
    if (p.url === url) return { id, created: false, product: p };
  }
  const id = `dev_${Date.now().toString(36)}_${Math.floor(Math.random()*9000+1000)}`;
  const product = { id, url, title: url, price: null, createdAt: new Date() };
  inMemoryProducts.set(id, product);
  return { id, created: true, product };
}

export async function POST(req) {
  try {
    // parse JSON safely
    let body = {};
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error("add-product: invalid json body:", parseErr);
      return NextResponse.json({ ok: false, error: "invalid_json", detail: String(parseErr?.message || parseErr) }, { status: 400 });
    }

    const url = body?.url;
    if (!url || typeof url !== "string") {
      return NextResponse.json({ ok: false, error: "url_required" }, { status: 400 });
    }

    // try DB; if not available, fall back
    let db = null;
    try {
      db = await getDb();
    } catch (dbErr) {
      console.error("add-product: DB connect failed, using in-memory fallback. DB error:", dbErr?.message || dbErr);
      db = null;
    }

    const result = await createOrGetProduct(db, url);
    const status = result.created ? 201 : 200;
    return NextResponse.json({ ok: true, created: result.created, id: result.id, product: result.product }, { status });

  } catch (err) {
    console.error("add-product unexpected error:", err);
    // include detail so client sees what happened (ONLY in dev)
    return NextResponse.json({ ok: false, error: "internal", detail: String(err?.message || err) }, { status: 500 });
  }
}
