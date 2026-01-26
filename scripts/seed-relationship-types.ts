// scripts/seed-relationship-types.ts
// Seed relationship types (Forward/Reverse mapping)

import { MongoClient } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority";
const DB_NAME = process.env.DB_NAME || "hockey-app";

const relationshipTypes = [
  // Parent-Child relationships
  {
    typeId: "reltype-parent-child",
    forward: "Parent",
    reverse: "Child",
    category: "Family",
    isActive: true,
    displayOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    typeId: "reltype-mother-child",
    forward: "Mother",
    reverse: "Child",
    category: "Family",
    isActive: true,
    displayOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    typeId: "reltype-father-child",
    forward: "Father",
    reverse: "Child",
    category: "Family",
    isActive: true,
    displayOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    typeId: "reltype-son-parent",
    forward: "Son",
    reverse: "Parent",
    category: "Family",
    isActive: true,
    displayOrder: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    typeId: "reltype-daughter-parent",
    forward: "Daughter",
    reverse: "Parent",
    category: "Family",
    isActive: true,
    displayOrder: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Sibling relationships
  {
    typeId: "reltype-brother-sibling",
    forward: "Brother",
    reverse: "Sibling",
    category: "Family",
    isActive: true,
    displayOrder: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    typeId: "reltype-sister-sibling",
    forward: "Sister",
    reverse: "Sibling",
    category: "Family",
    isActive: true,
    displayOrder: 7,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Spouse relationships
  {
    typeId: "reltype-spouse-spouse",
    forward: "Spouse",
    reverse: "Spouse",
    category: "Family",
    isActive: true,
    displayOrder: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    typeId: "reltype-husband-wife",
    forward: "Husband",
    reverse: "Wife",
    category: "Family",
    isActive: true,
    displayOrder: 9,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    typeId: "reltype-wife-husband",
    forward: "Wife",
    reverse: "Husband",
    category: "Family",
    isActive: true,
    displayOrder: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Partner relationships
  {
    typeId: "reltype-partner-partner",
    forward: "Partner",
    reverse: "Partner",
    category: "Family",
    isActive: true,
    displayOrder: 11,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Extended family
  {
    typeId: "reltype-grandparent-grandchild",
    forward: "Grandparent",
    reverse: "Grandchild",
    category: "Family",
    isActive: true,
    displayOrder: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    typeId: "reltype-grandchild-grandparent",
    forward: "Grandchild",
    reverse: "Grandparent",
    category: "Family",
    isActive: true,
    displayOrder: 13,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    typeId: "reltype-aunt-nephew-niece",
    forward: "Aunt",
    reverse: "Nephew/Niece",
    category: "Family",
    isActive: true,
    displayOrder: 14,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    typeId: "reltype-uncle-nephew-niece",
    forward: "Uncle",
    reverse: "Nephew/Niece",
    category: "Family",
    isActive: true,
    displayOrder: 15,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Guardian relationships
  {
    typeId: "reltype-guardian-dependent",
    forward: "Guardian",
    reverse: "Dependent",
    category: "Legal",
    isActive: true,
    displayOrder: 16,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    typeId: "reltype-dependent-guardian",
    forward: "Dependent",
    reverse: "Guardian",
    category: "Legal",
    isActive: true,
    displayOrder: 17,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Other
  {
    typeId: "reltype-friend-friend",
    forward: "Friend",
    reverse: "Friend",
    category: "Other",
    isActive: true,
    displayOrder: 18,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function seedRelationshipTypes() {
  console.log("🌱 Seeding relationship types...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db(DB_NAME);
    const collection = db.collection("relationship_types");

    // Check if already seeded
    const existing = await collection.countDocuments();
    if (existing > 0) {
      console.log(`⚠️  Found ${existing} existing relationship types`);
      console.log("   Delete them first or skip seeding\n");

      const readline = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise((resolve) => {
        readline.question("   Continue and replace? (y/n): ", resolve);
      });
      readline.close();

      if (answer.toLowerCase() !== "y") {
        console.log("\n❌ Seeding cancelled");
        return;
      }

      await collection.deleteMany({});
      console.log("   🗑️  Deleted existing relationship types\n");
    }

    // Insert relationship types
    await collection.insertMany(relationshipTypes);

    console.log("✅ Successfully seeded relationship types:\n");

    // Group by category
    const byCategory = relationshipTypes.reduce((acc: any, rel) => {
      if (!acc[rel.category]) acc[rel.category] = [];
      acc[rel.category].push(rel);
      return acc;
    }, {});

    Object.keys(byCategory).forEach((category) => {
      console.log(`   ${category}:`);
      byCategory[category].forEach((rel: any) => {
        const display =
          rel.forward === rel.reverse
            ? rel.forward
            : `${rel.forward} ↔ ${rel.reverse}`;
        console.log(`     • ${display}`);
      });
      console.log("");
    });

    console.log(`📊 Total: ${relationshipTypes.length} relationship types`);
    console.log("📦 Collection: relationship_types");
    console.log("\n✅ Seeding complete!");
  } catch (error) {
    console.error("❌ Error seeding relationship types:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedRelationshipTypes();
