/**
 * scripts/create-club-user.ts
 *
 * Creates (or refreshes) ONE login that can only see and manage a single club.
 *
 *   npm run create:club-user -- --club commercial --username commercial-admin
 *   npm run create:club-user -- --club commercial --username commercial-admin --reset-password
 *
 * --club        club id, slug or a name fragment (e.g. "commercial"); must match exactly one club
 * --username    login name (default: <club-slug>-admin)
 * --role        club-admin (default) | club-committee | coach | manager | team-selector
 * --reset-password  set a new password for an existing user
 *
 * Password: CLUB_USER_PASSWORD from .env.local if set, otherwise a random one is
 * generated and printed ONCE. Nothing is hardcoded — this repo is public.
 * The user gets a role on that club only: no association, global or other-club access.
 */

import "./load-env";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";

const DB_NAME = process.env.DB_NAME || "hockey-app";
const argv = process.argv.slice(2);
const opt = (n: string) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const RESET = argv.includes("--reset-password");
const ROLES = ["club-admin", "club-committee", "coach", "manager", "team-selector"];

async function main() {
  const wanted = opt("--club");
  if (!wanted) throw new Error('Pass --club <id | slug | name fragment>, e.g. --club commercial');
  const role = opt("--role") ?? "club-admin";
  if (!ROLES.includes(role)) throw new Error(`--role must be one of: ${ROLES.join(", ")}`);

  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  try {
    const db = client.db(DB_NAME);
    const esc = wanted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = await db.collection("clubs")
      .find({ $or: [{ id: wanted }, { clubId: wanted }, { slug: wanted }, { name: { $regex: esc, $options: "i" } }] })
      .toArray();
    if (matches.length === 0) throw new Error(`No club matches "${wanted}".`);
    if (matches.length > 1) {
      throw new Error(`"${wanted}" matches ${matches.length} clubs — be more specific:\n` + matches.map((c) => `  ${c.id ?? c.clubId}  ${c.name}`).join("\n"));
    }
    const club = matches[0];
    const clubId = String(club.id ?? club.clubId);
    const slug = String(club.slug ?? clubId);
    const username = opt("--username") ?? `${slug.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-admin`;

    const users = db.collection("users");
    const existing = await users.findOne({ username }, { projection: { _id: 1 } });
    const envPw = process.env.CLUB_USER_PASSWORD?.trim();
    const password = envPw || randomBytes(12).toString("base64url");
    const setPassword = !existing || RESET;
    const now = new Date();

    await users.updateOne(
      { username },
      {
        $set: {
          roles: [{ role, scopeType: "club", scopeId: clubId, grantedAt: now.toISOString(), grantedBy: "create-club-user", active: true }],
          role,
          clubId,
          associationId: club.parentAssociationId ?? null,
          assignedTeams: [],
          status: "active",
          updatedAt: now,
          ...(setPassword ? { passwordHash: await bcrypt.hash(password, 10), forcePasswordChange: false, loginAttempts: 0, lockedUntil: null } : {}),
        },
        $setOnInsert: {
          userId: `user-${username}`,
          username,
          email: `${username}@example.com`,
          firstName: String(club.shortName ?? club.name),
          lastName: "Admin",
          linkedMembers: [],
          emailVerified: true,
          lastLogin: null,
          createdAt: now,
          createdBy: "create-club-user",
        },
      },
      { upsert: true },
    );

    console.log(`\n✅ ${existing ? "Refreshed" : "Created"} "${username}" — ${role} for ${club.name} (${clubId}) only.`);
    if (setPassword) {
      console.log(envPw ? "   Password: the value of CLUB_USER_PASSWORD in .env.local" : `   Password (shown once): ${password}`);
    } else {
      console.log("   Password unchanged (use --reset-password to set a new one).");
    }
  } finally {
    await client.close();
  }
}

main().catch((e) => { console.error("❌", e instanceof Error ? e.message : e); process.exit(1); });
