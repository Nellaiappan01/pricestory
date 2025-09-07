// src/app/api/watch-product/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const productId = body?.productId;

    if (!productId) {
      return NextResponse.json(
        { ok: false, error: "productId required" },
        { status: 400 }
      );
    }

    let db;
    try {
      db = await getDb();
    } catch (dbErr) {
      console.error("watch-product DB connect error:", dbErr);
      return NextResponse.json(
        { ok: false, error: "db_unavailable" },
        { status: 200 }
      );
    }

    // Upsert watch record
    const result = await db.collection("watchlist").updateOne(
      { productId },
      { $setOnInsert: { productId, watchedAt: new Date() } },
      { upsert: true }
    );

    const created = !!result.upsertedId;

    return NextResponse.json({
      ok: true,
      watching: true,
      created, // true if new, false if already existed
    });
  } catch (err: any) {
    console.error("watch-product error:", err);
    return NextResponse.json(
      { ok: false, error: "server_error", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
