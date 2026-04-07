// scripts/seed-club-roles.ts
// Seed club roles

import { MongoClient } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority";
const DB_NAME = process.env.DB_NAME || "hockey-app";

const clubRoles = [
  // PARTICIPANT
  {
    roleId: "role-player",
    name: "Player",
    description: "Plays hockey in competitions",
    category: "Participant",
    icon: "🏑",
    color: "#3b82f6",
    clubId: null, // Global role
    isActive: true,
    displayOrder: 1,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    roleId: "role-junior-player",
    name: "Junior Player",
    description: "Youth player under 18",
    category: "Participant",
    icon: "🎯",
    color: "#10b981",
    clubId: null,
    isActive: true,
    displayOrder: 2,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    roleId: "role-social-player",
    name: "Social Player",
    description: "Plays in social competitions",
    category: "Participant",
    icon: "🏃",
    color: "#8b5cf6",
    clubId: null,
    isActive: true,
    displayOrder: 3,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // OFFICIAL
  {
    roleId: "role-coach",
    name: "Coach",
    description: "Coaches and trains teams",
    category: "Official",
    icon: "👨‍🏫",
    color: "#f59e0b",
    clubId: null,
    isActive: true,
    displayOrder: 4,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    roleId: "role-team-manager",
    name: "Team Manager",
    description: "Manages team logistics and administration",
    category: "Official",
    icon: "📋",
    color: "#ef4444",
    clubId: null,
    isActive: true,
    displayOrder: 5,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    roleId: "role-umpire",
    name: "Umpire",
    description: "Officiates hockey matches",
    category: "Official",
    icon: "⚖️",
    color: "#6366f1",
    clubId: null,
    isActive: true,
    displayOrder: 6,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ADMINISTRATOR
  {
    roleId: "role-committee-member",
    name: "Committee Member",
    description: "Club committee member",
    category: "Administrator",
    icon: "👔",
    color: "#0891b2",
    clubId: null,
    isActive: true,
    displayOrder: 7,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    roleId: "role-president",
    name: "President",
    description: "Club president",
    category: "Administrator",
    icon: "🎖️",
    color: "#dc2626",
    clubId: null,
    isActive: true,
    displayOrder: 8,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    roleId: "role-treasurer",
    name: "Treasurer",
    description: "Manages club finances",
    category: "Administrator",
    icon: "💰",
    color: "#059669",
    clubId: null,
    isActive: true,
    displayOrder: 9,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    roleId: "role-secretary",
    name: "Secretary",
    description: "Club secretary",
    category: "Administrator",
    icon: "📝",
    color: "#7c3aed",
    clubId: null,
    isActive: true,
    displayOrder: 10,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // SUPPORT
  {
    roleId: "role-volunteer",
    name: "Volunteer",
    description: "Helps with club activities",
    category: "Support",
    icon: "🙋",
    color: "#ec4899",
    clubId: null,
    isActive: true,
    displayOrder: 11,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    roleId: "role-parent-guardian",
    name: "Parent/Guardian",
    description: "Parent or guardian of a player",
    category: "Support",
    icon: "👨‍👩‍👧",
    color: "#14b8a6",
    clubId: null,
    isActive: true,
    displayOrder: 12,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    roleId: "role-social-member",
    name: "Social Member",
    description: "Non-playing social member",
    category: "Support",
    icon: "🎉",
    color: "#f97316",
    clubId: null,
    isActive: true,
    displayOrder: 13,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    roleId: "role-life-member",
    name: "Life Member",
    description: "Honorary life member",
    category: "Support",
    icon: "⭐",
    color: "#eab308",
    clubId: null,
    isActive: true,
    displayOrder: 14,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function seedClubRoles() {
  console.log("🌱 Seeding club roles...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db(DB_NAME);
    const collection = db.collection("club_roles");

    // Check if already seeded
    const existing = await collection.countDocuments();
    if (existing > 0) {
      console.log(`⚠️  Found ${existing} existing club roles`);
      console.log("   Delete them first or skip seeding\n");

      const readline = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>((resolve) => {
        readline.question("   Continue and replace? (y/n): ", resolve);
      });
      readline.close();

      if (answer.trim().toLowerCase() !== "y") {
        console.log("\n❌ Seeding cancelled");
        return;
      }

      await collection.deleteMany({});
      console.log("   🗑️  Deleted existing club roles\n");
    }

    // Insert club roles
    await collection.insertMany(clubRoles);

    console.log("✅ Successfully seeded club roles:\n");

    // Group by category
    const byCategory = clubRoles.reduce((acc: any, role) => {
      if (!acc[role.category]) acc[role.category] = [];
      acc[role.category].push(role);
      return acc;
    }, {});

    Object.keys(byCategory).forEach((category) => {
      console.log(`   ${category}:`);
      byCategory[category].forEach((role: any) => {
        console.log(`     ${role.icon} ${role.name}`);
      });
      console.log("");
    });

    console.log(`📊 Total: ${clubRoles.length} club roles`);
    console.log("📦 Collection: club_roles");
    console.log("\n✅ Seeding complete!");
  } catch (error) {
    console.error("❌ Error seeding club roles:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedClubRoles();
