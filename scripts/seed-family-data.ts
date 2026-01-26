// scripts/seed-family-data.ts
// Seed family relationships and discount structures

import { MongoClient } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority";
const DB_NAME = process.env.DB_NAME || "hockey-app";

// Default Family Relationships
const DEFAULT_RELATIONSHIPS = [
  {
    relationshipId: "rel-parent",
    name: "Parent",
    category: "Parent",
    canManageOthers: true,
    displayOrder: 1,
    active: true,
  },
  {
    relationshipId: "rel-guardian",
    name: "Guardian",
    category: "Parent",
    canManageOthers: true,
    displayOrder: 2,
    active: true,
  },
  {
    relationshipId: "rel-child",
    name: "Child",
    category: "Child",
    canManageOthers: false,
    displayOrder: 3,
    active: true,
  },
  {
    relationshipId: "rel-sibling",
    name: "Sibling",
    category: "Sibling",
    canManageOthers: false,
    displayOrder: 4,
    active: true,
  },
  {
    relationshipId: "rel-spouse",
    name: "Spouse",
    category: "Spouse",
    canManageOthers: true,
    displayOrder: 5,
    active: true,
  },
  {
    relationshipId: "rel-grandparent",
    name: "Grandparent",
    category: "Parent",
    canManageOthers: true,
    displayOrder: 6,
    active: true,
  },
  {
    relationshipId: "rel-grandchild",
    name: "Grandchild",
    category: "Child",
    canManageOthers: false,
    displayOrder: 7,
    active: true,
  },
  {
    relationshipId: "rel-other",
    name: "Other Family Member",
    category: "Other",
    canManageOthers: false,
    displayOrder: 8,
    active: true,
  },
];

// Default Family Discounts
const DEFAULT_DISCOUNTS = [
  {
    discountId: "discount-family-10",
    clubId: null,
    name: "Family Discount - 10%",
    description: "10% discount when 3 or more family members join",
    minMembers: 3,
    memberTypes: [],
    mustBeSameClub: false,
    discountType: "Percentage",
    discountValue: 10,
    active: true,
  },
  {
    discountId: "discount-third-child-free",
    clubId: null,
    name: "Third Child Free",
    description: "Third and subsequent children are free",
    minMembers: 3,
    memberTypes: ["type-junior"],
    mustBeSameClub: true,
    discountType: "FreeAdditional",
    discountValue: 0,
    applyToFirst: 2,
    active: false, // Disabled by default, clubs can enable
  },
  {
    discountId: "discount-family-senior",
    clubId: null,
    name: "Senior Family Discount",
    description: "$100 off when 2+ senior members",
    minMembers: 2,
    memberTypes: ["type-senior"],
    mustBeSameClub: true,
    discountType: "Fixed",
    discountValue: 100,
    active: true,
  },
];

async function seedFamilyData() {
  console.log("🌱 Seeding family system data...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const database = client.db(DB_NAME);

    // Seed Family Relationships
    console.log("1️⃣ Seeding Family Relationships...");
    const relationshipsCollection = database.collection("family_relationships");
    const existingRelationships =
      await relationshipsCollection.countDocuments();

    if (existingRelationships === 0) {
      await relationshipsCollection.insertMany(
        DEFAULT_RELATIONSHIPS.map((rel) => ({
          ...rel,
          createdAt: new Date().toISOString(),
        }))
      );
      console.log(
        `   ✅ Inserted ${DEFAULT_RELATIONSHIPS.length} relationships\n`
      );
    } else {
      console.log(
        `   ℹ️  Already has ${existingRelationships} relationships\n`
      );
    }

    // Seed Family Discounts
    console.log("2️⃣ Seeding Family Discounts...");
    const discountsCollection = database.collection("family_discounts");
    const existingDiscounts = await discountsCollection.countDocuments();

    if (existingDiscounts === 0) {
      await discountsCollection.insertMany(
        DEFAULT_DISCOUNTS.map((discount) => ({
          ...discount,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
      );
      console.log(`   ✅ Inserted ${DEFAULT_DISCOUNTS.length} discounts\n`);
    } else {
      console.log(`   ℹ️  Already has ${existingDiscounts} discounts\n`);
    }

    console.log("✅ Seeding complete!\n");
    console.log("📊 Summary:");
    console.log(`   - Family Relationships: ${DEFAULT_RELATIONSHIPS.length}`);
    console.log(`   - Family Discounts: ${DEFAULT_DISCOUNTS.length}`);
    console.log("\n🚀 Family system ready!");
    console.log("\n💡 Next steps:");
    console.log("   1. Create family management UI");
    console.log('   2. Build "Add to Family" feature');
    console.log("   3. Implement family dashboard");
    console.log("   4. Add discount calculation to billing");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedFamilyData();
