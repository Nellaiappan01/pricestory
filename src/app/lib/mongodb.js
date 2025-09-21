// src/lib/mongodb.js
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DBNAME || "test";

if (!uri) {
  throw new Error("❌ Please define MONGODB_URI in .env.local");
}

let cached = global._mongo;
if (!cached) {
  cached = global._mongo = { client: null, promise: null };
}

async function connect() {
  if (cached.client) return cached.client;
  if (!cached.promise) {
    cached.promise = MongoClient.connect(uri, {
      maxPoolSize: 10,
    });
  }
  cached.client = await cached.promise;
  return cached.client;
}

// Export for scripts & API routes
export async function getDb() {
  const client = await connect();
  return client.db(dbName);
}

export const clientPromise = connect();
