// scripts/fix-super-user.js
// Fix the super admin user with undefined userId

require("./load-env.cjs");
const { MongoClient } = require("mongodb");

const MONGODB_URI =
  process.env.MONGODB_URI;

async function fixSuperUser() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db("hockey-app");
    const usersCollection = db.collection("users");

    // Find the user with email super@example.com
    const superUser = await usersCollection.findOne({
      email: "super@example.com",
    });

    if (!superUser) {
      console.log("❌ User with email super@example.com not found!");
      return;
    }

    console.log("Found user:", {
      userId: superUser.userId,
      email: superUser.email,
      role: superUser.role,
    });

    // Update to set proper userId
    const result = await usersCollection.updateOne(
      { email: "super@example.com" },
      {
        $set: {
          userId: "super",
          username: "super",
        },
      },
    );

    console.log("\n✅ Updated user!");
    console.log(`Modified ${result.modifiedCount} document(s)`);

    // Verify
    const updated = await usersCollection.findOne({ userId: "super" });
    console.log("\n✅ Verified - User now has:");
    console.log(`  userId: ${updated.userId}`);
    console.log(`  username: ${updated.username}`);
    console.log(`  email: ${updated.email}`);
    console.log(`  role: ${updated.role}`);
    console.log(`  has password: ${!!updated.password}`);

    console.log("\n🎉 You can now log in with:");
    console.log("  Username: super");
    console.log("  Password: (whatever password was set)");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

fixSuperUser();
