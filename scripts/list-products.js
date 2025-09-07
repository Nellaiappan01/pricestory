// scripts/list-products.js
const { MongoClient } = require("mongodb");
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "test";

if (!uri) {
  console.error("Set MONGODB_URI in env");
  process.exit(1);
}

(async () => {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    const docs = await db.collection("products").find({}).limit(50).toArray();
    console.log("DB:", dbName, "count:", docs.length);
    console.dir(docs, { depth: 3, colors: false });
    await client.close();
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();
