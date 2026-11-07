// scripts/rename-club-fields.ts
// Script to rename old field names to match new schema

import "./load-env";
import { MongoClient } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI!;
const DB_NAME = process.env.DB_NAME || "hockey-app";

async function renameClubFields() {
  console.log("🔄 Renaming club fields to new schema...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const database = client.db(DB_NAME);
    const clubsCollection = database.collection("clubs");

    // Get all clubs
    const clubs = await clubsCollection.find({}).toArray();
    console.log(`📊 Found ${clubs.length} clubs\n`);

    let updated = 0;

    for (const club of clubs) {
      const updates: any = {};

      // Rename title → name
      if (club.title && !club.name) {
        updates.name = club.title;
        console.log(`✏️  Renaming "title" → "name" for: ${club.title}`);
      }

      // Rename abbreviation → shortName
      if (club.abbreviation && !club.shortName) {
        updates.shortName = club.abbreviation;
        console.log(
          `✏️  Renaming "abbreviation" → "shortName": ${club.abbreviation}`
        );
      }

      // Map old color fields to new colors object
      if ((club.color || club.bgColor) && !club.colors) {
        updates.colors = {
          primary: club.color || "#06054e",
          secondary: club.bgColor || "#090836",
          accent: "",
        };
        console.log(
          `🎨 Creating colors object: primary=${club.color}, secondary=${club.bgColor}`
        );
      }

      // Map contacts to committee if needed
      if (
        club.contacts &&
        club.contacts.length > 0 &&
        (!club.committee || club.committee.length === 0)
      ) {
        updates.committee = club.contacts.map(
          (contact: any, index: number) => ({
            id: `member-${Date.now()}-${index}`,
            name: contact.name,
            position: contact.role,
            email: contact.email || "",
            phone: contact.phone || "",
          })
        );
        console.log(
          `👥 Converting ${club.contacts.length} contacts to committee`
        );
      }

      // Create default contact object if needed
      if (!club.contact) {
        const primaryContact = club.contacts?.[0];
        updates.contact = {
          email: primaryContact?.email || "",
          phone: primaryContact?.phone || "",
          website: club.href || "",
        };
        console.log(`📧 Creating contact object`);
      }

      // Create default address object if needed
      if (!club.address || typeof club.address === "string") {
        const addressString =
          typeof club.address === "string" ? club.address : "";
        updates.address = {
          street: "",
          suburb: "",
          state: "QLD",
          postcode: "",
          country: "Australia",
        };
        console.log(`📍 Creating address object from: ${addressString}`);
      }

      // Create socialMedia object if needed
      if (
        !club.socialMedia &&
        (club.facebookUrl || club.instagramUrl || club.twitterUrl)
      ) {
        updates.socialMedia = {
          facebook: club.facebookUrl || "",
          instagram: club.instagramUrl || "",
          twitter: club.twitterUrl || "",
        };
        console.log(`📱 Creating socialMedia object`);
      }

      // Ensure active field exists
      if (club.active === undefined) {
        updates.active = true;
        console.log(`✅ Setting active = true`);
      }

      // Add timestamps if missing
      if (!club.createdAt) {
        updates.createdAt = new Date().toISOString();
      }
      if (!club.updatedAt) {
        updates.updatedAt = new Date().toISOString();
      }

      // Generate slug if missing
      if (!club.slug && (club.title || club.name)) {
        const nameForSlug = club.name || club.title;
        updates.slug = nameForSlug
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        console.log(`🔗 Generated slug: ${updates.slug}`);
      }

      // Apply updates
      if (Object.keys(updates).length > 0) {
        await clubsCollection.updateOne({ _id: club._id }, { $set: updates });
        console.log(`✅ Updated: ${club.title || club.name}\n`);
        updated++;
      } else {
        console.log(
          `⏭️  Skipping: ${club.title || club.name} (already up to date)\n`
        );
      }
    }

    console.log("\n📈 Summary:");
    console.log(`   Total clubs: ${clubs.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${clubs.length - updated}`);

    console.log("\n✅ Field renaming complete!");
    console.log("\n💡 Old fields are still in database (not deleted)");
    console.log("   You can clean them up manually if needed.");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

renameClubFields();
