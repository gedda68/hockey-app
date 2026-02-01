// scripts/create-admin.js
// Create initial super admin user
// Run: node scripts/create-admin.js

const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority";

async function createAdmin() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();

    // Check existing
    const existing = await db.collection("users").findOne({
      email: "admin@example.com",
    });

    if (existing) {
      console.log("❌ Admin already exists!");
      console.log("Email:", existing.email);
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash("Admin123!", 10);

    // Create admin
    const admin = {
      userId: `user-${Date.now()}-admin`,
      email: "admin@example.com",
      firstName: "Super",
      lastName: "Admin",
      phone: null,
      role: "super-admin",
      associationId: null,
      clubId: null,
      assignedTeams: [],
      linkedMembers: [],
      status: "active",
      emailVerified: true,
      passwordHash,
      lastLogin: null,
      loginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("users").insertOne(admin);

    console.log("✅ Super admin created!");
    console.log("");
    console.log("Login:");
    console.log("  Email:    admin@example.com");
    console.log("  Password: Admin123!");
    console.log("");
    console.log("⚠️  Change password after first login!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

createAdmin();
