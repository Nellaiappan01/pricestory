// scripts/test-conn-verbose.js
require("dotenv").config({ path: ".env.local" });
const { MongoClient } = require("mongodb");

async function tryConnect(uriName, uri) {
  console.log("=== Trying:", uriName);
  console.log("URI (hidden password):", uri ? uri.replace(/:[^:@]+@/, ":<REDACTED>@") : "<missing>");
  const opts = { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 };
  const client = new MongoClient(uri, opts);
  try {
    await client.connect();
    console.log("Connected OK:", uriName);
    const db = client.db(process.env.MONGO_DBNAME || "test");
    const cnt = await db.collection("products").countDocuments();
    console.log("Products count:", cnt);
    await client.close();
    return;
  } catch (err) {
    console.error("ERROR for", uriName, "->", (err && err.stack) || err);
    try { await client.close(); } catch (e) {}
  }
}

(async () => {
  const envUri = process.env.MONGODB_URI;
  if (!envUri) {
    console.error("MONGODB_URI missing in .env.local");
    process.exit(1);
  }

  // 1) try the exact env uri
  await tryConnect("env uri", envUri);

  // 2) If env uri is +srv, also try converting to non-srv using resolved hosts
  // You can edit the next line with your actual hostlist (from Resolve-DnsName).
  // If you already set non-SRV in .env.local this will repeat — that's ok.
  const nonSrvFromEnv = envUri.includes("+srv") ? envUri.replace("+srv://", "mongodb://") : null;

  if (nonSrvFromEnv) {
    console.log("\nNote: env uri was +srv; trying non-srv transformation (may be missing hosts/replicaSet/authSource):");
    console.log("This transformed URI might not include host list; if it fails we'll ask you to paste the 'standard connection string' from Atlas.");
    await tryConnect("transformed-non-srv (basic)", nonSrvFromEnv);
  }

  console.log("\nDone tests. If both failed, please paste the full error stacks above (DO NOT paste your password).");
  process.exit(0);
})();
