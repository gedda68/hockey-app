// scripts/diagnose-clubs-api.ts
// Diagnostic script to check clubs API and database

import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "hockey-app";

async function diagnoseClubsAPI() {
  console.log("🔍 Diagnosing Clubs API...\n");
  console.log("━".repeat(60));

  const client = new MongoClient(MONGODB_URI);

  try {
    // 1. Test MongoDB Connection
    console.log("\n1️⃣ Testing MongoDB Connection...");
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const database = client.db(DB_NAME);

    // 2. Check Database Name
    console.log("2️⃣ Database Information:");
    console.log(`   Database: ${DB_NAME}`);
    const collections = await database.listCollections().toArray();
    console.log(
      `   Collections: ${collections.map((c) => c.name).join(", ")}\n`
    );

    // 3. Check Clubs Collection
    console.log("3️⃣ Checking Clubs Collection...");
    const clubsCollection = database.collection("clubs");
    const clubCount = await clubsCollection.countDocuments();
    console.log(`   Total clubs in database: ${clubCount}\n`);

    if (clubCount === 0) {
      console.log("❌ No clubs found in database!");
      console.log("   Solution: Import clubs data");
      console.log(
        "   Command: mongoimport --db hockey-app --collection clubs --file hockey-app_clubs.json --jsonArray\n"
      );
      return;
    }

    // 4. Sample Club Data
    console.log("4️⃣ Sample Club Data:");
    const sampleClub = await clubsCollection.findOne({});
    console.log("   Fields in first club:");
    if (sampleClub) {
      Object.keys(sampleClub).forEach((key) => {
        const value = sampleClub[key];
        const type = typeof value;
        const preview =
          type === "object"
            ? JSON.stringify(value).substring(0, 50) + "..."
            : String(value).substring(0, 50);
        console.log(`   - ${key}: (${type}) ${preview}`);
      });
    }
    console.log();

    // 5. Test API Query
    console.log("5️⃣ Testing API Query...");
    console.log('   Query: db.collection("clubs").find({}).toArray()');
    const clubs = await clubsCollection.find({}).toArray();
    console.log(`   ✅ Retrieved ${clubs.length} clubs\n`);

    // 6. Check for unique club names
    console.log("6️⃣ Club Names (for API):");
    const distinctNames = await clubsCollection.distinct("name");
    console.log(`   Unique club names: ${distinctNames.length}`);
    distinctNames.slice(0, 5).forEach((name) => {
      console.log(`   - ${name}`);
    });
    if (distinctNames.length > 5) {
      console.log(`   ... and ${distinctNames.length - 5} more\n`);
    }

    // 7. Test what GET route should return
    console.log("7️⃣ Testing GET Route Logic...");

    // Option A: Return all clubs
    const allClubs = await clubsCollection.find({}).toArray();
    console.log(`   All clubs: ${allClubs.length} documents`);

    // Option B: Return distinct names with IDs (current API logic)
    const clubsData = await Promise.all(
      distinctNames.map(async (name) => {
        const clubDoc = await clubsCollection.findOne({ name });
        return {
          id: clubDoc?.id,
          name: clubDoc?.name,
        };
      })
    );
    console.log(`   Unique clubs with IDs: ${clubsData.length} documents\n`);

    // 8. Recommendations
    console.log("8️⃣ Recommendations:");
    if (clubCount > distinctNames.length) {
      console.log("   ⚠️ You have duplicate club names!");
      console.log(`   Total documents: ${clubCount}`);
      console.log(`   Unique names: ${distinctNames.length}`);
      console.log("   The API only returns unique names, not all documents.\n");
    }

    console.log("✅ Diagnosis Complete!\n");
    console.log("━".repeat(60));
    console.log("\n💡 Next Steps:");
    console.log("   1. Check your API route matches the database structure");
    console.log("   2. Ensure MONGODB_URI and DB_NAME are correct");
    console.log(
      "   3. Test the API endpoint: http://localhost:3000/api/admin/clubs"
    );
    console.log("   4. Check browser console for errors\n");
  } catch (error) {
    console.error("❌ Error:", error);
    console.log("\n💡 Common Issues:");
    console.log("   - MongoDB not running");
    console.log("   - Wrong database name");
    console.log("   - Wrong collection name");
    console.log("   - Connection string incorrect\n");
  } finally {
    await client.close();
  }
}

diagnoseClubsAPI();
