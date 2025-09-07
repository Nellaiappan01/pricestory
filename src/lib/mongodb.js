// src/lib/mongodb.js
import { MongoClient } from "mongodb";

let client = null;
let cachedDb = null;

export async function getDb() {
  if (cachedDb) return cachedDb;

  if (!process.env.MONGODB_URI) {
    throw new Error("❌ MONGODB_URI not set in environment");
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGO_DBNAME || "smeu";

  client = new MongoClient(uri);
  await client.connect();

  cachedDb = client.db(dbName);
  console.log("✅ Connected to MongoDB:", dbName);
  return cachedDb;
}
