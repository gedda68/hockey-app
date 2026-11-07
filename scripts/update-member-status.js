require("./load-env.cjs");
const { MongoClient } = require("mongodb");

const uri =
  process.env.MONGODB_URI;

const dbName = process.env.DB_NAME || "hockey-app";

async function updateMembersStatus() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(dbName);
    const members = db.collection("members");

    const result = await members.updateMany(
      {},
      {
        $set: {
          status: {
            banned: false,
            bannedUntil: null,
            banReason: null,
            bannedBy: null,
          },
        },
      }
    );

    console.log(`Updated ${result.modifiedCount} members with default status`);
  } catch (err) {
    console.error("Error updating members:", err);
  } finally {
    await client.close();
    console.log("Connection closed");
  }
}

updateMembersStatus();
