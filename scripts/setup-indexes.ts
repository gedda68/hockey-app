/**
 * scripts/setup-indexes.ts
 *
 * Creates all MongoDB indexes for the hockey-app database.
 * Run once after deployment or whenever the schema changes:
 *
 *   npm run setup:indexes
 *
 * Each index is created individually so one conflict does not abort the rest.
 * MongoDB silently no-ops if an identical index already exists.
 */

import { MongoClient, type Collection, type IndexDescription } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌  MONGODB_URI is not set in .env.local");
  process.exit(1);
}

const DB_NAME = process.env.DB_NAME ?? "hockey-app";

// ── Helper: create one index, log result, never throw ────────────────────────
async function idx(
  col: Collection,
  spec: IndexDescription["key"],
  options: Record<string, unknown>,
  label: string
) {
  try {
    await col.createIndex(spec, options);
    console.log(`  ✔ ${label}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Code 85 = IndexOptionsConflict (same key, different name — already exists)
    // Code 86 = IndexKeySpecsConflict
    if (msg.includes("already exists")) {
      console.log(`  ⚠ ${label} — already exists (skipped)`);
    } else {
      console.warn(`  ✘ ${label} — ${msg}`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const client = new MongoClient(uri!);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`\n✅  Connected to MongoDB — database: "${DB_NAME}"\n`);

    // ── password_reset_tokens ─────────────────────────────────────────────
    const tokens = db.collection("password_reset_tokens");
    console.log("password_reset_tokens:");

    await idx(tokens, { expiresAt: 1 }, { expireAfterSeconds: 0 },
      "TTL index on expiresAt (auto-delete expired tokens)");

    await idx(tokens, { token: 1 }, { unique: true },
      "unique index on token");

    await idx(tokens, { email: 1 }, {},
      "index on email");

    // ── members ───────────────────────────────────────────────────────────
    const members = db.collection("members");
    console.log("\nmembers:");

    await idx(members, { memberId: 1 }, { unique: true },
      "unique index on memberId");

    await idx(members, { "contact.primaryEmail": 1 }, { sparse: true },
      "index on contact.primaryEmail");

    await idx(members, { "contact.email": 1 }, { sparse: true },
      "index on contact.email (legacy)");

    await idx(
      members,
      { "personalInfo.lastName": 1, "personalInfo.firstName": 1 },
      {},
      "compound index on lastName + firstName"
    );

    await idx(members, { clubId: 1 }, {},
      "index on clubId");

    // ── users ─────────────────────────────────────────────────────────────
    const users = db.collection("users");
    console.log("\nusers:");

    await idx(users, { userId: 1 }, { unique: true },
      "unique index on userId");

    await idx(users, { username: 1 }, { unique: true },
      "unique index on username");

    await idx(users, { email: 1 }, { sparse: true },
      "index on email");

    await idx(users, { clubId: 1 }, {},
      "index on clubId");

    // ── clubs ─────────────────────────────────────────────────────────────
    const clubs = db.collection("clubs");
    console.log("\nclubs:");

    await idx(clubs, { id: 1 }, { unique: true, sparse: true },
      "unique index on id");

    await idx(clubs, { slug: 1 }, { unique: true, sparse: true },
      "unique index on slug");

    await idx(clubs, { parentAssociationId: 1 }, {},
      "index on parentAssociationId");

    // ── associations ──────────────────────────────────────────────────────
    const assocs = db.collection("associations");
    console.log("\nassociations:");

    await idx(assocs, { associationId: 1 }, { unique: true },
      "unique index on associationId");

    await idx(assocs, { parentAssociationId: 1 }, {},
      "index on parentAssociationId");

    // ── club-registrations ────────────────────────────────────────────────
    const clubRegs = db.collection("club-registrations");
    console.log("\nclub-registrations:");

    await idx(clubRegs, { registrationId: 1 }, { unique: true },
      "unique index on registrationId");

    await idx(clubRegs, { memberId: 1, seasonYear: 1 }, {},
      "compound index on memberId + seasonYear");

    await idx(clubRegs, { clubId: 1, seasonYear: 1 }, {},
      "compound index on clubId + seasonYear");

    // ── association-registrations ─────────────────────────────────────────
    const assocRegs = db.collection("association-registrations");
    console.log("\nassociation-registrations:");

    await idx(assocRegs, { registrationId: 1 }, { unique: true },
      "unique index on registrationId");

    await idx(
      assocRegs,
      { memberId: 1, associationId: 1, seasonYear: 1 },
      {},
      "compound index on memberId + associationId + seasonYear"
    );

    // ── payments ──────────────────────────────────────────────────────────
    const payments = db.collection("payments");
    console.log("\npayments:");

    await idx(payments, { paymentId: 1 }, { unique: true },
      "unique index on paymentId");

    await idx(payments, { memberId: 1 }, {},
      "index on memberId");

    await idx(payments, { clubId: 1, seasonYear: 1 }, {},
      "compound index on clubId + seasonYear");

    // ── teams ─────────────────────────────────────────────────────────────
    const teams = db.collection("teams");
    console.log("\nteams:");

    await idx(teams, { teamId: 1 }, { unique: true },
      "unique index on teamId");

    await idx(teams, { clubId: 1, ageCategory: 1, season: 1 }, {},
      "compound index on clubId + ageCategory + season");

    await idx(teams, { clubId: 1, status: 1 }, {},
      "compound index on clubId + status");

    await idx(teams, { "roster.memberId": 1 }, {},
      "index on roster.memberId");

    await idx(teams, { season: 1, status: 1 }, {},
      "compound index on season + status");

    // ── members (teamRegistrations) ───────────────────────────────────────
    console.log("\nmembers (teamRegistrations):");

    await idx(members, { "teamRegistrations.teamId": 1 }, {},
      "index on teamRegistrations.teamId");

    await idx(
      members,
      {
        "teamRegistrations.clubId": 1,
        "teamRegistrations.ageCategory": 1,
        "teamRegistrations.status": 1,
      },
      {},
      "compound index on teamRegistrations.clubId + ageCategory + status"
    );

    // ── competitions ──────────────────────────────────────────────────────
    const competitions = db.collection("competitions");
    console.log("\ncompetitions:");

    await idx(competitions, { competitionId: 1 }, { unique: true },
      "unique index on competitionId");

    await idx(competitions, { owningAssociationId: 1, status: 1 }, {},
      "compound index on owningAssociationId + status");

    // ── season_competitions ───────────────────────────────────────────────
    const seasonCompetitions = db.collection("season_competitions");
    console.log("\nseason_competitions:");

    await idx(seasonCompetitions, { seasonCompetitionId: 1 }, { unique: true },
      "unique index on seasonCompetitionId");

    await idx(seasonCompetitions, { competitionId: 1, season: 1 }, { unique: true },
      "unique index on competitionId + season");

    await idx(seasonCompetitions, { owningAssociationId: 1, season: 1, status: 1 }, {},
      "compound index on owningAssociationId + season + status");

    // ── association_umpire_payment_schedules ─────────────────────────────
    const umpirePay = db.collection("association_umpire_payment_schedules");
    console.log("\nassociation_umpire_payment_schedules:");

    await idx(umpirePay, { associationId: 1 }, { unique: true },
      "unique index on associationId");

    // ── umpire_match_payment_lines ────────────────────────────────────────
    const umpireLines = db.collection("umpire_match_payment_lines");
    console.log("\numpire_match_payment_lines:");

    await idx(umpireLines, { paymentLineId: 1 }, { unique: true },
      "unique index on paymentLineId");

    await idx(
      umpireLines,
      { associationId: 1, status: 1, createdAt: -1 },
      {},
      "compound index associationId + status + createdAt",
    );

    await idx(
      umpireLines,
      { fixtureId: 1, umpireId: 1, umpireType: 1 },
      { unique: true, partialFilterExpression: { status: "pending" } },
      "unique pending line per fixture + umpire + type",
    );

    // ── association_official_register (F1) ───────────────────────────────
    const officials = db.collection("association_official_register");
    console.log("\nassociation_official_register:");

    await idx(officials, { officialRecordId: 1 }, { unique: true },
      "unique index on officialRecordId");

    await idx(officials, { associationId: 1, displayName: 1 }, {},
      "index associationId + displayName");

    await idx(
      officials,
      { associationId: 1, umpireNumber: 1 },
      { unique: true, sparse: true },
      "unique associationId + umpireNumber (sparse)",
    );

    await idx(
      officials,
      { associationId: 1, memberId: 1 },
      { unique: true, sparse: true },
      "unique associationId + memberId (sparse)",
    );

    console.log("\n🎉  Index setup complete.\n");
  } catch (err) {
    console.error("❌  Fatal error:", err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
