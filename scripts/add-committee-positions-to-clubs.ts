// scripts/add-committee-positions-to-clubs.ts
// Add committeePositions field to existing clubs

import { MongoClient } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority";
const DB_NAME = process.env.DB_NAME || "hockey-app";

const DEFAULT_POSITIONS = [
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Committee Member",
  "Coach Coordinator",
  "Registrar",
  "Junior Coordinator",
  "Senior Coordinator",
  "Volunteer Coordinator",
];

async function addCommitteePositionsToClubs() {
  console.log("🔧 Adding committeePositions to existing clubs...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const database = client.db(DB_NAME);
    const clubsCollection = database.collection("clubs");

    // Find all clubs
    const clubs = await clubsCollection.find({}).toArray();
    console.log(`📊 Found ${clubs.length} clubs\n`);

    let updated = 0;
    let alreadyHavePositions = 0;

    for (const club of clubs) {
      const clubName = club.name || club.title || "Unknown";

      // Check if already has committeePositions
      if (club.committeePositions && Array.isArray(club.committeePositions)) {
        console.log(
          `✅ "${clubName}": Already has ${club.committeePositions.length} positions`
        );
        alreadyHavePositions++;
        continue;
      }

      // Extract unique positions from existing committee members
      const existingPositions = new Set<string>();
      if (club.committee && Array.isArray(club.committee)) {
        club.committee.forEach((member: any) => {
          if (member.position) {
            existingPositions.add(member.position);
          }
        });
      }

      // Combine existing positions with defaults (remove duplicates)
      const combinedPositions = [
        ...Array.from(existingPositions),
        ...DEFAULT_POSITIONS.filter((p) => !existingPositions.has(p)),
      ];

      console.log(`🔧 Adding positions to "${clubName}"`);
      console.log(
        `   Existing: ${Array.from(existingPositions).join(", ") || "None"}`
      );
      console.log(`   Total positions: ${combinedPositions.length}`);

      await clubsCollection.updateOne(
        { _id: club._id },
        {
          $set: {
            committeePositions: combinedPositions,
            updatedAt: new Date().toISOString(),
          },
        }
      );

      updated++;
      console.log(`   ✅ Updated!\n`);
    }

    console.log("📈 Summary:");
    console.log(`   Total clubs: ${clubs.length}`);
    console.log(`   Already have positions: ${alreadyHavePositions}`);
    console.log(`   Updated: ${updated}`);

    if (updated > 0) {
      console.log("\n✅ Migration complete!");
      console.log("   All clubs now have committeePositions field");
      console.log("   Restart your server: npm run dev");
    } else {
      console.log("\n✅ All clubs already have committeePositions!");
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

addCommitteePositionsToClubs();
