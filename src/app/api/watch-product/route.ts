// src/app/api/watch-product/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const productId = body?.productId;

    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ ok: false, error: "productId required" }, { status: 400 });
    }

    const db = await getDb();

    // Upsert pattern: use productId (string) as key to avoid ObjectId mismatch
    const now = new Date();
    const result = await db.collection("watchlist").updateOne(
      { productId },
      { $setOnInsert: { productId, watchedAt: now, createdAt: now } },
      { upsert: true }
    );

    // Determine whether it was inserted now or existed
    const created = !!(result.upsertedId);

    return NextResponse.json({ ok: true, watching: true, productId, created }, { status: 200 });
  } catch (err) {
    console.error("watch-product error:", err);

    // Narrow `err` safely (TypeScript: unknown in catch)
    const detail = err instanceof Error ? err.message : String(err ?? "unknown error");

    return NextResponse.json(
      { ok: false, error: "internal", detail },
      { status: 500 }
    );
  }
}
