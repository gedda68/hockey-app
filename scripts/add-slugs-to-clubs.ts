// scripts/add-slugs-to-clubs.ts
// Script to add slug field to existing clubs in database

import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "hockey-app";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function addSlugsToClubs() {
  console.log("🚀 Adding slugs to existing clubs...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const database = client.db(DB_NAME);
    const clubsCollection = database.collection("clubs");

    // Get all clubs
    const clubs = await clubsCollection.find({}).toArray();
    console.log(`📊 Found ${clubs.length} clubs\n`);

    let updated = 0;
    let skipped = 0;

    for (const club of clubs) {
      // Check if club already has a slug
      if (club.slug) {
        console.log(
          `⏭️  Skipping "${club.name}" - already has slug: ${club.slug}`
        );
        skipped++;
        continue;
      }

      // Generate slug
      const slug = generateSlug(club.name);

      // Update club with slug
      await clubsCollection.updateOne(
        { _id: club._id },
        {
          $set: {
            slug,
            updatedAt: new Date().toISOString(),
          },
        }
      );

      console.log(`✅ Added slug to "${club.name}": ${slug}`);
      updated++;
    }

    console.log("\n📈 Summary:");
    console.log(`   Updated: ${updated} clubs`);
    console.log(`   Skipped: ${skipped} clubs (already had slugs)`);
    console.log(`   Total: ${clubs.length} clubs`);

    console.log("\n✅ Done!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

addSlugsToClubs();
