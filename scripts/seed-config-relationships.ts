// scripts/seed-config-relationships.ts
// Seed emergency contact relationship types

import { MongoClient } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority";
const DB_NAME = process.env.DB_NAME || "hockey-app";

const DEFAULT_RELATIONSHIPS = [
  // Family
  { name: "Parent", category: "Family", displayOrder: 1 },
  { name: "Mother", category: "Family", displayOrder: 2 },
  { name: "Father", category: "Family", displayOrder: 3 },
  { name: "Guardian", category: "Family", displayOrder: 4 },
  { name: "Spouse", category: "Family", displayOrder: 5 },
  { name: "Partner", category: "Family", displayOrder: 6 },
  { name: "Sibling", category: "Family", displayOrder: 7 },
  { name: "Sister", category: "Family", displayOrder: 8 },
  { name: "Brother", category: "Family", displayOrder: 9 },
  { name: "Child", category: "Family", displayOrder: 10 },
  { name: "Daughter", category: "Family", displayOrder: 11 },
  { name: "Son", category: "Family", displayOrder: 12 },
  { name: "Grandparent", category: "Family", displayOrder: 13 },
  { name: "Grandmother", category: "Family", displayOrder: 14 },
  { name: "Grandfather", category: "Family", displayOrder: 15 },
  { name: "Aunt", category: "Family", displayOrder: 16 },
  { name: "Uncle", category: "Family", displayOrder: 17 },
  { name: "Cousin", category: "Family", displayOrder: 18 },
  { name: "Niece", category: "Family", displayOrder: 19 },
  { name: "Nephew", category: "Family", displayOrder: 20 },

  // Friends
  { name: "Friend", category: "Friend", displayOrder: 21 },
  { name: "Close Friend", category: "Friend", displayOrder: 22 },
  { name: "Neighbour", category: "Friend", displayOrder: 23 },
  { name: "Housemate", category: "Friend", displayOrder: 24 },

  // Professional
  { name: "Doctor", category: "Professional", displayOrder: 25 },
  { name: "Lawyer", category: "Professional", displayOrder: 26 },
  { name: "Employer", category: "Professional", displayOrder: 27 },
  { name: "Colleague", category: "Professional", displayOrder: 28 },
  { name: "Coach", category: "Professional", displayOrder: 29 },

  // Other
  { name: "Other", category: "Other", displayOrder: 30 },
];

async function seedConfigRelationships() {
  console.log("🌱 Seeding config relationship types...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const database = client.db(DB_NAME);
    const collection = database.collection("config_relationships");

    // Check if already seeded
    const existing = await collection.countDocuments();

    if (existing > 0) {
      console.log(`ℹ️  Collection already has ${existing} relationships`);
      console.log("   Skipping seed (run migration to add new ones)\n");
      return;
    }

    // Insert relationships
    const relationships = DEFAULT_RELATIONSHIPS.map((rel) => ({
      relationshipId: `rel-${rel.name.toLowerCase().replace(/\s+/g, "-")}`,
      name: rel.name,
      category: rel.category,
      isActive: true,
      displayOrder: rel.displayOrder,
      usageCount: 0,
      lastUsed: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
    }));

    await collection.insertMany(relationships);

    console.log(`✅ Inserted ${relationships.length} relationship types\n`);

    console.log("📊 Summary by category:");
    console.log(
      `   Family: ${
        relationships.filter((r) => r.category === "Family").length
      }`
    );
    console.log(
      `   Friend: ${
        relationships.filter((r) => r.category === "Friend").length
      }`
    );
    console.log(
      `   Professional: ${
        relationships.filter((r) => r.category === "Professional").length
      }`
    );
    console.log(
      `   Other: ${relationships.filter((r) => r.category === "Other").length}`
    );

    console.log("\n✅ Seeding complete!");
    console.log("\n📋 Next steps:");
    console.log("   1. View relationships: /admin/config/relationships");
    console.log("   2. Add/edit/delete as needed");
    console.log("   3. Use in member emergency contacts");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedConfigRelationships();
