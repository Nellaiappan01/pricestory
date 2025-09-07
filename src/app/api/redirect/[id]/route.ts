// src/app/api/redirect/[id]/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id) return NextResponse.redirect(new URL("/", req.url));

    const db = await getDb();
    const product = await db.collection("products").findOne({ _id: new ObjectId(id) });

    if (!product) return NextResponse.redirect(new URL("/", req.url));

    const dest = product.affiliateUrl || product.url;
    // log click — optional analytics
    try {
      await db.collection("clicks").insertOne({ productId: product._id, ts: new Date(), ref: req.headers.get("referer") || null });
    } catch (e) {
      console.warn("redirect: click log failed", e);
    }

    return NextResponse.redirect(dest);
  } catch (e) {
    console.error("redirect error", e);
    return NextResponse.redirect(new URL("/", req.url));
  }
}
