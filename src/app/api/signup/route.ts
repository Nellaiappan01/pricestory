// src/app/api/signup/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb"; // or your db helper

export const dynamic = "force-dynamic"; // optional, ensures runtime handling

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const emailRaw = body?.email;
    if (!emailRaw) {
      return NextResponse.json({ ok: false, error: "email required" }, { status: 400 });
    }

    const email = String(emailRaw).toLowerCase();
    const name = body?.name ?? null;
    const password = body?.password ?? null; // if you accept password here
    // other fields...

    // connect to DB
    const db = await getDb();
    const now = new Date();

    // Upsert example: create user or update lastSeen
    await db.collection("users").updateOne(
      { email },
      {
        $set: {
          email,
          name,
          lastSeen: now,
        },
        $setOnInsert: {
          createdAt: now,
          // store password hashed here if you handle auth creation
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, message: "signup received", userId: email });
  } catch (err) {
    console.error("signup POST error", err);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
