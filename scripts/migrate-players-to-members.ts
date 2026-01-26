// scripts/migrate-players-to-members.ts
// Migrate existing players collection to new members system

import { MongoClient } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority";
const DB_NAME = process.env.DB_NAME || "hockey-app";

function calculateAge(dateOfBirth: string): number {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
}

async function getNextMemberSequence(db: any, clubId: string): Promise<number> {
  const club = await db.collection("clubs").findOne({ id: clubId });
  const currentSequence = club?.memberSequence || 0;
  const nextSequence = currentSequence + 1;

  await db
    .collection("clubs")
    .updateOne({ id: clubId }, { $set: { memberSequence: nextSequence } });

  return nextSequence;
}

async function migratePlayers() {
  console.log("🔄 Migrating players to members system...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db(DB_NAME);

    // Check if players collection exists
    const collections = await db.listCollections().toArray();
    const hasPlayers = collections.some((c) => c.name === "players");

    if (!hasPlayers) {
      console.log("ℹ️  No players collection found");
      console.log("   Skipping migration");
      return;
    }

    // Get all players
    const players = await db.collection("players").find({}).toArray();
    console.log(`📊 Found ${players.length} players to migrate\n`);

    if (players.length === 0) {
      console.log("ℹ️  No players to migrate");
      return;
    }

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const player of players) {
      try {
        // Find club by name
        const club = await db.collection("clubs").findOne({
          $or: [
            { name: player.club },
            { title: player.club },
            { shortName: player.club },
          ],
        });

        if (!club) {
          console.warn(
            `⚠️  Club not found for player: ${player.name} (${player.club})`
          );
          skipped++;
          continue;
        }

        // Generate member ID
        const sequence = await getNextMemberSequence(db, club.id);
        const memberId = `${club.shortName}-${sequence
          .toString()
          .padStart(7, "0")}`;

        // Split name (basic - might need manual review)
        const nameParts = (player.name || "").trim().split(" ");
        const firstName = nameParts[0] || "Unknown";
        const lastName = nameParts.slice(1).join(" ") || firstName;

        // Determine membership type from age
        let membershipType = "type-senior";
        if (player.dateOfBirth) {
          const age = calculateAge(player.dateOfBirth);
          membershipType = age < 18 ? "type-junior" : "type-senior";
        }

        // Map status
        const status =
          player.status === "active" || player.status === "Active"
            ? "Active"
            : "Inactive";

        // Create member document
        const member = {
          memberId,
          clubId: club.id,

          personalInfo: {
            firstName,
            lastName,
            displayName: player.name || `${firstName} ${lastName}`,
            dateOfBirth: player.dateOfBirth || "",
            gender: player.gender || "Prefer not to say",
            photoUrl: player.photoUrl || null,
          },

          contact: {
            primaryEmail: player.email || "",
            emailOwnership: "Own",
            additionalEmails: [],
            phone: player.phone || "",
            mobile: player.mobile || "",
            emergencyContact: {
              name: "",
              relationship: "",
              phone: "",
            },
          },

          address: {
            street: "",
            suburb: "",
            state: "QLD",
            postcode: "",
            country: "Australia",
          },

          membership: {
            joinDate: player.joinDate || new Date().toISOString(),
            membershipType,
            status,
            expiryDate: null,
            renewalDate: null,
          },

          roles: ["role-player"],

          // Player-specific data
          playerInfo: {
            primaryPosition: player.primaryPosition || player.position || "",
            secondaryPosition: player.secondaryPosition || "",
            jerseyNumber: player.jerseyNumber || null,
            preferredFoot: null,
          },

          teams: [], // Will be populated separately
          family: null,
          userId: null,

          socialMedia: {
            facebook: "",
            instagram: "",
            twitter: "",
            tiktok: "",
            linkedin: "",
          },

          communicationPreferences: {
            preferredMethod: "Email",
            emailFrequency: "All",
            smsNotifications: true,
            pushNotifications: true,
            socialMediaUpdates: false,
          },

          medical: {
            conditions: "",
            medications: "",
            allergies: "",
            doctorName: "",
            doctorPhone: "",
          },

          notes: "",

          // Migration metadata
          migratedFrom: {
            collection: "players",
            originalId: player._id.toString(),
            playerId: player.id || player.playerId,
            migratedAt: new Date().toISOString(),
          },

          createdAt: player.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "migration-script",
          updatedBy: "migration-script",
        };

        // Check if already migrated
        const existing = await db.collection("members").findOne({ memberId });
        if (existing) {
          console.log(`   ⏭️  Already migrated: ${player.name} → ${memberId}`);
          skipped++;
          continue;
        }

        // Insert member
        await db.collection("members").insertOne(member);

        console.log(`   ✅ ${player.name} → ${memberId}`);
        migrated++;
      } catch (error: any) {
        console.error(`   ❌ Error migrating ${player.name}:`, error.message);
        errors++;
      }
    }

    console.log("\n📊 Migration Summary:");
    console.log(`   Total players: ${players.length}`);
    console.log(`   Migrated: ${migrated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);

    if (migrated > 0) {
      console.log("\n✅ Migration successful!");
      console.log("\n📋 Next steps:");
      console.log("   1. Review migrated members:");
      console.log("      Visit: /admin/members");
      console.log("   2. Update contact information for members");
      console.log("   3. Link members to user accounts (if applicable)");
      console.log("   4. Create families for related members");
      console.log("   5. Backup and rename old collection:");
      console.log('      db.players.renameCollection("players_old")');
      console.log("   6. Update API routes to use /api/members");
    }
  } catch (error) {
    console.error("❌ Migration error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

migratePlayers();
