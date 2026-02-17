// scripts/seed-events.ts
// Run with: npx ts-node scripts/seed-events.ts

import { MongoClient } from "mongodb";
import { v4 as uuidv4 } from "uuid";

const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority";

const sampleEvents = [
  {
    id: uuidv4(),
    slug: "season-opening-round-2026",
    name: "Season Opening Round",
    shortDescription:
      "First round of the 2026 BHA season across all divisions.",
    fullDescription:
      "<h2>Welcome to the 2026 Season!</h2><p>Join us for the exciting opening round featuring all divisions from Premier League to social grades.</p><p><strong>What to expect:</strong></p><ul><li>Full day of hockey action</li><li>BBQ and refreshments available</li><li>Club merchandise stalls</li><li>Kids activities and face painting</li></ul>",
    startDate: new Date("2026-03-07T08:00:00+10:00"),
    endDate: new Date("2026-03-08T18:00:00+10:00"),
    startTime: "08:00",
    endTime: "18:00",
    timezone: "Australia/Brisbane",
    isAllDay: false,
    location: "Brisbane Hockey Centre",
    venue: {
      name: "Brisbane Hockey Centre",
      address: "123 Hockey Road, Colmslie QLD 4170",
      fieldNumber: "Fields 1-4",
    },
    category: "competition",
    scope: "city",
    organization: {
      type: "association",
      id: "bha",
      name: "Brisbane Hockey Association",
    },
    visibility: "public",
    requiresRegistration: false,
    images: {
      featured: "/uploads/events/season-opening-2026.jpg",
      thumbnail: "/uploads/events/season-opening-thumb.jpg",
    },
    tags: ["season-start", "all-divisions", "family-friendly"],
    weatherDependent: true,
    status: "scheduled",
    cost: {
      isFree: true,
      currency: "AUD",
    },
    createdAt: new Date("2025-12-01T10:00:00Z"),
    updatedAt: new Date("2026-01-15T14:30:00Z"),
    deleted: false,
    analytics: {
      views: 245,
      clicks: 89,
      registrations: 0,
    },
  },
  {
    id: uuidv4(),
    slug: "junior-clinic-u12s",
    name: "Junior Clinic - U12s Skills Development",
    shortDescription:
      "Development clinic for U12 players. Bring your stick and mouthguard.",
    fullDescription:
      "<h2>Skill Up This Season!</h2><p>Professional coaches will work with U12 players on:</p><ul><li>Stick skills and ball control</li><li>Passing and receiving</li><li>Defensive positioning</li><li>Game awareness</li></ul>",
    startDate: new Date("2026-03-14T09:00:00+10:00"),
    startTime: "09:00",
    endTime: "11:00",
    timezone: "Australia/Brisbane",
    isAllDay: false,
    location: "Brisbane Hockey Centre",
    venue: {
      name: "Brisbane Hockey Centre",
      address: "123 Hockey Road, Colmslie QLD 4170",
      fieldNumber: "Field 2",
    },
    category: "clinic",
    scope: "city",
    organization: {
      type: "association",
      id: "bha",
      name: "Brisbane Hockey Association",
    },
    visibility: "public",
    requiresRegistration: true,
    registrationConfig: {
      deadline: new Date("2026-03-12T23:59:59+10:00"),
      maxParticipants: 30,
      currentParticipants: 18,
      waitlistEnabled: true,
      fields: ["name", "email", "club", "ageGroup"],
    },
    contactPerson: {
      name: "Mike Chen",
      email: "juniors@bha.org.au",
      phone: "07 3123 4568",
    },
    tags: ["junior", "skill-development", "u12"],
    ageGroup: "U12",
    gender: "all",
    skillLevel: "all",
    cost: {
      isFree: false,
      amount: 15,
      currency: "AUD",
      description: "Members: $15, Non-members: $25",
    },
    status: "scheduled",
    weatherDependent: false,
    createdAt: new Date("2026-01-10T09:00:00Z"),
    updatedAt: new Date("2026-02-01T11:20:00Z"),
    deleted: false,
    analytics: {
      views: 156,
      clicks: 42,
      registrations: 18,
    },
  },
  {
    id: uuidv4(),
    slug: "representative-trials-open-men",
    name: "Representative Trials - Open Men",
    shortDescription: "Trials for the BHA Open Men's representative team.",
    fullDescription:
      "<h2>BHA Open Men's Representative Trials</h2><p>Trials for selection in the Brisbane Hockey Association Open Men's representative squad for state championships.</p><p><strong>Eligibility:</strong></p><ul><li>Must be registered with a BHA club</li><li>Aged 18 and over</li><li>Available for all state championship dates</li></ul>",
    startDate: new Date("2026-04-11T09:00:00+10:00"),
    startTime: "09:00",
    endTime: "13:00",
    timezone: "Australia/Brisbane",
    isAllDay: false,
    location: "Brisbane Hockey Centre",
    venue: {
      name: "Brisbane Hockey Centre",
      address: "123 Hockey Road, Colmslie QLD 4170",
      fieldNumber: "Fields 1-2",
    },
    category: "representative",
    scope: "state",
    organization: {
      type: "association",
      id: "bha",
      name: "Brisbane Hockey Association",
    },
    visibility: "public",
    requiresRegistration: true,
    registrationConfig: {
      deadline: new Date("2026-04-09T23:59:59+10:00"),
      maxParticipants: 60,
      currentParticipants: 42,
    },
    tags: ["representative", "men", "state-level", "trials"],
    ageGroup: "Open",
    gender: "men",
    cost: {
      isFree: false,
      amount: 25,
      currency: "AUD",
      description: "Trial fee (non-refundable)",
    },
    status: "scheduled",
    weatherDependent: true,
    createdAt: new Date("2025-11-20T10:00:00Z"),
    updatedAt: new Date("2026-03-05T14:00:00Z"),
    deleted: false,
    analytics: {
      views: 389,
      clicks: 127,
      registrations: 42,
    },
  },
  {
    id: uuidv4(),
    slug: "grand-finals-day-2026",
    name: "Grand Finals Day 2026",
    shortDescription: "2026 BHA Grand Finals - all divisions.",
    fullDescription:
      "<h2>The Biggest Day of the Year!</h2><p>Join us for Grand Finals Day featuring all division grand finals from U12s through to Premier League.</p><p><strong>Schedule:</strong></p><ul><li>8:00 AM - Junior Grand Finals (U12-U18)</li><li>12:00 PM - Division 1 & 2 Grand Finals</li><li>3:00 PM - Premier League Grand Finals</li><li>6:00 PM - Presentation Ceremony</li></ul>",
    startDate: new Date("2026-08-22T08:00:00+10:00"),
    startTime: "08:00",
    endTime: "19:00",
    timezone: "Australia/Brisbane",
    isAllDay: false,
    location: "Brisbane Hockey Centre",
    venue: {
      name: "Brisbane Hockey Centre",
      address: "123 Hockey Road, Colmslie QLD 4170",
      fieldNumber: "All fields",
    },
    category: "finals",
    scope: "city",
    organization: {
      type: "association",
      id: "bha",
      name: "Brisbane Hockey Association",
    },
    visibility: "public",
    requiresRegistration: false,
    tags: ["grand-finals", "season-finale", "all-ages", "family-event"],
    cost: {
      isFree: true,
      currency: "AUD",
      description: "Free entry for spectators",
    },
    weatherDependent: true,
    status: "scheduled",
    createdAt: new Date("2025-10-01T10:00:00Z"),
    updatedAt: new Date("2026-07-15T16:00:00Z"),
    deleted: false,
    analytics: {
      views: 1247,
      clicks: 456,
      registrations: 0,
    },
  },
];

async function seedEvents() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const database = client.db("hockey-app");
    const eventsCollection = database.collection("events");

    // Clear existing events (optional)
    const clearExisting = process.argv.includes("--clear");
    if (clearExisting) {
      await eventsCollection.deleteMany({});
      console.log("🗑️  Cleared existing events");
    }

    // Insert sample events
    const result = await eventsCollection.insertMany(sampleEvents);
    console.log(`✅ Inserted ${result.insertedCount} events`);

    // Create indexes
    await eventsCollection.createIndex({ id: 1 }, { unique: true });
    await eventsCollection.createIndex({ slug: 1 });
    await eventsCollection.createIndex({ startDate: 1 });
    await eventsCollection.createIndex({ "organization.id": 1 });
    await eventsCollection.createIndex({ "organization.type": 1 });
    await eventsCollection.createIndex({ category: 1 });
    await eventsCollection.createIndex({ scope: 1 });
    await eventsCollection.createIndex({ visibility: 1 });
    await eventsCollection.createIndex({ status: 1 });
    await eventsCollection.createIndex({ deleted: 1 });
    await eventsCollection.createIndex({ tags: 1 });
    console.log("✅ Created indexes");

    console.log("\n📊 Sample Events Summary:");
    sampleEvents.forEach((event, i) => {
      console.log(
        `${i + 1}. ${event.name} - ${event.startDate.toLocaleDateString()}`,
      );
    });
  } catch (error) {
    console.error("❌ Error seeding events:", error);
  } finally {
    await client.close();
    console.log("\n✅ Database connection closed");
  }
}

seedEvents();
