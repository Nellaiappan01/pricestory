// src/app/api/update-prices/route.js
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import axios from "axios";
import cheerio from "cheerio";

function extractPriceFromHtml(html) {
  const $ = cheerio.load(html);
  const bodyText = $('body').text();
  const match = bodyText.match(/(?:₹|Rs\.?|INR|₹\s*)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i)
             || bodyText.match(/([0-9]{1,3}(?:[.,][0-9]{3})*(?:\.[0-9]{1,2})?)/);
  if (match) {
    const cleaned = String(match[1]).replace(/[, ]+/g, "");
    const n = Number(cleaned.replace(/[^0-9.]/g, ""));
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

export async function POST(req) {
  try {
    const db = await getDb();
    // read optional params
    const { batchSize = 20 } = await req.json().catch(()=>({}));
    const cutoff = new Date(Date.now() - (15 * 60 * 1000));

    const products = await db.collection("products").find({ $or: [{ lastChecked: { $exists:false } }, { lastChecked: { $lt: cutoff } }] }).limit(batchSize).toArray();

    const results = [];
    for (const p of products) {
      try {
        const r = await axios.get(p.url, { timeout: 10000, headers: { "User-Agent": "PriceWatcher/1.0" }});
        const price = extractPriceFromHtml(r.data);
        const now = new Date();
        if (price != null) {
          await db.collection("products").updateOne({ _id: p._id }, { $set: { currentPrice: price, lastChecked: now }, $push: { priceHistory: { price, checkedAt: now } }});
        } else {
          await db.collection("products").updateOne({ _id: p._id }, { $set: { lastChecked: now }});
        }
        results.push({ id: p._id, price: price ?? null });
      } catch (err) {
        await db.collection("products").updateOne({ _id: p._id }, { $set: { lastChecked: new Date(), lastError: String(err.message || err) }});
        results.push({ id: p._id, error: String(err.message || err) });
      }
    }

    return NextResponse.json({ ok:true, processed: results.length, results });
  } catch (err) {
    console.error("update-prices error", err);
    return NextResponse.json({ ok:false, error: String(err.message || err) }, { status: 500 });
  }
}
