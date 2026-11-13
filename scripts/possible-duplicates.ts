/**
 * scripts/possible-duplicates.ts   (READ-ONLY — never changes data)
 *
 * Lists members who are probably the same person but were NOT exact name matches: same birthday with
 * a similar name, swapped first/last names, typos, short forms (Matt/Matthew), shared email/phone.
 *
 *   npm run possible:duplicates
 *
 * Writes possible-duplicates-<stamp>.csv (confidence, reason, ids, names, birthdays, clubs) to ./dedupe-output.
 */
import "./load-env";
import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";
import { findPossibleDuplicates } from "../lib/members/possibleDuplicates";

const DB_NAME = process.env.DB_NAME || "hockey-app";
const csv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db(DB_NAME);
  const members = await db.collection("members").find({}, { projection: { memberId: 1, personalInfo: 1, contact: 1, membership: 1, clubId: 1 } }).toArray();
  const clubs = await db.collection("clubs").find({}, { projection: { id: 1, clubId: 1, name: 1 } }).toArray();
  const clubName = new Map<string, string>();
  for (const c of clubs) for (const k of [c.id, c.clubId]) if (k) clubName.set(String(k), String(c.name ?? ""));
  const byId = new Map(members.map((m) => [String(m.memberId), m]));

  const found = findPossibleDuplicates(members as any[]);
  const out = path.resolve("dedupe-output");
  fs.mkdirSync(out, { recursive: true });
  const file = path.join(out, `possible-duplicates-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`);
  const rows = [["confidence", "reason", "memberIds", "names", "dateOfBirth", "clubs", "emails"].join(",")];
  for (const f of found) {
    const ms = f.memberIds.map((id) => byId.get(id)!);
    const g = (m: any) => `${m.personalInfo?.firstName ?? ""} ${m.personalInfo?.lastName ?? ""}`.trim();
    rows.push([
      f.confidence, f.reason, f.memberIds.join(" | "),
      ms.map(g).join(" | "),
      ms.map((m) => String(m.personalInfo?.dateOfBirth ?? "").slice(0, 10) || "-").join(" | "),
      ms.map((m) => clubName.get(String(m.membership?.clubId ?? m.clubId ?? "")) || "-").join(" | "),
      ms.map((m) => m.contact?.primaryEmail ?? m.contact?.email ?? "-").join(" | "),
    ].map(csv).join(","));
  }
  fs.writeFileSync(file, rows.join("\n"));
  const n = (c: string) => found.filter((f) => f.confidence === c).length;
  console.log(`Members checked: ${members.length}`);
  console.log(`Possible duplicate pairs: ${found.length}  (high ${n("high")}, medium ${n("medium")}, low ${n("low")})`);
  console.log(`Report: ${file}`);
  await client.close();
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
