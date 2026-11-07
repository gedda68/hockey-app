/**
 * scripts/seed-tiered-demo-accounts.ts
 *
 * Tiered demo tenants + test accounts (see data/README.md, "MongoDB public demo").
 *
 *   npm run seed:tiered-demo                      # create / refresh
 *   npm run seed:tiered-demo -- --reset-password  # also reset demo account passwords
 *
 * Writes:
 *   • associations  HA → HQ → BHA / GHA / RHA (siblings under HQ). Existing
 *                   associations are never modified; missing ones are created.
 *   • clubs         Club-scoped roles link to a club under BHA: SEED_TIERED_BHA_CLUB_ID,
 *                   else the first active BHA club, else one demo club is created.
 *   • teams         One 2026 demo team in that club, for team-scoped roles.
 *   • users         demo-ha, demo-hq, demo-bha, demo-gha, demo-rha: every role valid for
 *                   their association (BHA also gets club + team roles).
 *                   demo-all: every role across all five, for the persona switcher.
 *                   Roles come from buildFullTestRoleGrants (lib/auth/testRoleGrants.ts).
 *
 * Password: SEED_DEMO_PASSWORD (from .env.local) if set; otherwise a random one is
 * generated and printed once. Never hardcode it here — this repo is public.
 *
 * Re-running is safe: roles are refreshed, passwords are kept unless --reset-password.
 */

import "./load-env";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { MongoClient, type Db } from "mongodb";
import { buildFullTestRoleGrants } from "../lib/auth/testRoleGrants";

const DB_NAME = process.env.DB_NAME || "hockey-app";
const RESET_PASSWORD = process.argv.includes("--reset-password");
const SEASON = "2026";
const BHA = "bha";

type AssocSeed = {
  associationId: string;
  code: string;
  name: string;
  fullName: string;
  level: number;
  parentAssociationId?: string;
  hierarchy: string[];
  region: string;
  state: string;
  city: string;
  postcode: string;
};

// HA → HQ → BHA / GHA / RHA. HA, HQ, BHA normally already exist (seed-associations.js).
const ASSOCIATIONS: AssocSeed[] = [
  { associationId: "ha", code: "HA", name: "Hockey Australia", fullName: "Hockey Australia Ltd", level: 0, hierarchy: ["ha"], region: "National", state: "VIC", city: "Melbourne", postcode: "3000" },
  { associationId: "hq", code: "HQ", name: "Hockey Queensland", fullName: "Hockey Queensland Inc.", level: 1, parentAssociationId: "ha", hierarchy: ["ha", "hq"], region: "Queensland", state: "QLD", city: "Brisbane", postcode: "4000" },
  { associationId: "bha", code: "BHA", name: "Brisbane Hockey Association", fullName: "Brisbane Hockey Association Inc.", level: 2, parentAssociationId: "hq", hierarchy: ["ha", "hq", "bha"], region: "Brisbane", state: "QLD", city: "Brisbane", postcode: "4000" },
  { associationId: "gha", code: "GHA", name: "Gold Coast Hockey Association", fullName: "Gold Coast Hockey Association Inc. (demo)", level: 2, parentAssociationId: "hq", hierarchy: ["ha", "hq", "gha"], region: "Gold Coast", state: "QLD", city: "Southport", postcode: "4215" },
  { associationId: "rha", code: "RHA", name: "Rockhampton Hockey Association", fullName: "Rockhampton Hockey Association Inc. (demo)", level: 2, parentAssociationId: "hq", hierarchy: ["ha", "hq", "rha"], region: "Central Queensland", state: "QLD", city: "Rockhampton", postcode: "4700" },
];

function associationDoc(a: AssocSeed, now: string) {
  const slug = a.code.toLowerCase();
  return {
    associationId: a.associationId,
    code: a.code,
    name: a.name,
    fullName: a.fullName,
    acronym: a.code,
    ...(a.parentAssociationId ? { parentAssociationId: a.parentAssociationId } : {}),
    level: a.level,
    hierarchy: a.hierarchy,
    region: a.region,
    state: a.state,
    country: "Australia",
    timezone: "Australia/Brisbane",
    address: { street: "1 Demo Street", suburb: a.city, city: a.city, state: a.state, postcode: a.postcode, country: "Australia" },
    contact: { primaryEmail: `info@${slug}.example.com`, phone: "(07) 0000 0000", website: `https://${slug}.example.com` },
    positions: [],
    fees: [],
    settings: {
      requiresApproval: false, autoApproveReturningPlayers: true, allowMultipleClubs: true,
      seasonStartMonth: 1, seasonEndMonth: 12,
      requiresClearance: true, requiresInsurance: true, requiresMedicalInfo: true, requiresEmergencyContact: true,
    },
    branding: { primaryColor: "#06054e", secondaryColor: "#FFD700" },
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

async function ensureAssociations(db: Db) {
  const col = db.collection("associations");
  const now = new Date().toISOString();
  for (const a of ASSOCIATIONS) {
    const r = await col.updateOne(
      { associationId: a.associationId },
      { $setOnInsert: associationDoc(a, now) },
      { upsert: true },
    );
    console.log(`   ${r.upsertedCount ? "+ created " : "= exists  "} ${a.code.padEnd(4)} ${a.name}`);
  }
}

async function ensureBhaClub(db: Db): Promise<{ id: string; name: string }> {
  const clubs = db.collection("clubs");
  const wanted = process.env.SEED_TIERED_BHA_CLUB_ID?.trim();
  if (wanted) {
    const c = await clubs.findOne({ $or: [{ id: wanted }, { clubId: wanted }] });
    if (!c) throw new Error(`SEED_TIERED_BHA_CLUB_ID="${wanted}" not found in clubs`);
    console.log(`   = using club ${wanted} (SEED_TIERED_BHA_CLUB_ID)`);
    return { id: String(c.id ?? c.clubId), name: String(c.name) };
  }
  const existing = await clubs.findOne(
    { parentAssociationId: BHA, active: { $ne: false }, id: { $ne: "club-demo-bha" } },
    { sort: { name: 1 } },
  );
  if (existing) {
    console.log(`   = using existing BHA club ${existing.id} (${existing.name})`);
    return { id: String(existing.id), name: String(existing.name) };
  }
  const now = new Date().toISOString();
  const demo = { id: "club-demo-bha", name: "Brisbane Demo Hockey Club" };
  const r = await clubs.updateOne(
    { id: demo.id },
    {
      $setOnInsert: {
        id: demo.id,
        name: demo.name,
        shortName: "Demo HC",
        slug: "brisbane-demo-hockey-club",
        parentAssociationId: BHA,
        colors: { primary: "#06054e", secondary: "#FFD700" },
        active: true,
        memberSequence: 0,
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true },
  );
  console.log(
    r.upsertedCount
      ? `   + created demo club ${demo.id} (no other club under BHA)`
      : `   = using demo club ${demo.id} (no other club under BHA)`,
  );
  return demo;
}

async function ensureTeam(db: Db, clubId: string): Promise<string> {
  const teamId = `team-${clubId}-demo-${SEASON}`;
  const now = new Date();
  const r = await db.collection("teams").updateOne(
    { teamId },
    {
      $setOnInsert: {
        teamId,
        clubId,
        name: `Demo Open Men ${SEASON}`,
        displayName: "Demo Open Men",
        gender: "male",
        ageCategory: "senior",
        division: { name: "Division 1", level: 1, shortName: "D1" },
        roster: [],
        leadership: { viceCaptains: [] },
        season: SEASON,
        status: "active",
        statistics: { totalRegistered: 0, totalAssigned: 0, totalGoalkeepers: 0, activeMembers: 0, inactiveMembers: 0, injuredMembers: 0 },
        createdAt: now,
        updatedAt: now,
        createdBy: "seed-tiered-demo",
      },
    },
    { upsert: true },
  );
  console.log(`   ${r.upsertedCount ? "+ created" : "= exists "} team ${teamId}`);
  return teamId;
}

type AccountSeed = {
  username: string;
  firstName: string;
  lastName: string;
  associationIds: string[];
  homeAssociationId: string;
  withClubAndTeam: boolean;
};

const ACCOUNTS: AccountSeed[] = [
  ...ASSOCIATIONS.map((a) => ({
    username: `demo-${a.associationId}`,
    firstName: "Demo",
    lastName: a.code,
    associationIds: [a.associationId],
    homeAssociationId: a.associationId,
    withClubAndTeam: a.associationId === BHA,
  })),
  {
    username: "demo-all",
    firstName: "Demo",
    lastName: "All Roles",
    associationIds: ASSOCIATIONS.map((a) => a.associationId),
    homeAssociationId: BHA,
    withClubAndTeam: true,
  },
];

async function ensureAccounts(db: Db, club: { id: string; name: string }, teamId: string) {
  const users = db.collection("users");
  const envPassword = process.env.SEED_DEMO_PASSWORD?.trim();
  const password = envPassword || randomBytes(12).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 10);
  let passwordApplied = false;
  const grantedAt = new Date().toISOString();

  for (const acc of ACCOUNTS) {
    const roles = buildFullTestRoleGrants({
      grantedAt,
      associationIds: acc.associationIds,
      clubId: acc.withClubAndTeam ? club.id : null,
      teamId: acc.withClubAndTeam ? teamId : null,
    }).map((r) => ({ ...r, grantedBy: "seed-tiered-demo" }));

    const now = new Date();
    const existing = await users.findOne({ username: acc.username }, { projection: { _id: 1 } });
    const setPassword = !existing || RESET_PASSWORD;
    await users.updateOne(
      { username: acc.username },
      {
        $set: {
          roles,
          role: "association-admin",
          associationId: acc.homeAssociationId,
          clubId: acc.withClubAndTeam ? club.id : null,
          assignedTeams: acc.withClubAndTeam ? [teamId] : [],
          status: "active",
          updatedAt: now,
          ...(setPassword ? { passwordHash, forcePasswordChange: false, loginAttempts: 0, lockedUntil: null } : {}),
        },
        $setOnInsert: {
          userId: `user-${acc.username}`,
          username: acc.username,
          email: `${acc.username}@example.com`,
          firstName: acc.firstName,
          lastName: acc.lastName,
          linkedMembers: [],
          emailVerified: true,
          lastLogin: null,
          createdAt: now,
          createdBy: "seed-tiered-demo",
        },
      },
      { upsert: true },
    );
    if (setPassword) passwordApplied = true;
    console.log(
      `   ${existing ? "= refreshed" : "+ created  "} ${acc.username.padEnd(9)} ${String(roles.length).padStart(3)} roles` +
        `${existing && !RESET_PASSWORD ? " (password unchanged)" : ""}`,
    );
  }

  return { passwordApplied, password, fromEnv: Boolean(envPassword) };
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  try {
    const db = client.db(DB_NAME);
    console.log(`\n✅ Connected — database "${DB_NAME}"\n\n1️⃣  Associations`);
    await ensureAssociations(db);
    console.log("\n2️⃣  BHA club");
    const club = await ensureBhaClub(db);
    console.log("\n3️⃣  Demo team");
    const teamId = await ensureTeam(db, club.id);
    console.log("\n4️⃣  Demo accounts");
    const pw = await ensureAccounts(db, club, teamId);

    console.log("\n🎉 Tiered demo ready. Log in with a username above (e.g. demo-all).");
    if (pw.passwordApplied) {
      console.log(
        pw.fromEnv
          ? "   Password: the value of SEED_DEMO_PASSWORD in .env.local"
          : `   Password (shown once — generated): ${pw.password}\n   Set SEED_DEMO_PASSWORD in .env.local to choose your own, then re-run with --reset-password.`,
      );
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
