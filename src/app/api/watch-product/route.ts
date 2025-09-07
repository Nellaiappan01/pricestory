// src/app/api/watch-product/route.js
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

const watchers = new Map();

export async function POST(req) {
  try {
    let body = {};
    try { body = await req.json(); } catch (parseErr) {
      console.error("watch-product: invalid json:", parseErr);
      return NextResponse.json({ ok:false, error:"invalid_json", detail:String(parseErr?.message||parseErr) }, { status:400 });
    }

    let productId = body?.productId;
    const url = body?.url;

    // If no productId but url provided, try creating/getting the product
    if (!productId && url) {
      let db = null;
      try { db = await getDb(); } catch (e) { db = null; }
      // minimal creation logic similar to add-product fallback
      if (db) {
        const existing = await db.collection("products").findOne({ url });
        if (existing) productId = existing._id.toString();
        else {
          const doc = { url, title: url, createdAt: new Date() };
          const r = await db.collection("products").insertOne(doc);
          productId = r.insertedId?.toString() ?? null;
        }
      } else {
        // fallback id creation
        productId = `dev_${Date.now().toString(36)}_${Math.floor(Math.random()*9000+1000)}`;
      }
    }

    if (!productId) {
      return NextResponse.json({ ok:false, error:"productId required" }, { status:400 });
    }

    // register watcher in-memory (dev) or ideally in DB
    if (!watchers.has(productId)) watchers.set(productId, new Set());
    watchers.get(productId).add("anon");

    return NextResponse.json({ ok:true, watching:true, productId }, { status:200 });

  } catch (err) {
    console.error("watch-product unexpected error:", err);
    return NextResponse.json({ ok:false, error:"internal", detail:String(err?.message||err) }, { status:500 });
  }
}
