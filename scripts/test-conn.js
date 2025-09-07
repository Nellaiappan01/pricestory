require("dotenv").config({ path: ".env.local" });
const { MongoClient } = require("mongodb");

(async()=>{
  const uri = process.env.MONGODB_URI;
  if(!uri) return console.error("MONGODB_URI missing");
  const client = new MongoClient(uri);
  try{
    await client.connect();
    console.log("Connected OK");
    const db = client.db(process.env.MONGO_DBNAME || "test");
    const cnt = await db.collection("products").countDocuments();
    console.log("products count:", cnt);
  }catch(e){
    console.error("Conn error:", e && (e.message || e));
  }finally{
    await client.close();
  }
})();
