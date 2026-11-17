/**
 * scripts/link-users-to-members.ts   (DRY-RUN by default — nothing is written without --apply)
 *
 * Staff logins live in the `users` collection and have no member record, so they can't hold Roles & Access
 * Matrix roles, get notifications or use the personal screens. This links each login to the member record of the
 * same person (users.memberId), without changing any password or role.
 *
 *   npm run link:users -- [--apply] [--map username=MBR-000123 ...]
 *
 * Linked automatically: the login already names exactly one member (linkedMembers), or exactly one member has its email address.
 * Listed for you to decide: several members share the email, or only the name matches (give it with --map).
 * Dry run writes ./user-link-output/<stamp>.csv. --apply first saves the logins it will change to
 * ./user-link-backups/<stamp>.json, then sets memberId / memberRef. Re-running is safe. Linked people sign in again
 * to pick it up.
 */
import "./load-env";
import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";
import { planLinks, resolveManual, type LinkDecision } from "../lib/auth/linkUsers";

const DB_NAME = process.env.DB_NAME || "hockey-app";
const csv = (rows: unknown[][]) => rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");

async function main() {
  const apply = process.argv.includes("--apply");
  const manual = process.argv.flatMap((a, i, all) => (all[i - 1] === "--map" ? [a] : []));
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db(DB_NAME);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  const users = await db.collection("users").find({}, { projection: { userId: 1, username: 1, email: 1, firstName: 1, lastName: 1, clubId: 1, memberId: 1, role: 1, linkedMembers: 1 } }).toArray();
  const members = await db.collection("members").find({}, { projection: { memberId: 1, clubId: 1, "membership.clubId": 1, "personalInfo.firstName": 1, "personalInfo.lastName": 1, "personalInfo.email": 1, "contact.primaryEmail": 1, "contact.email": 1, "auth.email": 1 } }).toArray();

  const decisions: LinkDecision[] = planLinks(users, members);
  for (const m of manual) {
    const [username, memberId] = m.split("=");
    const d = resolveManual(username ?? "", memberId ?? "", users, members);
    const i = decisions.findIndex((x) => x.username.toLowerCase() === (username ?? "").toLowerCase());
    if (i >= 0) decisions[i] = d; else decisions.push(d);
  }

  const counts = decisions.reduce<Record<string, number>>((a, d) => ({ ...a, [d.status]: (a[d.status] ?? 0) + 1 }), {});
  console.log(`${users.length} logins:`, counts);
  const roleOf = new Map(users.map((u) => [String(u.userId ?? u._id), String(u.role ?? "")]));
  const outDir = path.resolve("user-link-output");
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${stamp}.csv`);
  fs.writeFileSync(file, csv([["username", "role", "status", "memberId", "memberName", "reason"], ...decisions.map((d) => [d.username, roleOf.get(d.userId) ?? "", d.status, d.memberId ?? "", d.memberName ?? "", d.reason])]));
  console.log(`Wrote ${file}`);

  const toLink = decisions.filter((d) => d.status === "link");
  if (!apply) { console.log(`Dry run: ${toLink.length} logins would be linked. Re-run with --apply to write.`); await client.close(); return; }

  const backupDir = path.resolve("user-link-backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const ids = new Set(toLink.map((d) => d.userId));
  fs.writeFileSync(path.join(backupDir, `${stamp}.json`), JSON.stringify(users.filter((u) => ids.has(String(u.userId ?? u._id))), null, 2));
  let n = 0;
  for (const d of toLink) {
    const u = users.find((x) => String(x.userId ?? x._id) === d.userId)!;
    const r = await db.collection("users").updateOne({ _id: u._id, memberId: { $exists: false } }, { $set: { memberId: d.memberObjectId, memberRef: d.memberId, linkedAt: new Date().toISOString() } });
    n += r.modifiedCount;
  }
  console.log(`Linked ${n} logins.`);
  await client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
