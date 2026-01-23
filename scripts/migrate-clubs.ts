// scripts/migrate-clubs.ts
// Migration script to import clubs from JSON file to MongoDB

import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority";
const DB_NAME = process.env.DB_NAME || "hockey-app";

interface JsonClub {
  title: string;
  abbreviation: string;
  description: string;
  icon: string;
  iconSrc: string;
  href: string;
  slug: string;
  address?: string;
  color: string;
  bgColor: string;
  about: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  contacts: Array<{
    role: string;
    name: string;
    email: string;
    phone: string;
  }>;
}

interface Club {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  logo: string;
  colors: {
    primary: string;
    secondary: string;
    accent?: string;
  };
  address: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    country: string;
  };
  contact: {
    email: string;
    phone?: string;
    website?: string;
  };
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  committee: Array<{
    id: string;
    name: string;
    position: string;
    email?: string;
    phone?: string;
  }>;
  established?: string;
  homeGround?: string;
  description?: string;
  about?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

function parseAddress(addressString?: string) {
  if (!addressString) {
    return {
      street: "",
      suburb: "",
      state: "QLD",
      postcode: "",
      country: "Australia",
    };
  }

  // Parse address like "106 Finsbury Street, Newmarket, QLD, 4051"
  const parts = addressString.split(",").map((p) => p.trim());

  return {
    street: parts[0] || "",
    suburb: parts[1] || "",
    state: parts[2] || "QLD",
    postcode: parts[3] || "",
    country: "Australia",
  };
}

function transformClub(jsonClub: JsonClub): Club {
  const now = new Date().toISOString();
  const clubId = `club-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  // Transform contacts to committee
  const committee = jsonClub.contacts.map((contact, index) => ({
    id: `member-${Date.now()}-${index}`,
    name: contact.name,
    position: contact.role,
    email: contact.email || "",
    phone: contact.phone || "",
  }));

  // Get primary contact email (president or first contact)
  const primaryContact =
    jsonClub.contacts.find(
      (c) =>
        c.role.toLowerCase().includes("president") ||
        c.role.toLowerCase().includes("secretary")
    ) || jsonClub.contacts[0];

  // Generate slug from club title
  const slug = jsonClub.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return {
    id: clubId,
    name: jsonClub.title,
    shortName: jsonClub.abbreviation,
    slug,
    logo: jsonClub.iconSrc,
    colors: {
      primary: jsonClub.color,
      secondary: jsonClub.bgColor,
      accent: "",
    },
    address: parseAddress(jsonClub.address),
    contact: {
      email: primaryContact?.email || "",
      phone: primaryContact?.phone || "",
      website: jsonClub.href,
    },
    socialMedia: {
      facebook: jsonClub.facebookUrl || "",
      instagram: jsonClub.instagramUrl || "",
      twitter: jsonClub.twitterUrl || "",
    },
    committee,
    established: "", // Not in JSON
    homeGround: "", // Not in JSON
    description: jsonClub.description,
    about: jsonClub.about,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

async function migrateClubs() {
  console.log("🚀 Starting club migration...\n");

  // Read JSON file
  const jsonPath = path.join(process.cwd(), "clubs.json");
  console.log(`📖 Reading JSON from: ${jsonPath}`);

  const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const jsonClubs: JsonClub[] = jsonData.clubs;

  console.log(`✅ Found ${jsonClubs.length} clubs in JSON\n`);

  // Connect to MongoDB
  console.log(`🔌 Connecting to MongoDB...`);
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log(`✅ Connected to MongoDB\n`);

    const db = client.db(DB_NAME);
    const clubsCollection = db.collection("clubs");

    // Check existing clubs
    const existingCount = await clubsCollection.countDocuments();
    console.log(`📊 Existing clubs in database: ${existingCount}`);

    if (existingCount > 0) {
      console.log(
        `⚠️  WARNING: Database already contains ${existingCount} clubs`
      );
      console.log(`❓ Do you want to:`);
      console.log(`   1. Skip migration (keep existing clubs)`);
      console.log(`   2. Add new clubs (duplicate prevention by name)`);
      console.log(`   3. Replace all clubs (DELETE existing and import new)`);
      console.log(`\n💡 Run with argument: --skip, --add, or --replace`);

      const arg = process.argv[2];

      if (arg === "--replace") {
        console.log(`\n🗑️  Deleting existing clubs...`);
        await clubsCollection.deleteMany({});
        console.log(`✅ Deleted ${existingCount} existing clubs\n`);
      } else if (arg === "--skip") {
        console.log(`\n⏭️  Skipping migration (keeping existing clubs)`);
        await client.close();
        return;
      } else if (arg !== "--add") {
        console.log(`\n❌ No valid argument provided. Exiting.`);
        console.log(`   Run: npm run migrate:clubs -- --replace`);
        console.log(`   Or:  npm run migrate:clubs -- --add`);
        console.log(`   Or:  npm run migrate:clubs -- --skip`);
        await client.close();
        return;
      }
    }

    // Transform and insert clubs
    console.log(`\n🔄 Transforming clubs...`);
    const transformedClubs = jsonClubs.map(transformClub);

    console.log(`💾 Inserting clubs into database...\n`);

    let inserted = 0;
    let skipped = 0;

    for (const club of transformedClubs) {
      // Check if club with same name exists (for --add mode)
      const existing = await clubsCollection.findOne({ name: club.name });

      if (existing && process.argv[2] === "--add") {
        console.log(`⏭️  Skipped: ${club.name} (already exists)`);
        skipped++;
      } else {
        await clubsCollection.insertOne(club);
        console.log(`✅ Inserted: ${club.name} (${club.shortName})`);
        inserted++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Inserted: ${inserted} clubs`);
    console.log(`   ⏭️  Skipped: ${skipped} clubs`);
    console.log(
      `   📁 Total in DB: ${await clubsCollection.countDocuments()} clubs`
    );

    console.log(`\n✨ Migration complete!\n`);

    // Display some stats
    console.log(`📈 Club Statistics:`);
    const withCommittee = await clubsCollection.countDocuments({
      "committee.0": { $exists: true },
    });
    const withSocial = await clubsCollection.countDocuments({
      $or: [
        { "socialMedia.facebook": { $ne: "" } },
        { "socialMedia.instagram": { $ne: "" } },
        { "socialMedia.twitter": { $ne: "" } },
      ],
    });

    console.log(`   👥 Clubs with committee: ${withCommittee}`);
    console.log(`   📱 Clubs with social media: ${withSocial}`);
    console.log(
      `   🎨 Clubs with logos: ${transformedClubs.filter((c) => c.logo).length}`
    );
  } catch (error) {
    console.error(`\n❌ Migration failed:`, error);
    throw error;
  } finally {
    await client.close();
    console.log(`\n🔌 Disconnected from MongoDB`);
  }
}

// Run migration
migrateClubs().catch(console.error);
