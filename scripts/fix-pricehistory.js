// scripts/fix-pricehistory.js
require("dotenv").config({ path: ".env.local" });
const { MongoClient, ObjectId } = require("mongodb");

function toNumber(val) {
  if (val == null) return null;
  if (typeof val === "number") return Number(val);
  const s = String(val).replace(/[^0-9.\-]+/g, "");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function toDate(val) {
  if (!val) return null;
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

(async () => {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGO_DBNAME || "smeu";
  if (!uri) {
    console.error("MONGODB_URI missing in .env.local");
    process.exit(1);
  }

  // parse args
  const args = process.argv.slice(2);
  const productArgIndex = args.indexOf("--product");
  const productId = productArgIndex !== -1 ? args[productArgIndex + 1] : null;
  const apply = args.includes("--apply"); // if false => dry-run

  console.log(`fix-pricehistory starting. target product: ${productId || "ALL"}, mode: ${apply ? "APPLY" : "DRY-RUN"}`);

  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  const db = client.db(dbName);
  const products = db.collection("products");

  const query = productId ? { _id: new ObjectId(productId) } : {};
  const cursor = products.find(query);

  let scanned = 0;
  let willFix = 0;
  let applied = 0;

  while (await cursor.hasNext()) {
    const p = await cursor.next();
    scanned++;
    const ph = Array.isArray(p.priceHistory) ? p.priceHistory : [];

    const normalized = ph
      .map((h) => {
        const price = toNumber(h?.price ?? h?.p ?? h?.value ?? null);
        const atRaw = h?.at ?? h?.t ?? null;
        const atDate = toDate(atRaw) || new Date();
        return { price, at: atDate };
      })
      .filter((x) => typeof x.price === "number" && Number.isFinite(x.price))
      .map((x) => ({ price: x.price, at: x.at }));

    // compare lengths or content
    const same =
      ph.length === normalized.length &&
      ph.every((orig, idx) => {
        const n = normalized[idx];
        // tolerant compare
        const origPrice = toNumber(orig?.price ?? orig?.p ?? orig?.value ?? null);
        const origAt = (() => {
          try {
            const d = new Date(orig?.at ?? orig?.t ?? orig?.date ?? null);
            return isNaN(d.getTime()) ? null : d.toISOString();
          } catch {
            return null;
          }
        })();
        return origPrice === n.price && origAt === n.at.toISOString();
      });

    if (!same) {
      willFix++;
      console.log(`[DRY] Product ${p._id} (${p.url || "no-url"}) => orig points: ${ph.length}, normalized: ${normalized.length}`);
      if (apply) {
        // apply update: set normalized array & update currentPrice
        const currentPrice = normalized.length ? normalized[normalized.length - 1].price : null;
        await products.updateOne(
          { _id: p._id },
          { $set: { priceHistory: normalized.map(n => ({ price: n.price, at: n.at })), currentPrice, lastChecked: new Date() } }
        );
        applied++;
        console.log(`  [APPLIED] updated ${p._id}`);
      }
    }

    // safety: small pause every 200 scanned to not overwhelm
    if (scanned % 200 === 0) {
      console.log(`scanned ${scanned}...`);
    }
  }

  console.log(`Done. scanned: ${scanned}, to-fix: ${willFix}, applied: ${applied}`);
  await client.close();
  process.exit(0);
})();
