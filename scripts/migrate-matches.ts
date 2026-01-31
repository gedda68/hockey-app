import { MongoClient } from "mongodb";
import matchesData from "../data/matches/matches.json";

const uri =
  "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority";

async function migrate() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    console.log("⏳ Starting migration…");

    // Clear existing
    await db.collection("matches").deleteMany({});

    // Insert as ONE document
    await db.collection("matches").insertOne(matchesData);

    console.log("✅ Migrated matches as a single document");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await client.close();
    console.log("🔌 MongoDB connection closed");
  }
}

migrate();
