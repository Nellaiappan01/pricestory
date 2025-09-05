// src/lib/mongodb.js
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI not set in .env.local");
}

/** Cache the client across module reloads in dev for performance */
let cached = global._mongoClientPromise;

if (!cached) {
  const client = new MongoClient(uri);
  cached = client.connect();
  global._mongoClientPromise = cached;
}

export async function getDb() {
  const client = await cached;
  // If your connection string includes a default DB name, client.db() returns it.
  // Otherwise, pass the DB name: client.db('pricetracker')
  return client.db();
}
 