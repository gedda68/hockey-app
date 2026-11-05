// scripts/migrate-add-membership-dates.js
// Migration script to add membership period dates to existing members
// Run with: node scripts/migrate-add-membership-dates.js

const { MongoClient } = require("mongodb");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/hockey-app";
const DB_NAME = "hockey-app"; // Change to your database name

async function migrate() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(DB_NAME);
    const collection = db.collection("members");

    // Get current year for default dates
    const currentYear = new Date().getFullYear();
    const defaultPeriodStart = `${currentYear}-01-01`;
    const defaultPeriodEnd = `${currentYear}-12-31`;

    console.log(
      `📅 Using default period: ${defaultPeriodStart} to ${defaultPeriodEnd}`,
    );

    // Count members that need migration
    const countToMigrate = await collection.countDocuments({
      $or: [
        { "membership.currentPeriodStart": { $exists: false } },
        { "membership.currentPeriodEnd": { $exists: false } },
        { "membership.renewalHistory": { $exists: false } },
      ],
    });

    console.log(`📊 Found ${countToMigrate} members to migrate`);

    if (countToMigrate === 0) {
      console.log("✨ No members need migration. All done!");
      return;
    }

    // Perform migration
    const result = await collection.updateMany(
      {
        $or: [
          { "membership.currentPeriodStart": { $exists: false } },
          { "membership.currentPeriodEnd": { $exists: false } },
          { "membership.renewalHistory": { $exists: false } },
        ],
      },
      [
        {
          $set: {
            "membership.currentPeriodStart": {
              $cond: {
                if: { $ne: ["$membership.currentPeriodStart", null] },
                then: "$membership.currentPeriodStart",
                else: defaultPeriodStart,
              },
            },
            "membership.currentPeriodEnd": {
              $cond: {
                if: { $ne: ["$membership.currentPeriodEnd", null] },
                then: "$membership.currentPeriodEnd",
                else: defaultPeriodEnd,
              },
            },
            "membership.renewalHistory": {
              $cond: {
                if: { $isArray: "$membership.renewalHistory" },
                then: "$membership.renewalHistory",
                else: [],
              },
            },
            updatedAt: new Date().toISOString(),
          },
        },
      ],
    );

    console.log(`✅ Migration complete!`);
    console.log(`   - Matched: ${result.matchedCount}`);
    console.log(`   - Modified: ${result.modifiedCount}`);

    // Verify migration
    const verifyCount = await collection.countDocuments({
      "membership.currentPeriodStart": { $exists: true },
      "membership.currentPeriodEnd": { $exists: true },
      "membership.renewalHistory": { $exists: true },
    });

    console.log(
      `✨ Verified: ${verifyCount} members now have membership dates`,
    );

    // Show sample of migrated data
    const sample = await collection.findOne(
      {
        "membership.currentPeriodStart": defaultPeriodStart,
      },
      {
        projection: {
          memberId: 1,
          "personalInfo.firstName": 1,
          "personalInfo.lastName": 1,
          membership: 1,
        },
      },
    );

    if (sample) {
      console.log("\n📄 Sample migrated member:");
      console.log(JSON.stringify(sample, null, 2));
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await client.close();
    console.log("\n👋 Database connection closed");
  }
}

// Run migration
console.log("🚀 Starting membership dates migration...\n");
migrate()
  .then(() => {
    console.log("\n✅ Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  });
