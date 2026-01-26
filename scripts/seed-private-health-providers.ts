// scripts/seed-private-health-providers.ts
// Seed private health insurance providers

import { MongoClient } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority";
const DB_NAME = process.env.DB_NAME || "hockey-app";

const healthProviders = [
  {
    providerId: "provider-medibank",
    name: "Medibank",
    shortName: "Medibank",
    phone: "13 23 31",
    website: "https://www.medibank.com.au",
    category: "Major",
    isActive: true,
    displayOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    providerId: "provider-bupa",
    name: "Bupa",
    shortName: "Bupa",
    phone: "13 29 39",
    website: "https://www.bupa.com.au",
    category: "Major",
    isActive: true,
    displayOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    providerId: "provider-hcf",
    name: "HCF",
    shortName: "HCF",
    phone: "13 13 34",
    website: "https://www.hcf.com.au",
    category: "Major",
    isActive: true,
    displayOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    providerId: "provider-nib",
    name: "nib",
    shortName: "nib",
    phone: "13 16 42",
    website: "https://www.nib.com.au",
    category: "Major",
    isActive: true,
    displayOrder: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    providerId: "provider-ahm",
    name: "ahm",
    shortName: "ahm",
    phone: "13 42 46",
    website: "https://www.ahm.com.au",
    category: "Major",
    isActive: true,
    displayOrder: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    providerId: "provider-australian-unity",
    name: "Australian Unity",
    shortName: "Australian Unity",
    phone: "13 29 39",
    website: "https://www.australianunity.com.au",
    category: "Major",
    isActive: true,
    displayOrder: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    providerId: "provider-teachers-health",
    name: "Teachers Health",
    shortName: "Teachers Health",
    phone: "13 48 80",
    website: "https://www.teachershealth.com.au",
    category: "Restricted",
    isActive: true,
    displayOrder: 7,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    providerId: "provider-defence-health",
    name: "Defence Health",
    shortName: "Defence Health",
    phone: "1800 335 425",
    website: "https://www.defencehealth.com.au",
    category: "Restricted",
    isActive: true,
    displayOrder: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    providerId: "provider-police-health",
    name: "Police Health",
    shortName: "Police Health",
    phone: "1800 603 603",
    website: "https://www.policehealth.com.au",
    category: "Restricted",
    isActive: true,
    displayOrder: 9,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    providerId: "provider-gmhba",
    name: "GMHBA",
    shortName: "GMHBA",
    phone: "1800 448 000",
    website: "https://www.gmhba.com.au",
    category: "Regional",
    isActive: true,
    displayOrder: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    providerId: "provider-frank",
    name: "Frank Health Insurance",
    shortName: "Frank",
    phone: "1800 422 426",
    website: "https://www.frankhealth.com.au",
    category: "Budget",
    isActive: true,
    displayOrder: 11,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    providerId: "provider-budget-direct",
    name: "Budget Direct Health Insurance",
    shortName: "Budget Direct",
    phone: "1300 267 000",
    website: "https://www.budgetdirect.com.au/health-insurance",
    category: "Budget",
    isActive: true,
    displayOrder: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    providerId: "provider-other",
    name: "Other",
    shortName: "Other",
    phone: "",
    website: "",
    category: "Other",
    isActive: true,
    displayOrder: 99,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function seedPrivateHealthProviders() {
  console.log("🌱 Seeding private health insurance providers...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db(DB_NAME);
    const collection = db.collection("private_health_providers");

    // Check if already seeded
    const existing = await collection.countDocuments();
    if (existing > 0) {
      console.log(`⚠️  Found ${existing} existing health providers`);
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
      console.log("   🗑️  Deleted existing health providers\n");
    }

    // Insert health providers
    await collection.insertMany(healthProviders);

    console.log("✅ Successfully seeded private health providers:\n");

    // Group by category
    const byCategory = healthProviders.reduce((acc: any, provider) => {
      if (!acc[provider.category]) acc[provider.category] = [];
      acc[provider.category].push(provider);
      return acc;
    }, {});

    Object.keys(byCategory).forEach((category) => {
      console.log(`   ${category}:`);
      byCategory[category].forEach((provider: any) => {
        console.log(`     • ${provider.name.padEnd(30)} ${provider.phone}`);
      });
      console.log("");
    });

    console.log(`📊 Total: ${healthProviders.length} health providers`);
    console.log("📦 Collection: private_health_providers");
    console.log("\n✅ Seeding complete!");
  } catch (error) {
    console.error("❌ Error seeding health providers:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedPrivateHealthProviders();
