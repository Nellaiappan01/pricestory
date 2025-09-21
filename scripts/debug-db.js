// scripts/debug-db.js
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { getDb } from "../src/lib/mongodb.js";

async function main() {
  const db = await getDb();
  const docs = await db.collection("trackedProducts").find().limit(5).toArray();
  console.log("Sample docs:", docs);
  process.exit(0);
}

main().catch(err => {
  console.error("DB error:", err);
  process.exit(1);
});
