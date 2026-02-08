// scripts/seed-membership-data-MULTI-LEVEL.js
// Seed member roles and multi-level membership types

const { MongoClient } = require("mongodb");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority";
const DB_NAME = process.env.MONGODB_DB || "hockey-app";

// Default Member Roles (unchanged)
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

// Multi-Level Membership Types
const DEFAULT_MEMBERSHIP_TYPES = [
  // ===== GLOBAL TYPES (Available to all) =====
  {
    typeId: "type-life",
    name: "Life Member",
    description: "Lifetime membership awarded for outstanding service",
    scope: "association",
    associationId: null,
    clubId: null,
    teamId: null,
    minAge: null,
    maxAge: null,
    fees: {
      baseAmount: 0,
      currency: "AUD",
      frequency: "one-time",
      additionalFees: [],
    },
    benefits: [
      "Free membership for life",
      "All senior member privileges",
      "Club honors and recognition",
      "Voting rights",
    ],
    requirements: {},
    active: true,
    displayOrder: 100,
  },

  // ===== ASSOCIATION-LEVEL TYPES =====
  {
    typeId: "type-assoc-junior",
    name: "Association Junior Member",
    description: "Association-level junior registration (under 18)",
    scope: "association",
    associationId: null, // Will be set to actual association when used
    clubId: null,
    teamId: null,
    minAge: 5,
    maxAge: 17,
    fees: {
      baseAmount: 50,
      currency: "AUD",
      frequency: "annual",
      additionalFees: [
        {
          name: "Insurance",
          amount: 25,
          required: true,
          description: "Mandatory insurance for all junior players",
        },
      ],
    },
    benefits: [
      "Association competition eligibility",
      "State-wide tournament access",
      "Insurance coverage",
      "Association newsletter",
    ],
    requirements: {
      parentalConsent: true,
    },
    active: true,
    displayOrder: 1,
  },
  {
    typeId: "type-assoc-senior",
    name: "Association Senior Member",
    description: "Association-level senior registration (18+)",
    scope: "association",
    associationId: null,
    clubId: null,
    teamId: null,
    minAge: 18,
    maxAge: null,
    fees: {
      baseAmount: 100,
      currency: "AUD",
      frequency: "annual",
      additionalFees: [
        {
          name: "Insurance",
          amount: 35,
          required: true,
          description: "Mandatory insurance for all senior players",
        },
      ],
    },
    benefits: [
      "Association competition eligibility",
      "State-wide tournament access",
      "Insurance coverage",
      "Voting rights in association",
    ],
    requirements: {},
    active: true,
    displayOrder: 2,
  },

  // ===== CLUB-LEVEL TYPES =====
  {
    typeId: "type-club-junior",
    name: "Club Junior Member",
    description: "Club membership for juniors (under 18)",
    scope: "club",
    associationId: null,
    clubId: null, // Will be set to actual club when used
    teamId: null,
    minAge: 5,
    maxAge: 17,
    fees: {
      baseAmount: 200,
      currency: "AUD",
      frequency: "annual",
      additionalFees: [
        {
          name: "Club Uniform",
          amount: 60,
          required: true,
          description: "Playing shirt and shorts (first year only)",
        },
        {
          name: "Training Gear",
          amount: 40,
          required: false,
          description: "Optional training bibs and balls",
        },
      ],
    },
    benefits: [
      "Club competition play",
      "Training 2x per week",
      "Club uniform (first year)",
      "Access to club facilities",
    ],
    requirements: {
      parentalConsent: true,
    },
    active: true,
    displayOrder: 10,
  },
  {
    typeId: "type-club-senior",
    name: "Club Senior Member",
    description: "Club membership for seniors (18+)",
    scope: "club",
    associationId: null,
    clubId: null,
    teamId: null,
    minAge: 18,
    maxAge: null,
    fees: {
      baseAmount: 300,
      currency: "AUD",
      frequency: "annual",
      additionalFees: [
        {
          name: "Club Uniform",
          amount: 80,
          required: true,
          description: "Playing shirt and shorts (first year only)",
        },
        {
          name: "Social Membership",
          amount: 50,
          required: false,
          description: "Optional clubhouse bar and social events access",
        },
      ],
    },
    benefits: [
      "Club competition play",
      "Training 2x per week",
      "Club uniform (first year)",
      "Club voting rights",
      "Access to club facilities",
    ],
    requirements: {},
    active: true,
    displayOrder: 11,
  },
  {
    typeId: "type-club-social",
    name: "Club Social Member",
    description: "Non-playing social membership",
    scope: "club",
    associationId: null,
    clubId: null,
    teamId: null,
    minAge: 18,
    maxAge: null,
    fees: {
      baseAmount: 50,
      currency: "AUD",
      frequency: "annual",
      additionalFees: [],
    },
    benefits: [
      "Social events access",
      "Club newsletter",
      "Clubhouse access",
      "Voting rights",
    ],
    requirements: {},
    active: true,
    displayOrder: 12,
  },

  // ===== TEAM-LEVEL TYPES (Representative/Special Teams) =====
  {
    typeId: "type-team-rep-junior",
    name: "Junior Representative Team",
    description: "Additional fee for junior representative team members",
    scope: "team",
    associationId: null,
    clubId: null,
    teamId: null, // Will be set to actual team when used
    minAge: 12,
    maxAge: 17,
    fees: {
      baseAmount: 400,
      currency: "AUD",
      frequency: "seasonal",
      additionalFees: [
        {
          name: "Travel & Accommodation",
          amount: 250,
          required: true,
          description: "Interstate tournament expenses",
        },
        {
          name: "Representative Uniform",
          amount: 120,
          required: true,
          description: "Official representative team uniform",
        },
        {
          name: "Training Camp",
          amount: 180,
          required: false,
          description: "Optional pre-season training camp",
        },
      ],
    },
    benefits: [
      "State-level competition",
      "High-performance coaching",
      "Interstate tournament participation",
      "Representative uniform",
      "Elite training program",
    ],
    requirements: {
      parentalConsent: true,
      medicalClearance: true,
    },
    active: true,
    displayOrder: 20,
  },
  {
    typeId: "type-team-rep-senior",
    name: "Senior Representative Team",
    description: "Additional fee for senior representative team members",
    scope: "team",
    associationId: null,
    clubId: null,
    teamId: null,
    minAge: 18,
    maxAge: null,
    fees: {
      baseAmount: 500,
      currency: "AUD",
      frequency: "seasonal",
      additionalFees: [
        {
          name: "Travel & Accommodation",
          amount: 300,
          required: true,
          description: "Interstate/international tournament expenses",
        },
        {
          name: "Representative Uniform",
          amount: 150,
          required: true,
          description: "Official representative team uniform",
        },
      ],
    },
    benefits: [
      "Elite-level competition",
      "High-performance coaching",
      "Tournament participation",
      "Representative uniform",
      "National exposure",
    ],
    requirements: {
      medicalClearance: true,
    },
    active: true,
    displayOrder: 21,
  },
];

async function seedMembershipData() {
  console.log("🌱 Seeding multi-level membership system data...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db(DB_NAME);

    // Seed Member Roles
    console.log("1️⃣ Seeding Member Roles...");
    const rolesCollection = db.collection("member_roles");
    const existingRoles = await rolesCollection.countDocuments();

    if (existingRoles === 0) {
      await rolesCollection.insertMany(
        DEFAULT_ROLES.map((role) => ({
          ...role,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "system",
        })),
      );
      console.log(`   ✅ Inserted ${DEFAULT_ROLES.length} roles\n`);
    } else {
      console.log(`   ℹ️  Already has ${existingRoles} roles\n`);
    }

    // Seed Membership Types
    console.log("2️⃣ Seeding Multi-Level Membership Types...");
    const typesCollection = db.collection("membership_types");
    const existingTypes = await typesCollection.countDocuments();

    if (existingTypes === 0) {
      await typesCollection.insertMany(
        DEFAULT_MEMBERSHIP_TYPES.map((type) => ({
          ...type,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "system",
        })),
      );
      console.log(
        `   ✅ Inserted ${DEFAULT_MEMBERSHIP_TYPES.length} membership types\n`,
      );

      // Show breakdown
      const global = DEFAULT_MEMBERSHIP_TYPES.filter(
        (t) =>
          t.associationId === null && t.clubId === null && t.teamId === null,
      );
      const association = DEFAULT_MEMBERSHIP_TYPES.filter(
        (t) => t.scope === "association",
      );
      const club = DEFAULT_MEMBERSHIP_TYPES.filter((t) => t.scope === "club");
      const team = DEFAULT_MEMBERSHIP_TYPES.filter((t) => t.scope === "team");

      console.log("   📊 Breakdown:");
      console.log(`      - Global types: ${global.length}`);
      console.log(`      - Association-level: ${association.length}`);
      console.log(`      - Club-level: ${club.length}`);
      console.log(`      - Team-level: ${team.length}\n`);
    } else {
      console.log(`   ℹ️  Already has ${existingTypes} membership types\n`);
    }

    // Initialize member sequence for existing clubs
    console.log("3️⃣ Initializing member sequences...");
    const clubsCollection = db.collection("clubs");
    const clubs = await clubsCollection.find({}).toArray();

    let updated = 0;
    for (const club of clubs) {
      if (!club.memberSequence) {
        await clubsCollection.updateOne(
          { _id: club._id },
          { $set: { memberSequence: 0 } },
        );
        updated++;
      }
    }
    console.log(`   ✅ Initialized sequences for ${updated} clubs\n`);

    console.log("✅ Seeding complete!\n");
    console.log("📊 Summary:");
    console.log(`   - Member Roles: ${DEFAULT_ROLES.length}`);
    console.log(`   - Membership Types: ${DEFAULT_MEMBERSHIP_TYPES.length}`);
    console.log(`   - Clubs with sequences: ${updated}`);
    console.log("\n🎯 Fee Structure Examples:");
    console.log("   Association Junior: $75/year (base $50 + insurance $25)");
    console.log(
      "   Club Junior (first year): $260/year (base $200 + uniform $60)",
    );
    console.log(
      "   Representative Team: $770/season (base $400 + travel $250 + uniform $120)",
    );
    console.log("\n💰 Example Total for Junior Rep Player:");
    console.log("   Association: $75 + Club: $260 + Team: $770 = $1,105/year");
    console.log("\n🚀 Ready to create members and assign membership types!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedMembershipData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
