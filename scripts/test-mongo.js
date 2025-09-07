// scripts/test-mongo.js
const { MongoClient } = require("mongodb");
const uri = process.env.MONGODB_URI || "your_mongo_uri_here";

(async () => {
  try {
    const c = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await c.connect();
    console.log("Mongo connect OK");
    const db = c.db();
    const names = await db.listCollections().toArray();
    console.log("Collections:", names.map(n=>n.name));
    await c.close();
  } catch (err) {
    console.error("Mongo connect failed:", err);
    process.exit(1);
  }
})();
