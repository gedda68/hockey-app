// scripts/seed-club-membership-types.ts
// Seed club membership types

import { MongoClient } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority";
const DB_NAME = process.env.DB_NAME || "hockey-app";

const membershipTypes = [
  {
    typeId: "type-junior",
    name: "Junior",
    description: "For players under 18 years",
    basePrice: 150,
    ageRange: { min: 0, max: 17 },
    benefits: [
      "Access to junior competitions",
      "Training sessions",
      "Club uniform",
      "Insurance coverage",
    ],
    isActive: true,
    category: "Playing",
    displayOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    typeId: "type-senior",
    name: "Senior",
    description: "For adult players 18 years and over",
    basePrice: 250,
    ageRange: { min: 18, max: 999 },
    benefits: [
      "Access to senior competitions",
      "Training sessions",
      "Club uniform",
      "Insurance coverage",
      "Voting rights",
    ],
    isActive: true,
    category: "Playing",
    displayOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    typeId: "type-student",
    name: "Student",
    description: "For full-time students (18-25 years)",
    basePrice: 180,
    ageRange: { min: 18, max: 25 },
    benefits: [
      "Access to senior competitions",
      "Training sessions",
      "Discounted uniform",
      "Insurance coverage",
    ],
    isActive: true,
    category: "Playing",
    displayOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    typeId: "type-masters",
    name: "Masters",
    description: "For players 35 years and over",
    basePrice: 200,
    ageRange: { min: 35, max: 999 },
    benefits: [
      "Access to masters competitions",
      "Social hockey events",
      "Insurance coverage",
      "Flexible training",
    ],
    isActive: true,
    category: "Playing",
    displayOrder: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    typeId: "type-family",
    name: "Family",
    description: "For families with 3+ members",
    basePrice: 600,
    ageRange: { min: 0, max: 999 },
    benefits: [
      "Covers up to 5 family members",
      "All competition access",
      "Training sessions",
      "Uniforms included",
      "Insurance coverage",
      "Family social events",
    ],
    isActive: true,
    category: "Playing",
    displayOrder: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    typeId: "type-social",
    name: "Social",
    description: "For non-playing members",
    basePrice: 50,
    ageRange: { min: 0, max: 999 },
    benefits: [
      "Access to club events",
      "Volunteer opportunities",
      "Newsletter subscription",
      "Voting rights",
    ],
    isActive: true,
    category: "Non-Playing",
    displayOrder: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    typeId: "type-coach",
    name: "Coach",
    description: "For club coaches",
    basePrice: 100,
    ageRange: { min: 18, max: 999 },
    benefits: [
      "Coaching accreditation support",
      "Insurance coverage",
      "Training resources",
      "Coaching equipment access",
    ],
    isActive: true,
    category: "Official",
    displayOrder: 7,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    typeId: "type-life",
    name: "Life Member",
    description: "Honorary life membership",
    basePrice: 0,
    ageRange: { min: 0, max: 999 },
    benefits: [
      "Lifetime membership",
      "All club access",
      "Voting rights",
      "Special recognition",
      "Free event entry",
    ],
    isActive: true,
    category: "Honorary",
    displayOrder: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function seedClubMembershipTypes() {
  console.log("🌱 Seeding club membership types...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db(DB_NAME);
    const collection = db.collection("club_membership_types");

    // Check if already seeded
    const existing = await collection.countDocuments();
    if (existing > 0) {
      console.log(`⚠️  Found ${existing} existing membership types`);
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
      console.log("   🗑️  Deleted existing membership types\n");
    }

    // Insert membership types
    await collection.insertMany(membershipTypes);

    console.log("✅ Successfully seeded club membership types:\n");
    membershipTypes.forEach((type) => {
      console.log(
        `   • ${type.name.padEnd(15)} - $${type.basePrice
          .toString()
          .padEnd(3)} (${type.category})`
      );
    });

    console.log(`\n📊 Total: ${membershipTypes.length} membership types`);
    console.log("📦 Collection: club_membership_types");
    console.log("\n✅ Seeding complete!");
  } catch (error) {
    console.error("❌ Error seeding membership types:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedClubMembershipTypes();
