// src/lib/mongodb.js
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "";
const MONGODB_DB = process.env.MONGODB_DB || "test";

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable in .env.local");
}

let cachedClient = null;
let cachedDb = null;

/**
 * Connect and cache client/db to avoid multiple connections during HMR.
 */
async function connectClient() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI, {
    // options left default for modern driver
  });

  // always attempt to connect once
  await client.connect();

  cachedClient = client;
  cachedDb = client.db(MONGODB_DB);

  return { client, db: cachedDb };
}

/**
 * Public helper: returns a connected Db instance or throws.
 */
export async function getDb() {
  const { db } = await connectClient();
  return db;
}
