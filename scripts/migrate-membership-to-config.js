// scripts/migrate-membership-to-config.js
// Migrate member_roles and membership_types to unified config collection

const { MongoClient } = require("mongodb");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority";
const DB_NAME = process.env.MONGODB_DB || "hockey-app";

async function migrateMembershipToConfig() {
  console.log("🔄 Migrating membership data to unified config collection...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db(DB_NAME);

    // Migrate Member Roles
    console.log("1️⃣ Migrating Member Roles...");
    const memberRoles = await db.collection("member_roles").find({}).toArray();

    if (memberRoles.length > 0) {
      const configItems = memberRoles.map((role) => ({
        configType: "member-role",
        id: role.roleId,
        name: role.name,
        description: role.description,
        category: role.category,
        isActive: role.active,
        displayOrder: role.displayOrder,
        usageCount: 0,
        lastUsed: null,
        createdAt: role.createdAt || new Date().toISOString(),
        updatedAt: role.updatedAt || new Date().toISOString(),
        createdBy: role.createdBy || "migration-script",
        updatedBy: null,
        // Store extra fields in metadata
        icon: role.icon,
        color: role.color,
        defaultPermissions: role.defaultPermissions,
        clubId: role.clubId,
      }));

      // Insert into config collection
      for (const item of configItems) {
        const existing = await db.collection("config").findOne({ id: item.id });
        if (!existing) {
          await db.collection("config").insertOne(item);
        }
      }

      console.log(`   ✅ Migrated ${configItems.length} member roles\n`);
    } else {
      console.log("   ℹ️  No member roles to migrate\n");
    }

    // Migrate Membership Types
    console.log("2️⃣ Migrating Membership Types...");
    const membershipTypes = await db
      .collection("membership_types")
      .find({})
      .toArray();

    if (membershipTypes.length > 0) {
      const configItems = membershipTypes.map((type) => ({
        configType: "membership-type",
        id: type.typeId,
        name: type.name,
        description: type.description,
        isActive: type.active,
        displayOrder: type.displayOrder,
        usageCount: 0,
        lastUsed: null,
        createdAt: type.createdAt || new Date().toISOString(),
        updatedAt: type.updatedAt || new Date().toISOString(),
        createdBy: "migration-script",
        updatedBy: null,
        // Store extra fields in metadata
        minAge: type.minAge,
        maxAge: type.maxAge,
        annualFee: type.annualFee,
        currency: type.currency,
        benefits: type.benefits,
        clubId: type.clubId,
      }));

      // Insert into config collection
      for (const item of configItems) {
        const existing = await db.collection("config").findOne({ id: item.id });
        if (!existing) {
          await db.collection("config").insertOne(item);
        }
      }

      console.log(`   ✅ Migrated ${configItems.length} membership types\n`);
    } else {
      console.log("   ℹ️  No membership types to migrate\n");
    }

    console.log("✅ Migration complete!\n");
    console.log("📊 Summary:");

    const memberRoleCount = await db
      .collection("config")
      .countDocuments({ configType: "member-role" });
    const membershipTypeCount = await db
      .collection("config")
      .countDocuments({ configType: "membership-type" });

    console.log(`   - Member Roles in config: ${memberRoleCount}`);
    console.log(`   - Membership Types in config: ${membershipTypeCount}`);

    console.log(
      "\n💡 Note: Original collections (member_roles, membership_types) are still intact.",
    );
    console.log(
      "   You can drop them after verifying the migration worked correctly.",
    );
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

migrateMembershipToConfig()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
