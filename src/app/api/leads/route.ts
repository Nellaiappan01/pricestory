// src/app/api/leads/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const emailRaw = body?.email;
    if (!emailRaw) return NextResponse.json({ ok: false, error: "email required" }, { status: 400 });

    const email = String(emailRaw).toLowerCase();
    const name = body?.name ?? null;
    const source = body?.source ?? null;
    const utm = body?.utm ?? null;

    const client = await clientPromise;
    const db = client.db();
    const now = new Date();

    await db.collection("leads").updateOne(
      { email },
      {
        $set: {
          email,
          name,
          source,
          utm,
          lastSeen: now,
          unsubscribed: false,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("leads POST error", err);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
