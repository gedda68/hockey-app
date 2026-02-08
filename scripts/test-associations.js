// scripts/test-associations.js
// Quick test to verify association hierarchy

const { MongoClient } = require("mongodb");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority";
const DB_NAME = process.env.MONGODB_DB || "hockey-app";

async function testAssociations() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    console.log("🔍 Testing Association Hierarchy\n");

    // Test 1: Find all associations
    console.log("=== ALL ASSOCIATIONS ===");
    const all = await db.collection("associations").find({}).toArray();
    console.log(`Total: ${all.length}`);
    all.forEach((a) => {
      console.log(
        `  ${a.name} (${a.code}) - Level ${a.level}, Parent: ${a.parentAssociationId || "None"}`,
      );
    });

    console.log("\n=== LEVEL 0 (National) ===");
    const level0 = await db
      .collection("associations")
      .find({ level: 0, status: "active" })
      .toArray();
    console.log(`Count: ${level0.length}`);
    level0.forEach((a) => {
      console.log(`  ✓ ${a.name} (${a.associationId})`);
    });

    console.log("\n=== LEVEL 1 (Sub-National) ===");
    const level1 = await db
      .collection("associations")
      .find({ level: 1, status: "active" })
      .toArray();
    console.log(`Count: ${level1.length}`);
    if (level1.length === 0) {
      console.log("  (Empty - Level 1 reserved for Masters/Indoor)");
    } else {
      level1.forEach((a) => {
        console.log(
          `  ✓ ${a.name} (${a.associationId}), Parent: ${a.parentAssociationId}`,
        );
      });
    }

    console.log("\n=== LEVEL 2 (State) ===");
    const level2 = await db
      .collection("associations")
      .find({ level: 2, status: "active" })
      .toArray();
    console.log(`Count: ${level2.length}`);
    level2.forEach((a) => {
      console.log(
        `  ✓ ${a.name} (${a.associationId}), Parent: ${a.parentAssociationId}`,
      );
    });

    // Check if Level 2 points to National (ha)
    const level2WithNationalParent = await db
      .collection("associations")
      .find({
        level: 2,
        parentAssociationId: "ha",
        status: "active",
      })
      .toArray();
    console.log(
      `\n  → Level 2 with National parent: ${level2WithNationalParent.length}`,
    );
    level2WithNationalParent.forEach((a) => {
      console.log(`    ${a.name} (${a.associationId})`);
    });

    console.log("\n=== LEVEL 3 (City) ===");
    const level3 = await db
      .collection("associations")
      .find({ level: 3, status: "active" })
      .toArray();
    console.log(`Count: ${level3.length}`);
    level3.forEach((a) => {
      console.log(
        `  ✓ ${a.name} (${a.associationId}), Parent: ${a.parentAssociationId}`,
      );
    });

    console.log("\n=== RECOMMENDED FIX ===");
    if (level2WithNationalParent.length > 0) {
      console.log(
        "✅ Your Level 2 (State) associations point directly to National (ha)",
      );
      console.log(
        "✅ API should query: level=2&parentId=ha (not level=1&parentId=ha)",
      );
      console.log(
        "\nThe wizard is correct - it checks Level 1, finds nothing, then fetches Level 2.",
      );
      console.log("Make sure your API endpoint is working correctly!");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

testAssociations();
