const { MongoClient } = require("mongodb");

async function runMigration() {
  // Update this connection string to your actual MongoDB URI
  const uri =
    "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB...");

    const db = client.db("hockey-app"); // Replace with your DB name
    const clubs = db.collection("clubs");

    // 3. Update specific club fees
    const resFees = await clubs.updateMany(
      {},
      {
        $set: {
          fees: [
            {
              feeId: "junior-2026",
              name: "Junior Club Membership",
              category: "Junior",
              amount: 100.0,
              gstIncluded: true,
              validFrom: new Date("2026-01-01"),
              validTo: new Date("2026-12-31"),
              isActive: true,
            },
            {
              feeId: "senior-2026",
              name: "Senior Club Membership",
              category: "Senior",
              amount: 150.0,
              gstIncluded: true,
              validFrom: new Date("2026-01-01"),
              validTo: new Date("2026-12-31"),
              isActive: true,
            },
          ],
        },
      }
    );
    console.log(
      `Updated fees for Commercial Hockey Club: ${resFees.modifiedCount} document(s) changed.`
    );
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.close();
    console.log("Connection closed.");
  }
}

runMigration();
