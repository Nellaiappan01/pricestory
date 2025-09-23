// src/lib/mongodb.js
const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI || "";
const MONGODB_DB = process.env.MONGODB_DB || process.env.NEXT_PUBLIC_MONGODB_DB || undefined;

if (!MONGODB_URI) {
  console.warn("MONGODB_URI not set - database calls will fail until configured.");
}

let cachedClient = null;
let cachedDb = null;

function createClient() {
  return new MongoClient(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

async function clientPromise() {
  if (cachedClient) return cachedClient;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined");
  }
  const client = createClient();
  await client.connect();
  cachedClient = client;
  return client;
}

async function getDb() {
  if (cachedDb) return cachedDb;
  const client = await clientPromise();
  const dbName = MONGODB_DB || (client.db && client.db().databaseName) || undefined;
  const db = dbName ? client.db(dbName) : client.db();
  cachedDb = db;
  return db;
}

module.exports = clientPromise;
module.exports.getDb = getDb;
