import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Check if user already exists
    const existing = await db.collection("users").findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Insert user
    await db.collection("users").insertOne({
      email,
      password: hashed,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: any) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
