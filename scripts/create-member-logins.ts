/**
 * scripts/create-member-logins.ts   (DRY-RUN by default — nothing changes without --apply)
 *
 * Gives every REGISTERED member a login (members.auth) so they can sign in to the portal:
 *   username  = last name + first initial (more letters of the first name when two people clash,
 *               a number only if the full name is identical), all lowercase, letters only
 *   password  = the temporary password below, and the member must change it at first login
 *
 *   npm run create:member-logins -- [--season 2026] [--club <clubId>] [--password <temp>] [--apply]
 *
 * TEMPORARY PASSWORD: --password, else MEMBER_LOGIN_PASSWORD from .env.local, else "password123".
 * Everyone shares it, so only use it while testing and change/reset before real use.
 *
 * - Only members with a club registration for the season (run backfill:registrations first).
 * - Members who already have a login are left alone. Usernames never collide with existing member
 *   or user logins.
 * - Role: "player" for players, otherwise "member" — portal access only, no admin rights.
 * - A dry run writes login-plan-<stamp>.csv (username, member id, name; no passwords) to ./dedupe-output.
 */
import "./load-env";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";
import { planUsernames } from "../lib/auth/memberLogins";

const DB_NAME = process.env.DB_NAME || "hockey-app";
const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };

async function main() {
  const season = parseInt(arg("season") ?? String(new Date().getFullYear()), 10);
  const onlyClub = arg("club");
  const apply = process.argv.includes("--apply");
  const password = arg("password") ?? process.env.MEMBER_LOGIN_PASSWORD?.trim() ?? "password123";

  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db(DB_NAME);

  const regs = await db.collection("club-registrations").find({ seasonYear: season, ...(onlyClub ? { clubId: onlyClub } : {}) }, { projection: { memberId: 1 } }).toArray();
  const registered = [...new Set(regs.map((r) => String(r.memberId)))];
  const members = await db.collection("members").find({ memberId: { $in: registered } }, { projection: { memberId: 1, personalInfo: 1, roles: 1, auth: 1 } }).toArray();

  const takenMembers = await db.collection("members").find({ "auth.username": { $exists: true } }, { projection: { "auth.username": 1 } }).toArray();
  const takenUsers = await db.collection("users").find({}, { projection: { username: 1 } }).toArray();
  const taken = [...takenMembers.map((m) => m.auth?.username), ...takenUsers.map((u) => u.username)].filter(Boolean) as string[];

  const todo = members.filter((m) => !m.auth?.username);
  const plan = planUsernames(
    todo.map((m) => ({ memberId: String(m.memberId), firstName: String(m.personalInfo?.firstName ?? ""), lastName: String(m.personalInfo?.lastName ?? "") })),
    taken,
  );
  const usable = todo.filter((m) => plan.get(String(m.memberId))?.match(/[a-z]/));

  console.log(`Season ${season}${onlyClub ? `, club ${onlyClub}` : ""}`);
  console.log(`Registered members: ${registered.length}   already have a login: ${members.length - todo.length}   logins to create: ${usable.length}   skipped (no usable name): ${todo.length - usable.length}`);
  for (const m of usable.slice(0, 8)) console.log(`  e.g. ${plan.get(String(m.memberId))!.padEnd(22)} ${m.personalInfo?.firstName} ${m.personalInfo?.lastName}  (${m.memberId})`);

  if (!apply) {
    const dir = path.resolve("dedupe-output");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `login-plan-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`);
    fs.writeFileSync(file, ["username,memberId,firstName,lastName", ...usable.map((m) => [plan.get(String(m.memberId)), m.memberId, m.personalInfo?.firstName, m.personalInfo?.lastName].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))].join("\n"));
    console.log(`Plan written: ${file}\n\nDRY RUN — nothing changed. Add --apply to create the logins.`);
    await client.close();
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();
  for (let i = 0; i < usable.length; i += 500) {
    await db.collection("members").bulkWrite(
      usable.slice(i, i + 500).map((m) => {
        const isPlayer = (m.roles ?? []).some((r: string) => String(r).replace(/^role-/, "") === "player");
        return {
          updateOne: {
            filter: { _id: m._id, "auth.username": { $exists: false } },
            update: { $set: { auth: { username: plan.get(String(m.memberId)), passwordHash: hash, role: isPlayer ? "player" : "member", forcePasswordChange: true, createdAt: now, lastLogin: null } } },
          },
        };
      }),
      { ordered: false },
    );
  }
  console.log(`\nCreated ${usable.length} logins. Password is the temporary one; members must change it at first sign-in.`);
  await client.close();
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
