// scripts/check-users.js
// Check what users exist in the database

const { MongoClient } = require("mongodb");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority";

async function checkUsers() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db("hockey-app");
    const users = await db.collection("users").find({}).toArray();

    console.log(`📊 Found ${users.length} users in database:\n`);

    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  userId: ${user.userId}`);
      console.log(`  email: ${user.email || "N/A"}`);
      console.log(`  username: ${user.username || "N/A"}`);
      console.log(`  role: ${user.role}`);
      console.log(`  has password: ${!!user.password}`);
      console.log(
        `  password hash starts with: ${user.password?.substring(0, 10)}...`,
      );
      console.log("");
    });

    // Test password for 'super' user
    const bcrypt = require("bcryptjs");
    const superUser = users.find((u) => u.userId === "super");

    if (superUser) {
      console.log('🔐 Testing password for "super" user:');
      const testPasswords = ["super123", "Super123", "admin123", "password"];

      for (const pwd of testPasswords) {
        const isValid = await bcrypt.compare(pwd, superUser.password);
        console.log(`  "${pwd}": ${isValid ? "✅ MATCH" : "❌ no match"}`);
      }
    } else {
      console.log('❌ User "super" not found in database!');
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

checkUsers();
