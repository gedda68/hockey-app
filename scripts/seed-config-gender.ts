// scripts/seed-config-gender.ts
// Seed gender options

import { MongoClient } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority";
const DB_NAME = process.env.DB_NAME || "hockey-app";

const DEFAULT_GENDERS = [
  { name: "Male", displayOrder: 1 },
  { name: "Female", displayOrder: 2 },
  { name: "Non-binary", displayOrder: 3 },
  { name: "Other", displayOrder: 4 },
  { name: "Prefer not to say", displayOrder: 5 },
];

async function seedConfigGender() {
  console.log("🌱 Seeding gender options...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const database = client.db(DB_NAME);
    const collection = database.collection("config_genders");

    // Check if already seeded
    const existing = await collection.countDocuments();

    if (existing > 0) {
      console.log(`ℹ️  Collection already has ${existing} gender options`);
      console.log("   Skipping seed\n");
      return;
    }

    // Insert genders
    const genders = DEFAULT_GENDERS.map((gender) => ({
      genderId: `gender-${gender.name.toLowerCase().replace(/\s+/g, "-")}`,
      name: gender.name,
      isActive: true,
      displayOrder: gender.displayOrder,
      usageCount: 0,
      lastUsed: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
    }));

    await collection.insertMany(genders);

    console.log(`✅ Inserted ${genders.length} gender options\n`);

    genders.forEach((g) => {
      console.log(`   • ${g.name}`);
    });

    console.log("\n✅ Seeding complete!");
    console.log("\n📋 Next steps:");
    console.log("   1. View gender options: /admin/config/gender");
    console.log("   2. Add/edit/delete as needed");
    console.log("   3. Use in member registration");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedConfigGender();
