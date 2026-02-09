const bcrypt = require("bcryptjs");
const { MongoClient } = require("mongodb");

async function createUser() {
  const client = new MongoClient(
    "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority",
  );

  try {
    await client.connect();
    const db = client.db("hockey-app");

    // Check if user exists
    const existing = await db.collection("users").findOne({
      email: "super@example.com",
    });

    if (existing) {
      console.log("✅ User already exists!");
      console.log("Email: super@example.com");
      console.log("Password: super123");
      return;
    }

    // Hash password
    const hash = await bcrypt.hash("super123", 10);

    // Create user
    await db.collection("users").insertOne({
      email: "super@example.com",
      password: hash,
      name: "Super Admin",
      role: "super-admin",
      clubId: null,
      memberId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("✅ User created successfully!");
    console.log("Email: super@example.com");
    console.log("Password: super123");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

createUser();
