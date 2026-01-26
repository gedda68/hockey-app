// scripts/fix-missing-colors.ts
// Add default colors to clubs that are missing them

import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "hockey-app";

const DEFAULT_COLORS = {
  primary: "#06054e",
  secondary: "#090836",
  accent: "#ffd700",
};

async function fixMissingColors() {
  console.log("🔧 Checking for clubs with missing colors...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const database = client.db(DB_NAME);
    const clubsCollection = database.collection("clubs");

    // Find all clubs
    const clubs = await clubsCollection.find({}).toArray();
    console.log(`📊 Found ${clubs.length} clubs\n`);

    let fixed = 0;
    let alreadyHaveColors = 0;

    for (const club of clubs) {
      const clubName = club.name || club.title || "Unknown";

      // Check if colors exist and are valid
      const hasValidColors =
        club.colors &&
        typeof club.colors === "object" &&
        club.colors.primary &&
        club.colors.secondary;

      if (!hasValidColors) {
        console.log(`🔧 Fixing: "${clubName}"`);
        console.log(`   Adding default colors`);

        await clubsCollection.updateOne(
          { _id: club._id },
          {
            $set: {
              colors: DEFAULT_COLORS,
              updatedAt: new Date().toISOString(),
            },
          }
        );

        fixed++;
        console.log(`   ✅ Fixed!\n`);
      } else {
        console.log(`✅ "${clubName}": Has colors`);
        alreadyHaveColors++;
      }
    }

    console.log("\n📈 Summary:");
    console.log(`   Total clubs: ${clubs.length}`);
    console.log(`   Already have colors: ${alreadyHaveColors}`);
    console.log(`   Fixed: ${fixed}`);

    if (fixed > 0) {
      console.log("\n✅ Missing colors have been fixed!");
      console.log("   Default colors applied:");
      console.log(`   - Primary: ${DEFAULT_COLORS.primary}`);
      console.log(`   - Secondary: ${DEFAULT_COLORS.secondary}`);
      console.log(`   - Accent: ${DEFAULT_COLORS.accent}`);
      console.log("\n   Restart your server: npm run dev");
    } else {
      console.log("\n✅ All clubs already have colors!");
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

fixMissingColors();
