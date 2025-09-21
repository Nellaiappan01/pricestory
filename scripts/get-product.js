// scripts/get-product.js
// Usage:
//   node scripts/get-product.js <id-or-item-or-url-fragment>
//
// Examples:
//   node scripts/get-product.js 68cf7eeb875c5b7b5e7e0c0c
//   node scripts/get-product.js itm91e9841aadcae
//   node scripts/get-product.js "flipkart.com itm91e9"

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { getDb } from "../src/lib/mongodb.js";

function isObjectIdLike(s) {
  return typeof s === "string" && /^[0-9a-fA-F]{24}$/.test(s);
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: node scripts/get-product.js <id|itemId|url-fragment>");
    process.exit(1);
  }

  const db = await getDb();
  let doc = null;

  if (isObjectIdLike(arg)) {
    doc = await db.collection("trackedProducts").findOne({ _id: new (await import("mongodb")).ObjectId(arg) });
  }
  if (!doc) {
    // try match by url fragment or itemId in url
    doc = await db.collection("trackedProducts").findOne({ url: { $regex: arg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } });
  }
  if (!doc) {
    // try match by id field if you store id separately
    doc = await db.collection("trackedProducts").findOne({ id: arg });
  }

  if (!doc) {
    console.error("No product found for:", arg);
    process.exit(2);
  }

  console.log("Found document:");
  console.dir(doc, { depth: 4, colors: true });
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
