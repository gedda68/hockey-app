// scripts/seed-config-salutations.ts
// Seed global salutations/titles

import { MongoClient } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority";
const DB_NAME = process.env.DB_NAME || "hockey-app";

const salutations = [
  // Standard
  {
    salutationId: "sal-mr",
    name: "Mr",
    fullName: "Mister",
    category: "Standard",
    isActive: true,
    displayOrder: 1,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    salutationId: "sal-mrs",
    name: "Mrs",
    fullName: "Missus",
    category: "Standard",
    isActive: true,
    displayOrder: 2,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    salutationId: "sal-ms",
    name: "Ms",
    fullName: "Miss",
    category: "Standard",
    isActive: true,
    displayOrder: 3,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    salutationId: "sal-miss",
    name: "Miss",
    fullName: "Miss",
    category: "Standard",
    isActive: true,
    displayOrder: 4,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    salutationId: "sal-mx",
    name: "Mx",
    fullName: "Neutral",
    category: "Standard",
    isActive: true,
    displayOrder: 5,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Professional
  {
    salutationId: "sal-dr",
    name: "Dr",
    fullName: "Doctor",
    category: "Professional",
    isActive: true,
    displayOrder: 6,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    salutationId: "sal-prof",
    name: "Prof",
    fullName: "Professor",
    category: "Professional",
    isActive: true,
    displayOrder: 7,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    salutationId: "sal-assoc-prof",
    name: "Assoc Prof",
    fullName: "Associate Professor",
    category: "Professional",
    isActive: true,
    displayOrder: 8,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Academic/Religious
  {
    salutationId: "sal-hon",
    name: "Hon",
    fullName: "Honorable",
    category: "Academic",
    isActive: true,
    displayOrder: 9,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    salutationId: "sal-rev",
    name: "Rev",
    fullName: "Reverend",
    category: "Academic",
    isActive: true,
    displayOrder: 10,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    salutationId: "sal-fr",
    name: "Fr",
    fullName: "Father",
    category: "Academic",
    isActive: true,
    displayOrder: 11,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Military
  {
    salutationId: "sal-capt",
    name: "Capt",
    fullName: "Captain",
    category: "Military",
    isActive: true,
    displayOrder: 12,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    salutationId: "sal-maj",
    name: "Maj",
    fullName: "Major",
    category: "Military",
    isActive: true,
    displayOrder: 13,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    salutationId: "sal-col",
    name: "Col",
    fullName: "Colonel",
    category: "Military",
    isActive: true,
    displayOrder: 14,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    salutationId: "sal-gen",
    name: "Gen",
    fullName: "General",
    category: "Military",
    isActive: true,
    displayOrder: 15,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Other
  {
    salutationId: "sal-sir",
    name: "Sir",
    fullName: "Sir",
    category: "Other",
    isActive: true,
    displayOrder: 16,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    salutationId: "sal-dame",
    name: "Dame",
    fullName: "Dame",
    category: "Other",
    isActive: true,
    displayOrder: 17,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    salutationId: "sal-lord",
    name: "Lord",
    fullName: "Lord",
    category: "Other",
    isActive: true,
    displayOrder: 18,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    salutationId: "sal-lady",
    name: "Lady",
    fullName: "Lady",
    category: "Other",
    isActive: true,
    displayOrder: 19,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    salutationId: "sal-master",
    name: "Master",
    fullName: "Master",
    category: "Other",
    isActive: true,
    displayOrder: 20,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function seedConfigSalutations() {
  console.log("🌱 Seeding salutations/titles...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db(DB_NAME);
    const collection = db.collection("config_salutations");

    // Check if already seeded
    const existing = await collection.countDocuments();
    if (existing > 0) {
      console.log(`⚠️  Found ${existing} existing salutations`);
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
      console.log("   🗑️  Deleted existing salutations\n");
    }

    // Insert salutations
    await collection.insertMany(salutations);

    console.log("✅ Successfully seeded salutations:\n");

    // Group by category
    const byCategory = salutations.reduce((acc: any, sal) => {
      if (!acc[sal.category]) acc[sal.category] = [];
      acc[sal.category].push(sal);
      return acc;
    }, {});

    Object.keys(byCategory).forEach((category) => {
      console.log(`   ${category}:`);
      byCategory[category].forEach((sal: any) => {
        const display =
          sal.name === sal.fullName
            ? sal.name
            : `${sal.name} (${sal.fullName})`;
        console.log(`     • ${display}`);
      });
      console.log("");
    });

    console.log(`📊 Total: ${salutations.length} salutations`);
    console.log("📦 Collection: config_salutations");
    console.log("\n✅ Seeding complete!");
  } catch (error) {
    console.error("❌ Error seeding salutations:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedConfigSalutations();
