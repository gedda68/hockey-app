// scripts/seed-membership-data.ts
// Initialize member roles and permission levels

import { MongoClient } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority";
const DB_NAME = process.env.DB_NAME || "hockey-app";

// Default Member Roles (what members DO)
const DEFAULT_ROLES = [
  {
    roleId: "role-player",
    name: "Player",
    description: "Active player in competitions",
    category: "Participant",
    clubId: null,
    icon: "🏑",
    color: "#3b82f6",
    defaultPermissions: [
      "view_fixtures",
      "view_results",
      "update_own_availability",
    ],
    active: true,
    displayOrder: 1,
  },
  {
    roleId: "role-coach",
    name: "Coach",
    description: "Team coach or assistant coach",
    category: "Official",
    clubId: null,
    icon: "👨‍🏫",
    color: "#10b981",
    defaultPermissions: ["view_all_fixtures", "edit_own_team", "message_team"],
    active: true,
    displayOrder: 2,
  },
  {
    roleId: "role-manager",
    name: "Team Manager",
    description: "Team manager or coordinator",
    category: "Official",
    clubId: null,
    icon: "📋",
    color: "#8b5cf6",
    defaultPermissions: ["view_team", "message_team", "manage_team_admin"],
    active: true,
    displayOrder: 3,
  },
  {
    roleId: "role-umpire",
    name: "Umpire",
    description: "Registered umpire",
    category: "Official",
    clubId: null,
    icon: "⚖️",
    color: "#f59e0b",
    defaultPermissions: ["view_all_fixtures", "submit_match_reports"],
    active: true,
    displayOrder: 4,
  },
  {
    roleId: "role-volunteer",
    name: "Volunteer",
    description: "General volunteer",
    category: "Support",
    clubId: null,
    icon: "🙋",
    color: "#06b6d4",
    defaultPermissions: ["view_club_info"],
    active: true,
    displayOrder: 5,
  },
  {
    roleId: "role-committee",
    name: "Committee Member",
    description: "Club committee member",
    category: "Administrator",
    clubId: null,
    icon: "👔",
    color: "#ef4444",
    defaultPermissions: ["view_club_admin", "view_members"],
    active: true,
    displayOrder: 6,
  },
  {
    roleId: "role-parent",
    name: "Parent/Guardian",
    description: "Parent or guardian of junior member",
    category: "Support",
    clubId: null,
    icon: "👨‍👩‍👧",
    color: "#ec4899",
    defaultPermissions: ["view_child_info", "update_child_availability"],
    active: true,
    displayOrder: 7,
  },
  {
    roleId: "role-social",
    name: "Social Member",
    description: "Social or non-playing member",
    category: "Support",
    clubId: null,
    icon: "🎉",
    color: "#a855f7",
    defaultPermissions: ["view_club_events"],
    active: true,
    displayOrder: 8,
  },
];

// Default Permission Levels (what users can ACCESS)
const DEFAULT_PERMISSION_LEVELS = [
  {
    levelId: "level-viewer",
    name: "Viewer",
    rank: 10,
    description: "Can view public information",
    capabilities: ["view_fixtures", "view_results", "view_ladder"],
    inheritsFrom: null,
    active: true,
  },
  {
    levelId: "level-player",
    name: "Player",
    rank: 20,
    description: "Can view and update own information",
    capabilities: [
      "view_fixtures",
      "view_results",
      "view_team_info",
      "update_own_availability",
      "view_own_stats",
    ],
    inheritsFrom: "level-viewer",
    active: true,
  },
  {
    levelId: "level-coach",
    name: "Coach",
    rank: 30,
    description: "Can manage assigned teams",
    capabilities: [
      "view_all_teams",
      "edit_own_team",
      "message_team",
      "view_team_stats",
      "submit_team_sheet",
    ],
    inheritsFrom: "level-player",
    active: true,
  },
  {
    levelId: "level-club-admin",
    name: "Club Admin",
    rank: 40,
    description: "Can manage club members and teams",
    capabilities: [
      "manage_members",
      "manage_teams",
      "view_club_reports",
      "edit_club_info",
      "message_all_members",
    ],
    inheritsFrom: "level-coach",
    active: true,
  },
  {
    levelId: "level-super-admin",
    name: "Super Admin",
    rank: 50,
    description: "Full system access",
    capabilities: ["*"],
    inheritsFrom: null,
    active: true,
  },
];

// Default Membership Types
const DEFAULT_MEMBERSHIP_TYPES = [
  {
    typeId: "type-junior",
    clubId: null,
    name: "Junior",
    description: "Under 18 years old",
    minAge: 0,
    maxAge: 17,
    annualFee: 150,
    currency: "AUD",
    benefits: ["Competition play", "Training access", "Club uniform"],
    active: true,
    displayOrder: 1,
  },
  {
    typeId: "type-senior",
    clubId: null,
    name: "Senior",
    description: "18 years and over",
    minAge: 18,
    maxAge: null,
    annualFee: 300,
    currency: "AUD",
    benefits: [
      "Competition play",
      "Training access",
      "Club uniform",
      "Voting rights",
    ],
    active: true,
    displayOrder: 2,
  },
  {
    typeId: "type-social",
    clubId: null,
    name: "Social",
    description: "Non-playing member",
    minAge: 18,
    maxAge: null,
    annualFee: 50,
    currency: "AUD",
    benefits: ["Social events", "Newsletter", "Voting rights"],
    active: true,
    displayOrder: 3,
  },
  {
    typeId: "type-life",
    clubId: null,
    name: "Life Member",
    description: "Lifetime membership awarded for service",
    minAge: null,
    maxAge: null,
    annualFee: 0,
    currency: "AUD",
    benefits: [
      "All senior benefits",
      "Free membership for life",
      "Club honors",
    ],
    active: true,
    displayOrder: 4,
  },
];

// Default Capabilities
const DEFAULT_CAPABILITIES = [
  // View capabilities
  {
    capabilityId: "cap-view-fixtures",
    name: "view_fixtures",
    displayName: "View Fixtures",
    description: "View match fixtures",
    category: "View",
    resource: "fixture",
    active: true,
  },
  {
    capabilityId: "cap-view-results",
    name: "view_results",
    displayName: "View Results",
    description: "View match results",
    category: "View",
    resource: "result",
    active: true,
  },
  {
    capabilityId: "cap-view-team",
    name: "view_team_info",
    displayName: "View Team Info",
    description: "View team information",
    category: "View",
    resource: "team",
    active: true,
  },
  {
    capabilityId: "cap-view-members",
    name: "view_members",
    displayName: "View Members",
    description: "View member directory",
    category: "View",
    resource: "member",
    active: true,
  },

  // Edit capabilities
  {
    capabilityId: "cap-edit-team",
    name: "edit_own_team",
    displayName: "Edit Team",
    description: "Edit assigned team",
    category: "Edit",
    resource: "team",
    active: true,
  },
  {
    capabilityId: "cap-edit-availability",
    name: "update_own_availability",
    displayName: "Update Availability",
    description: "Update own availability",
    category: "Edit",
    resource: "availability",
    active: true,
  },

  // Manage capabilities
  {
    capabilityId: "cap-manage-members",
    name: "manage_members",
    displayName: "Manage Members",
    description: "Add/edit/remove members",
    category: "Manage",
    resource: "member",
    active: true,
  },
  {
    capabilityId: "cap-manage-teams",
    name: "manage_teams",
    displayName: "Manage Teams",
    description: "Create and manage teams",
    category: "Manage",
    resource: "team",
    active: true,
  },

  // Admin capabilities
  {
    capabilityId: "cap-club-admin",
    name: "edit_club_info",
    displayName: "Edit Club Info",
    description: "Edit club information",
    category: "Admin",
    resource: "club",
    active: true,
  },
];

async function seedMembershipData() {
  console.log("🌱 Seeding membership system data...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const database = client.db(DB_NAME);

    // Seed Member Roles
    console.log("1️⃣ Seeding Member Roles...");
    const rolesCollection = database.collection("member_roles");
    const existingRoles = await rolesCollection.countDocuments();

    if (existingRoles === 0) {
      await rolesCollection.insertMany(
        DEFAULT_ROLES.map((role) => ({
          ...role,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "system",
        }))
      );
      console.log(`   ✅ Inserted ${DEFAULT_ROLES.length} roles\n`);
    } else {
      console.log(`   ℹ️  Already has ${existingRoles} roles\n`);
    }

    // Seed Permission Levels
    console.log("2️⃣ Seeding Permission Levels...");
    const permissionsCollection = database.collection("permission_levels");
    const existingPermissions = await permissionsCollection.countDocuments();

    if (existingPermissions === 0) {
      await permissionsCollection.insertMany(
        DEFAULT_PERMISSION_LEVELS.map((level) => ({
          ...level,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
      );
      console.log(
        `   ✅ Inserted ${DEFAULT_PERMISSION_LEVELS.length} permission levels\n`
      );
    } else {
      console.log(
        `   ℹ️  Already has ${existingPermissions} permission levels\n`
      );
    }

    // Seed Membership Types
    console.log("3️⃣ Seeding Membership Types...");
    const typesCollection = database.collection("membership_types");
    const existingTypes = await typesCollection.countDocuments();

    if (existingTypes === 0) {
      await typesCollection.insertMany(
        DEFAULT_MEMBERSHIP_TYPES.map((type) => ({
          ...type,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
      );
      console.log(
        `   ✅ Inserted ${DEFAULT_MEMBERSHIP_TYPES.length} membership types\n`
      );
    } else {
      console.log(`   ℹ️  Already has ${existingTypes} membership types\n`);
    }

    // Seed Capabilities
    console.log("4️⃣ Seeding Capabilities...");
    const capabilitiesCollection = database.collection("capabilities");
    const existingCapabilities = await capabilitiesCollection.countDocuments();

    if (existingCapabilities === 0) {
      await capabilitiesCollection.insertMany(
        DEFAULT_CAPABILITIES.map((cap) => ({
          ...cap,
          createdAt: new Date().toISOString(),
        }))
      );
      console.log(
        `   ✅ Inserted ${DEFAULT_CAPABILITIES.length} capabilities\n`
      );
    } else {
      console.log(`   ℹ️  Already has ${existingCapabilities} capabilities\n`);
    }

    // Initialize member sequence for existing clubs
    console.log("5️⃣ Initializing member sequences...");
    const clubsCollection = database.collection("clubs");
    const clubs = await clubsCollection.find({}).toArray();

    let updated = 0;
    for (const club of clubs) {
      if (!club.memberSequence) {
        await clubsCollection.updateOne(
          { _id: club._id },
          { $set: { memberSequence: 0 } }
        );
        updated++;
      }
    }
    console.log(`   ✅ Initialized sequences for ${updated} clubs\n`);

    console.log("✅ Seeding complete!\n");
    console.log("📊 Summary:");
    console.log(`   - Member Roles: ${DEFAULT_ROLES.length}`);
    console.log(`   - Permission Levels: ${DEFAULT_PERMISSION_LEVELS.length}`);
    console.log(`   - Membership Types: ${DEFAULT_MEMBERSHIP_TYPES.length}`);
    console.log(`   - Capabilities: ${DEFAULT_CAPABILITIES.length}`);
    console.log("\n🚀 Ready to create members!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedMembershipData();
