// src/lib/mongodb.js
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "test";

if (!MONGODB_URI) {
  console.error("MONGODB_URI not set (src/lib/mongodb.js). Set it in .env.local");
}

let cachedClient = global.__mongoClient;
let cachedDb = global.__mongoDb;

if (!cachedClient) {
  const client = new MongoClient(MONGODB_URI || "", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  cachedClient = client;
  global.__mongoClient = cachedClient;
}

export async function getDb() {
  if (!MONGODB_URI) {
    const err = new Error("MONGODB_URI not configured");
    err.code = "MISSING_URI";
    throw err;
  }

  try {
    // connect if not connected
    if (!cachedClient.isConnected || typeof cachedClient.isConnected !== "function") {
      // modern MongoClient may not have isConnected; attempt connect always but only once
      await cachedClient.connect();
    } else if (!cachedClient.isConnected()) {
      await cachedClient.connect();
    }

    if (!global.__mongoDb) {
      global.__mongoDb = cachedClient.db(MONGODB_DB);
    }
    return global.__mongoDb;
  } catch (err) {
    console.error("getDb() connection error:", err);
    // rethrow so callers can handle specific responses
    throw err;
  }
}
