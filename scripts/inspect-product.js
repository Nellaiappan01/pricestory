// scripts/inspect-product.js
require("dotenv").config({ path: ".env.local" });
const { MongoClient, ObjectId } = require("mongodb");

(async () => {
  try {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGO_DBNAME || "smeu";
    if (!uri) {
      console.error("MONGODB_URI missing in .env.local");
      process.exit(1);
    }

    const id = process.argv[2];
    if (!id) {
      console.error("Usage: node scripts/inspect-product.js <productId>");
      process.exit(1);
    }

    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const db = client.db(dbName);

    const prod = await db.collection("products").findOne(
      { _id: new ObjectId(id) },
      { projection: { url: 1, currentPrice: 1, priceHistory: 1 } }
    );

    console.log(JSON.stringify(prod, null, 2));
    await client.close();
    process.exit(0);
  } catch (err) {
    console.error("inspect-product error:", err && (err.stack || err.message || err));
    process.exit(1);
  }
})();
