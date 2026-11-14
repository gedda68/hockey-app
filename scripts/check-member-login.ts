/**
 * scripts/check-member-login.ts   (read-only — changes nothing, never prints the hash)
 *
 * Explains why a member login fails:
 *   npm run check:member-login -- --username aitchisong [--password password123]
 *
 * Reports: whether the login exists (and in which collection), whether the stored hash is a valid bcrypt
 * hash, whether the given password matches, the member's status (the portal only lets "active" members in),
 * and whether a `users` account with the same username/email would take priority.
 */
import "./load-env";
import { memberStatusString } from "../lib/members/statusValue";
import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";

const DB_NAME = process.env.DB_NAME || "hockey-app";
const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };

async function main() {
  const username = (arg("username") ?? "").trim();
  const password = arg("password") ?? process.env.MEMBER_LOGIN_PASSWORD?.trim() ?? "password123";
  if (!username) { console.error("Usage: npm run check:member-login -- --username <name> [--password <pw>]"); process.exit(1); }

  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db(DB_NAME);
  const rx = { $regex: `^${username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" };

  const user = await db.collection("users").findOne({ $or: [{ username: rx }, { email: username.toLowerCase() }] }, { projection: { username: 1, role: 1, passwordHash: 1 } });
  if (user) console.log(`! A "users" account matches "${username}" (role ${user.role}). The login route checks users FIRST, so its password is the one used.`);

  const members = await db.collection("members").find({ "auth.username": rx }, { projection: { memberId: 1, personalInfo: 1, status: 1, membership: 1, auth: 1 } }).toArray();
  console.log(`members with auth.username "${username}": ${members.length}`);
  for (const m of members) {
    const hash: string = m.auth?.passwordHash ?? "";
    const status = memberStatusString(m);
    if (m.status && typeof m.status === "object") console.log(`  note: member.status is an object with keys: ${Object.keys(m.status).join(", ")}`);
    console.log(`\n${m.memberId}  ${m.personalInfo?.firstName} ${m.personalInfo?.lastName}`);
    console.log(`  auth.role: ${m.auth?.role}   forcePasswordChange: ${m.auth?.forcePasswordChange}`);
    console.log(`  hash present: ${!!hash}   looks like bcrypt: ${/^\$2[aby]\$\d\d\$/.test(hash)}`);
    console.log(`  password "${password === "password123" ? "password123 (default)" : "(the one you passed)"}" matches: ${hash ? await bcrypt.compare(password, hash) : "n/a"}`);
    console.log(`  member status: "${status}" -> ${!status || status.toLowerCase() === "active" ? "allowed" : 'BLOCKED: login requires status "active"'}`);
  }
  if (members.length === 0 && !user) console.log("No login found with that username.");
  await client.close();
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
