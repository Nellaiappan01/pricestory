// src/app/api/signup/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb"; // your existing mongodb helper
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    // body may contain email/name if you want
    const email = (body?.email || `user+free@local.dev`).toString().toLowerCase();

    const client = await clientPromise;
    const db = client.db();

    const now = new Date();

    // Upsert a simple user document for 'free' signup (adjust schema for your app)
    const result = await db.collection("users").updateOne(
      { email },
      {
        $setOnInsert: {
          id: `usr_${Date.now()}`,
          email,
          plan: "free",
          createdAt: now,
        },
        $set: {
          lastSeen: now,
        },
      },
      { upsert: true }
    );

    // return something the client can use (safe)
    return NextResponse.json({ ok: true, message: "Free account created", userId: result.upsertedId ?? null });
  } catch (err) {
    console.error("signup/free error", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
