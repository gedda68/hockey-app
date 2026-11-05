// scripts/create-team-indexes.js
// Script to create MongoDB indexes for team collections

const { MongoClient } = require("mongodb");

const uri =
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/hockey-app";
const dbName = process.env.DB_NAME || "hockey-app";

async function createTeamIndexes() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(dbName);
    const teamsCollection = db.collection("teams");
    const membersCollection = db.collection("members");

    console.log("\n📊 Creating indexes for teams collection...");

    // 1. Unique index on teamId
    await teamsCollection.createIndex(
      { teamId: 1 },
      { unique: true, name: "idx_teamId_unique" }
    );
    console.log("✅ Created unique index on teamId");

    // 2. Compound index on clubId, ageCategory, season
    await teamsCollection.createIndex(
      { clubId: 1, ageCategory: 1, season: 1 },
      { name: "idx_club_age_season" }
    );
    console.log("✅ Created index on clubId + ageCategory + season");

    // 3. Compound index on clubId, status
    await teamsCollection.createIndex(
      { clubId: 1, status: 1 },
      { name: "idx_club_status" }
    );
    console.log("✅ Created index on clubId + status");

    // 4. Index on roster.memberId (for member lookups)
    await teamsCollection.createIndex(
      { "roster.memberId": 1 },
      { name: "idx_roster_memberId" }
    );
    console.log("✅ Created index on roster.memberId");

    // 5. Compound index on season, status
    await teamsCollection.createIndex(
      { season: 1, status: 1 },
      { name: "idx_season_status" }
    );
    console.log("✅ Created index on season + status");

    // 6. Index on division.level for hierarchy queries
    await teamsCollection.createIndex(
      { clubId: 1, ageCategory: 1, "division.level": 1 },
      { name: "idx_club_age_division_level" }
    );
    console.log("✅ Created index on clubId + ageCategory + division.level");

    console.log(
      "\n📊 Creating indexes for members collection (team registrations)..."
    );

    // Check if teamRegistrations field exists
    const sampleMember = await membersCollection.findOne({
      teamRegistrations: { $exists: true },
    });

    if (!sampleMember) {
      console.log(
        "⚠️  No members with teamRegistrations found. Indexes will be created but may not be used yet."
      );
    }

    // 1. Index on teamRegistrations.teamId
    await membersCollection.createIndex(
      { "teamRegistrations.teamId": 1 },
      { name: "idx_teamReg_teamId" }
    );
    console.log("✅ Created index on teamRegistrations.teamId");

    // 2. Compound index on teamRegistrations club, age, status
    await membersCollection.createIndex(
      {
        "teamRegistrations.clubId": 1,
        "teamRegistrations.ageCategory": 1,
        "teamRegistrations.status": 1,
      },
      { name: "idx_teamReg_club_age_status" }
    );
    console.log(
      "✅ Created index on teamRegistrations.clubId + ageCategory + status"
    );

    // 3. Index on teamRegistrations.season
    await membersCollection.createIndex(
      { "teamRegistrations.season": 1 },
      { name: "idx_teamReg_season" }
    );
    console.log("✅ Created index on teamRegistrations.season");

    // List all indexes to verify
    console.log("\n📋 Current indexes on teams collection:");
    const teamIndexes = await teamsCollection.indexes();
    teamIndexes.forEach((index) => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log("\n📋 Current indexes on members collection (team-related):");
    const memberIndexes = await membersCollection.indexes();
    const teamRelatedIndexes = memberIndexes.filter(
      (idx) =>
        idx.name.includes("teamReg") ||
        JSON.stringify(idx.key).includes("teamRegistrations")
    );
    teamRelatedIndexes.forEach((index) => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log("\n✅ All indexes created successfully!");
  } catch (error) {
    console.error("❌ Error creating indexes:", error);
    throw error;
  } finally {
    await client.close();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

// Run the script
createTeamIndexes()
  .then(() => {
    console.log("\n🎉 Index creation completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Index creation failed:", error);
    process.exit(1);
  });
