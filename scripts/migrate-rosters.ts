import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";

const MONGODB_URI =
  "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/";

async function migrateRostersToMongo() {
  console.log("Starting migration to MongoDB...");

  // Read the rosters.json file
  const rostersPath = path.join(
    process.cwd(),
    "public",
    "data",
    "rosters.json"
  );
  const rostersData = JSON.parse(fs.readFileSync(rostersPath, "utf-8"));

  console.log("Loaded rosters.json");

  // Connect to MongoDB
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("hockey-app");
    const rostersCollection = db.collection("rosters");

    // Clear existing data
    await rostersCollection.deleteMany({});
    console.log("Cleared existing rosters");

    // Transform and insert data
    const documents = [];

    for (const [ageGroup, data] of Object.entries(rostersData) as [
      string,
      any
    ][]) {
      // Extract teams
      const teams = [];
      const excludeKeys = [
        "lastUpdated",
        "trialInfo",
        "trainingInfo",
        "tournamentInfo",
        "shadowPlayers",
        "withdrawn",
      ];

      for (const [key, value] of Object.entries(data)) {
        if (!excludeKeys.includes(key)) {
          teams.push({
            name: key,
            players: (value as any).players || [],
            staff: (value as any).staff || {},
          });
        }
      }

      const document = {
        ageGroup,
        lastUpdated: data.lastUpdated || new Date().toLocaleDateString("en-AU"),
        trialInfo: data.trialInfo || null,
        trainingInfo: data.trainingInfo || null,
        tournamentInfo: data.tournamentInfo || null,
        shadowPlayers: data.shadowPlayers || [],
        withdrawn: data.withdrawn || [],
        teams,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      documents.push(document);
    }

    // Insert documents
    const result = await rostersCollection.insertMany(documents);
    console.log(`Inserted ${result.insertedCount} documents`);

    // Create indexes
    await rostersCollection.createIndex({ ageGroup: 1 }, { unique: true });
    console.log("Created indexes");

    console.log("Migration completed successfully!");
    console.log("\nInserted age groups:");
    documents.forEach((doc) => {
      console.log(
        `  - ${doc.ageGroup}: ${doc.teams.length} teams, ${doc.shadowPlayers.length} shadow players, ${doc.withdrawn.length} withdrawn`
      );
    });
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await client.close();
    console.log("Connection closed");
  }
}

// Run migration
migrateRostersToMongo().catch(console.error);
