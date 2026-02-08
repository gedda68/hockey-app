// scripts/migrate-to-unified-config.js
// Migration script: Multiple collections → Single config collection
// Run with: node scripts/migrate-to-unified-config.js

const { MongoClient } = require("mongodb");

// MongoDB connection
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority";
const DATABASE_NAME = process.env.MONGODB_DB || "hockey-app";

// Single collection name
const NEW_COLLECTION = "config";

// Mapping of old collection names to new configType values
const MIGRATION_MAP = [
  {
    oldCollection: "config_genders",
    configType: "gender",
    idField: "genderId",
  },
  {
    oldCollection: "config_relationships",
    configType: "relationship-type",
    idField: "relationshipTypeId",
  },
  {
    oldCollection: "config_salutations",
    configType: "salutation",
    idField: "salutationId",
  },
  {
    oldCollection: "config_fee_category",
    configType: "fee-category",
    idField: "feeCategoryId",
  },
  {
    oldCollection: "config_roles",
    configType: "role-type",
    idField: "roleTypeId",
  },
  {
    oldCollection: "config_skill_level",
    configType: "skill-level",
    idField: "skillLevelId",
  },
  {
    oldCollection: "membership_types",
    configType: "membership-type",
    idField: "membershipTypeId",
  },
];

async function migrateToUnifiedConfig() {
  console.log("🚀 Starting migration to unified config collection...\n");

  let client;

  try {
    // Connect to MongoDB
    console.log("🔌 Connecting to MongoDB...");
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db(DATABASE_NAME);

    // Step 1: Create new collection and indexes
    console.log("📋 Step 1: Creating unified config collection...");

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);
    const configExists = collectionNames.includes(NEW_COLLECTION);

    if (!configExists) {
      await db.createCollection(NEW_COLLECTION);
      console.log('✅ Created "config" collection');
    } else {
      console.log('ℹ️  "config" collection already exists');
    }

    // Create indexes
    console.log("📑 Creating indexes...");

    try {
      await db
        .collection(NEW_COLLECTION)
        .createIndex(
          { configType: 1, displayOrder: 1 },
          { name: "configType_displayOrder" }
        );
      console.log("✅ Created index: configType + displayOrder");
    } catch (e) {
      console.log("ℹ️  Index configType_displayOrder already exists");
    }

    try {
      await db
        .collection(NEW_COLLECTION)
        .createIndex({ id: 1 }, { unique: true, name: "id_unique" });
      console.log("✅ Created index: id (unique)");
    } catch (e) {
      console.log("ℹ️  Index id_unique already exists");
    }

    try {
      await db
        .collection(NEW_COLLECTION)
        .createIndex(
          { configType: 1, name: 1 },
          { unique: true, name: "configType_name_unique" }
        );
      console.log("✅ Created index: configType + name (unique)");
    } catch (e) {
      console.log("ℹ️  Index configType_name_unique already exists");
    }

    try {
      await db
        .collection(NEW_COLLECTION)
        .createIndex(
          { configType: 1, isActive: 1 },
          { name: "configType_isActive" }
        );
      console.log("✅ Created index: configType + isActive\n");
    } catch (e) {
      console.log("ℹ️  Index configType_isActive already exists\n");
    }

    // Step 2: Migrate data from each old collection
    console.log("📦 Step 2: Migrating data...\n");

    let totalMigrated = 0;

    for (const mapping of MIGRATION_MAP) {
      const { oldCollection, configType, idField } = mapping;

      console.log(
        `📂 Migrating ${oldCollection} → configType: "${configType}"`
      );

      // Check if old collection exists
      const oldExists = collectionNames.includes(oldCollection);
      if (!oldExists) {
        console.log(
          `   ⚠️  Collection "${oldCollection}" does not exist, skipping...\n`
        );
        continue;
      }

      // Get all items from old collection
      const items = await db.collection(oldCollection).find({}).toArray();
      console.log(`   Found ${items.length} items`);

      if (items.length === 0) {
        console.log(`   ℹ️  No items to migrate\n`);
        continue;
      }

      // Transform and insert into new collection
      let migrated = 0;
      let skipped = 0;
      let errors = 0;

      for (const item of items) {
        try {
          // Extract the old ID
          const oldId = item[idField] || item.id || item._id.toString();

          // Check if already migrated
          const existing = await db
            .collection(NEW_COLLECTION)
            .findOne({ id: oldId });
          if (existing) {
            skipped++;
            continue;
          }

          // Create unified document
          const unifiedItem = {
            configType, // ← New field for single collection
            id: oldId, // Keep original ID

            // Core fields
            name: item.name,
            code: item.code || null,
            description: item.description || null,

            // Status
            isActive: item.isActive !== undefined ? item.isActive : true,
            displayOrder: item.displayOrder || 0,

            // Usage tracking
            usageCount: item.usageCount || 0,
            lastUsed: item.lastUsed || null,

            // Audit fields
            createdAt: item.createdAt || new Date(),
            updatedAt: item.updatedAt || new Date(),
            createdBy: item.createdBy || "migration-script",
            updatedBy: item.updatedBy || null,
          };

          await db.collection(NEW_COLLECTION).insertOne(unifiedItem);
          migrated++;
        } catch (error) {
          console.error(
            `   ❌ Error migrating item ${item.name}:`,
            error.message
          );
          errors++;
        }
      }

      const summary = `   ✅ Migrated ${migrated} items`;
      const details = [];
      if (skipped > 0) details.push(`skipped ${skipped} duplicates`);
      if (errors > 0) details.push(`${errors} errors`);
      console.log(
        summary + (details.length > 0 ? `, ${details.join(", ")}` : "") + "\n"
      );

      totalMigrated += migrated;
    }

    // Step 3: Verify migration
    console.log("🔍 Step 3: Verifying migration...\n");

    for (const mapping of MIGRATION_MAP) {
      const { configType } = mapping;
      const count = await db
        .collection(NEW_COLLECTION)
        .countDocuments({ configType });
      console.log(`   ${configType.padEnd(20)} → ${count} items`);
    }

    const totalCount = await db.collection(NEW_COLLECTION).countDocuments({});
    console.log(`\n   Total items in unified collection: ${totalCount}`);

    console.log("\n✅ Migration completed successfully!");
    console.log(`\n📊 Summary:`);
    console.log(`   - Migrated ${totalMigrated} items`);
    console.log(`   - Collection: ${NEW_COLLECTION}`);
    console.log(`   - Database: ${DATABASE_NAME}`);

    // Show usage stats
    console.log("\n📊 Usage Statistics:\n");

    const stats = await db
      .collection(NEW_COLLECTION)
      .aggregate([
        {
          $group: {
            _id: "$configType",
            total: { $sum: 1 },
            active: { $sum: { $cond: ["$isActive", 1, 0] } },
            inactive: { $sum: { $cond: ["$isActive", 0, 1] } },
            totalUsage: { $sum: "$usageCount" },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    console.log("Type                     Total  Active  Inactive  Usage");
    console.log("─".repeat(60));

    for (const stat of stats) {
      console.log(
        `${stat._id.padEnd(20)}  ${String(stat.total).padStart(5)}  ` +
          `${String(stat.active).padStart(6)}  ${String(stat.inactive).padStart(8)}  ` +
          `${String(stat.totalUsage).padStart(6)}`
      );
    }

    console.log("\n⚠️  IMPORTANT NEXT STEPS:");
    console.log("   1. Test the new API endpoints");
    console.log("   2. Verify all config types work correctly");
    console.log("   3. Once confirmed, you can drop the old collections:");
    console.log("      - db.config_gender.drop()");
    console.log("      - db.config_salutation.drop()");
    console.log("      - etc.\n");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log("🔌 Disconnected from MongoDB\n");
    }
  }
}

// Run migration
migrateToUnifiedConfig()
  .then(() => {
    console.log("✅ Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Migration script failed:", error);
    process.exit(1);
  });
