const { MongoClient } = require("mongodb");

const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority";

const dbName = process.env.DB_NAME || "hockey-app";

async function createIndexes() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(dbName);

    // Associations
    await db
      .collection("associations")
      .createIndex({ associationId: 1 }, { unique: true });
    await db
      .collection("associations")
      .createIndex({ code: 1 }, { unique: true });
    await db.collection("associations").createIndex({ parentAssociationId: 1 });
    await db.collection("associations").createIndex({ level: 1 });
    await db.collection("associations").createIndex({ status: 1 });
    await db.collection("associations").createIndex({ hierarchy: 1 });

    // Clubs
    await db.collection("clubs").createIndex({ parentAssociationId: 1 });

    // Members
    await db.collection("members").createIndex({ "status.banned": 1 });
    // await db.collection("members").createIndex({ "contact.primaryEmail": 1 });

    // Payments
    await db.collection("payments").createIndex({ memberId: 1 });
    await db.collection("payments").createIndex({ status: 1 });
    await db.collection("payments").createIndex({ createdAt: -1 });

    console.log("Indexes created successfully");
  } catch (err) {
    console.error("Error creating indexes:", err);
  } finally {
    await client.close();
    console.log("Connection closed");
  }
}

createIndexes();
