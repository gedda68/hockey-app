// scripts/seed-config-gender.ts
// Seed gender options into the unified `config` collection (configType "gender"),
// the shape read and written by app/api/admin/config/[type]/route.ts.
//
// Run: npx tsx scripts/seed-config-gender.ts
// Safe to re-run: existing options (matched by id) are left untouched.

import "./load-env";
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = process.env.DB_NAME || "hockey-app";

const DEFAULT_GENDERS = [
  { id: "gender-male", name: "Male" },
  { id: "gender-female", name: "Female" },
  { id: "gender-non-binary", name: "Non-binary" },
  { id: "gender-other", name: "Other" },
  { id: "gender-prefer-not-to-say", name: "Prefer not to say" },
];

async function seedConfigGender() {
  console.log("🌱 Seeding gender options into config...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const collection = client.db(DB_NAME).collection("config");
    const now = new Date();
    let inserted = 0;

    for (const [i, gender] of DEFAULT_GENDERS.entries()) {
      const result = await collection.updateOne(
        { configType: "gender", id: gender.id },
        {
          $setOnInsert: {
            configType: "gender",
            id: gender.id,
            name: gender.name,
            description: null,
            isActive: true,
            displayOrder: i + 1,
            usageCount: 0,
            lastUsed: null,
            createdAt: now,
            updatedAt: now,
            createdBy: "system",
            updatedBy: null,
          },
        },
        { upsert: true },
      );
      const added = result.upsertedCount > 0;
      if (added) inserted++;
      console.log(`   ${added ? "+" : "="} ${gender.name}${added ? "" : " (already present)"}`);
    }

    console.log(`\n✅ ${inserted} added, ${DEFAULT_GENDERS.length - inserted} already present`);
    console.log("   View/edit: /admin/settings/gender");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

seedConfigGender();
