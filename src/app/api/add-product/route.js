// src/app/api/add-product/route.js
export const dynamic = "force-dynamic"; // runtime-only route

import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { clearAll } from "@/lib/sitemapCache";
import { generateSitemapPage } from "@/app/sitemap-products-[page]/route";

// dev fallback store (non-persistent)
const inMemoryProducts = new Map();

/* ---------- Flipkart shortlink expander ---------- */
async function expandFlipkartShortUrl(url) {
  if (!url || !url.includes("dl.flipkart.com")) return url;

  try {
    // perform a HEAD/GET with manual redirect handling to discover real location
    const res = await fetch(url, { method: "GET", redirect: "manual", headers: { "User-Agent": "Mozilla/5.0" } });

    // check common redirect status codes
    if (res.status === 301 || res.status === 302 || res.status === 303 || res.status === 307 || res.status === 308) {
      const loc = res.headers.get("location");
      if (loc) {
        // if location is relative, resolve against original url
        try {
          return new URL(loc, url).toString();
        } catch {
          return loc;
        }
      }
    }

    // fallback: if server responded with a final page that has a canonical or og:url meta we could parse,
    // but for now just return original url if no redirect header found.
  } catch (e) {
    console.error("expandFlipkartShortUrl failed:", e?.message || e);
  }
  return url; // fallback if no redirect or failure
}

/* ---------- DB helper ---------- */
async function createOrGetProduct(db, url) {
  if (db) {
    const existing = await db.collection("trackedProducts").findOne({ url });
    if (existing) {
      return { id: existing._id.toString(), created: false, product: existing };
    }

    const doc = {
      url,
      title: (() => {
        try {
          const u = new URL(url);
          return (
            u.hostname +
            (u.pathname && u.pathname !== "/" ? ` ${u.pathname.split("/").pop() || ""}` : "")
          );
        } catch {
          return url;
        }
      })(),
      price: null,
      watchCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const r = await db.collection("trackedProducts").insertOne(doc);
    return {
      id: r.insertedId?.toString() ?? null,
      created: true,
      product: { ...doc, _id: r.insertedId },
    };
  }

  // fallback in-memory (dev only)
  for (const [id, p] of inMemoryProducts.entries()) {
    if (p.url === url) return { id, created: false, product: p };
  }
  const id = `dev_${Date.now().toString(36)}_${Math.floor(Math.random() * 9000 + 1000)}`;
  const product = {
    id,
    url,
    title: url,
    price: null,
    watchCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  inMemoryProducts.set(id, product);
  return { id, created: true, product };
}

/* ---------- POST handler ---------- */
export async function POST(req) {
  try {
    let body = {};
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error("add-product: invalid json body:", parseErr?.message || parseErr);
      return NextResponse.json(
        { ok: false, error: "invalid_json", detail: String(parseErr?.message || parseErr) },
        { status: 400 }
      );
    }

    let url = body?.url;
    if (!url || typeof url !== "string") {
      return NextResponse.json({ ok: false, error: "url_required" }, { status: 400 });
    }

    // sanitize / normalize incoming URL
    url = url.trim();
    try {
      // if user passed something without protocol, assume https
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;
      const normalized = new URL(url).toString();
      url = normalized;
    } catch (e) {
      console.error("add-product: invalid url after normalization:", url, e?.message || e);
      return NextResponse.json({ ok: false, error: "invalid_url" }, { status: 400 });
    }

    // expand Flipkart shortlinks before saving (best-effort)
    try {
      url = await expandFlipkartShortUrl(url);
    } catch (e) {
      console.warn("add-product: flipkart shortlink expand failed, continuing with original url", e?.message || e);
    }

    let db = null;
    try {
      db = await getDb();
    } catch (dbErr) {
      console.error("add-product: DB connect failed, using in-memory fallback. DB error:", dbErr?.message || dbErr);
      db = null;
    }

    const result = await createOrGetProduct(db, url);

    // If created, invalidate sitemap cache and optionally prime page 1
    if (result.created) {
      try {
        if (typeof clearAll === "function") clearAll();
      } catch (e) {
        console.error("add-product: failed to clear sitemap cache:", e?.message || e);
      }

      try {
        if (typeof generateSitemapPage === "function") {
          // warm the page 1 cache so public requests get fresh listing immediately
          await generateSitemapPage(1);
        }
      } catch (e) {
        console.error("add-product: failed to generate sitemap page 1:", e?.message || e);
      }
    }

    const status = result.created ? 201 : 200;
    return NextResponse.json(
      { ok: true, created: result.created, id: result.id, product: result.product },
      { status }
    );
  } catch (err) {
    console.error("add-product unexpected error:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: "internal", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
