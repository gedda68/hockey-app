// scripts/verify-slugs.ts
// Script to check if slugs exist in database

import "./load-env";
import { MongoClient } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI!;
const DB_NAME = process.env.DB_NAME || "hockey-app";

async function verifySlugsinDatabase() {
  console.log("🔍 Checking slugs in database...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const database = client.db(DB_NAME);
    const clubsCollection = database.collection("clubs");

    // Get all clubs
    const clubs = await clubsCollection
      .find({ active: true })
      .sort({ name: 1 })
      .toArray();

    console.log(`📊 Found ${clubs.length} active clubs\n`);

    let hasSlug = 0;
    let noSlug = 0;

    console.log("Club Data Check:\n");
    console.log("─".repeat(80));

    clubs.forEach((club, i) => {
      const name = club.name || club.title || "UNKNOWN";
      const slug = club.slug;

      if (slug) {
        console.log(`✅ ${i + 1}. ${name}`);
        console.log(`   Slug: "${slug}"`);
        hasSlug++;
      } else {
        console.log(`❌ ${i + 1}. ${name}`);
        console.log(`   Slug: MISSING`);
        noSlug++;
      }
      console.log("");
    });

    console.log("─".repeat(80));
    console.log("\n📈 Summary:");
    console.log(`   Total clubs: ${clubs.length}`);
    console.log(`   With slug: ${hasSlug}`);
    console.log(`   Without slug: ${noSlug}`);

    if (noSlug > 0) {
      console.log("\n⚠️  Some clubs are missing slugs!");
      console.log("   Run: npx tsx scripts/add-slugs-to-clubs.ts");
    } else {
      console.log("\n✅ All clubs have slugs!");
    }

    // Show sample club data
    if (clubs.length > 0) {
      console.log("\n📋 Sample Club (first club):");
      console.log(JSON.stringify(clubs[0], null, 2));
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

verifySlugsinDatabase();
