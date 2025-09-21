// scripts/migrate-watchlist-to-tracked.js
const { MongoClient } = require("mongodb");

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Please set MONGODB_URI in env");

  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || undefined);

  // Adjust sourceCollName to where your app currently stores product docs
  const sourceCollName = "watchlist"; // or "products" / "watchedProducts"
  const source = db.collection(sourceCollName);
  const dest = db.collection("trackedProducts");

  const cursor = source.find({});
  let migrated = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    // Map fields: adapt according to your source schema
    const productId = doc.productId || (doc._id && doc._id.toString());
    const title = doc.title || doc.name || null;
    const price = doc.price || null;
    const url = doc.url || null;
    const priceHistory = doc.priceHistory || null;
    const image = doc.image || null;

    if (!productId) continue;

    await dest.updateOne(
      { productId },
      {
        $set: {
          title,
          price,
          url,
          priceHistory,
          image,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    migrated++;
  }

  console.log("Migrated", migrated, "docs to trackedProducts");
  await client.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
