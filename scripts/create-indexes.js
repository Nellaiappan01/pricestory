// scripts/create-indexes.js
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "test";

if (!uri) {
  console.error("Set MONGODB_URI environment variable first");
  process.exit(1);
}

(async () => {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    console.log("Connected to Mongo");

    const db = client.db(dbName);

    console.log("Creating indexes...");
    await db.collection("products").createIndex({ url: 1 }, { unique: true });
    await db.collection("watchlist").createIndex({ productId: 1 }, { unique: true });

    console.log("Indexes created");
    await client.close();
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();
