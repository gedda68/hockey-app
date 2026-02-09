// scripts/seed-config.ts
// Script to seed initial configuration data into MongoDB

import { MongoClient } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority";
const DB_NAME = "hockey-app"; // Replace with your database name

const configData = [
  {
    configType: "role",
    id: "role-player",
    name: "Player",
    description: "Plays hockey in competitions",
    category: "Participant",
    icon: "🏑",
    color: "#3b82f6",
    clubId: null,
    isActive: true,
    displayOrder: 1,
    usageCount: 0,
    createdAt: "2026-01-25T10:14:03.245Z",
    updatedAt: "2026-01-25T10:14:03.246Z",
  },
  {
    configType: "role",
    id: "role-junior-player",
    name: "Junior Player",
    description: "Youth player under 18",
    category: "Participant",
    icon: "🎯",
    color: "#10b981",
    clubId: null,
    isActive: true,
    displayOrder: 2,
    usageCount: 0,
    createdAt: "2026-01-25T10:14:03.246Z",
    updatedAt: "2026-01-25T10:14:03.246Z",
  },
  {
    configType: "role",
    id: "role-social-player",
    name: "Social Player",
    description: "Plays in social competitions",
    category: "Participant",
    icon: "🏃",
    color: "#8b5cf6",
    clubId: null,
    isActive: true,
    displayOrder: 3,
    usageCount: 0,
    createdAt: "2026-01-25T10:14:03.246Z",
    updatedAt: "2026-01-25T10:14:03.246Z",
  },
  {
    configType: "role",
    id: "role-coach",
    name: "Coach",
    description: "Coaches and trains teams",
    category: "Official",
    icon: "👨‍🏫",
    color: "#f59e0b",
    clubId: null,
    isActive: true,
    displayOrder: 4,
    usageCount: 0,
    createdAt: "2026-01-25T10:14:03.246Z",
    updatedAt: "2026-01-25T10:14:03.246Z",
  },
  {
    configType: "role",
    id: "role-team-manager",
    name: "Team Manager",
    description: "Manages team logistics and administration",
    category: "Official",
    icon: "📋",
    color: "#ef4444",
    clubId: null,
    isActive: true,
    displayOrder: 5,
    usageCount: 0,
    createdAt: "2026-01-25T10:14:03.246Z",
    updatedAt: "2026-01-25T10:14:03.246Z",
  },
  {
    configType: "role",
    id: "role-umpire",
    name: "Umpire",
    description: "Officiates hockey matches",
    category: "Official",
    icon: "⚖️",
    color: "#6366f1",
    clubId: null,
    isActive: true,
    displayOrder: 6,
    usageCount: 0,
    createdAt: "2026-01-25T10:14:03.246Z",
    updatedAt: "2026-01-25T10:14:03.246Z",
  },
  {
    configType: "role",
    id: "role-committee-member",
    name: "Committee Member",
    description: "Club committee member",
    category: "Administrator",
    icon: "👔",
    color: "#0891b2",
    clubId: null,
    isActive: true,
    displayOrder: 7,
    usageCount: 0,
    createdAt: "2026-01-25T10:14:03.246Z",
    updatedAt: "2026-01-25T10:14:03.246Z",
  },
  {
    configType: "role",
    id: "role-president",
    name: "President",
    description: "Club president",
    category: "Administrator",
    icon: "🎖️",
    color: "#dc2626",
    clubId: null,
    isActive: true,
    displayOrder: 8,
    usageCount: 0,
    createdAt: "2026-01-25T10:14:03.246Z",
    updatedAt: "2026-01-25T10:14:03.246Z",
  },
  {
    configType: "role",
    id: "role-treasurer",
    name: "Treasurer",
    description: "Manages club finances",
    category: "Administrator",
    icon: "💰",
    color: "#059669",
    clubId: null,
    isActive: true,
    displayOrder: 9,
    usageCount: 0,
    createdAt: "2026-01-25T10:14:03.246Z",
    updatedAt: "2026-01-25T10:14:03.246Z",
  },
  {
    configType: "role",
    id: "role-secretary",
    name: "Secretary",
    description: "Club secretary",
    category: "Administrator",
    icon: "📝",
    color: "#7c3aed",
    clubId: null,
    isActive: true,
    displayOrder: 10,
    usageCount: 0,
    createdAt: "2026-01-25T10:14:03.246Z",
    updatedAt: "2026-01-25T10:14:03.246Z",
  },
  {
    configType: "role",
    id: "role-volunteer",
    name: "Volunteer",
    description: "Helps with club activities",
    category: "Support",
    icon: "🙋",
    color: "#ec4899",
    clubId: null,
    isActive: true,
    displayOrder: 11,
    usageCount: 0,
    createdAt: "2026-01-25T10:14:03.246Z",
    updatedAt: "2026-01-25T10:14:03.246Z",
  },
  {
    configType: "role",
    id: "role-parent-guardian",
    name: "Parent/Guardian",
    description: "Parent or guardian of a player",
    category: "Support",
    icon: "👨‍👩‍👧",
    color: "#14b8a6",
    clubId: null,
    isActive: true,
    displayOrder: 12,
    usageCount: 0,
    createdAt: "2026-01-25T10:14:03.246Z",
    updatedAt: "2026-01-25T10:14:03.246Z",
  },
  {
    configType: "role",
    id: "role-social-member",
    name: "Social Member",
    description: "Non-playing social member",
    category: "Support",
    icon: "🎉",
    color: "#f97316",
    clubId: null,
    isActive: true,
    displayOrder: 13,
    usageCount: 0,
    createdAt: "2026-01-25T10:14:03.246Z",
    updatedAt: "2026-01-25T10:14:03.246Z",
  },
  {
    configType: "role",
    id: "role-life-member",
    name: "Life Member",
    description: "Honorary life member",
    category: "Support",
    icon: "⭐",
    color: "#eab308",
    clubId: null,
    isActive: true,
    displayOrder: 14,
    usageCount: 0,
    createdAt: "2026-01-25T10:14:03.246Z",
    updatedAt: "2026-01-25T10:14:03.246Z",
  },
];

async function seedConfig() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(DB_NAME);
    const collection = db.collection("config");

    // Clear existing config data (optional - remove if you want to keep existing data)
    // await collection.deleteMany({});
    // console.log("Cleared existing config data");

    // Insert config data with timestamps
    const configWithTimestamps = configData.map((config) => ({
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await collection.insertMany(configWithTimestamps);
    console.log(`Inserted ${result.insertedCount} config items`);

    // Create indexes for better query performance
    await collection.createIndex(
      { configType: 1, configKey: 1 },
      { unique: true },
    );
    await collection.createIndex({ configType: 1, displayOrder: 1 });
    await collection.createIndex({ isActive: 1 });
    console.log("Created indexes");

    console.log("✅ Config seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding config:", error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run the seed function
seedConfig()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
