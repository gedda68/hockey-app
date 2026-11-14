/**
 * scripts/backfill-registrations.ts   (DRY-RUN by default — nothing changes without --apply)
 *
 * Gives every member a club registration (and an association registration with the club's parent
 * association) for a season, so the Registrations card and registration lists are populated.
 *
 *   npm run backfill:registrations -- [--season 2026] [--club <clubId>] [--apply]
 *
 * - Existing registrations are never overwritten: documents are matched on a deterministic
 *   registrationId (CREG-<club>-<member>-<season>, AREG-<assoc>-<member>-<season>) and only
 *   inserted when missing, so re-running is safe.
 * - Status is "active" for Active/Life members, otherwise "inactive".
 * - Members with no club are skipped; clubs with no parentAssociationId get a club registration only.
 * - Writes to the club-registrations and association-registrations collections.
 */
import "./load-env";
import { MongoClient } from "mongodb";
import { buildRegistrations, memberClubId } from "../lib/members/registrationBackfill";

const DB_NAME = process.env.DB_NAME || "hockey-app";
const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };

async function main() {
  const season = parseInt(arg("season") ?? String(new Date().getFullYear()), 10);
  const onlyClub = arg("club");
  const apply = process.argv.includes("--apply");
  const now = new Date();

  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db(DB_NAME);

  const clubs = await db.collection("clubs").find({}, { projection: { id: 1, clubId: 1, parentAssociationId: 1 } }).toArray();
  const clubAssociation = new Map<string, string>();
  for (const c of clubs) for (const k of [c.id, c.clubId]) if (k && c.parentAssociationId) clubAssociation.set(String(k), String(c.parentAssociationId));

  const members = await db.collection("members").find({}, { projection: { memberId: 1, clubId: 1, roles: 1, createdAt: 1, membership: 1 } }).toArray();
  const club: Record<string, unknown>[] = [], assoc: Record<string, unknown>[] = [];
  let skipped = 0, noAssoc = 0;
  for (const m of members as any[]) {
    if (onlyClub && memberClubId(m) !== onlyClub) continue;
    const r = buildRegistrations(m, { season, clubAssociation, now });
    if (!r) { skipped++; continue; }
    club.push(r.club);
    if (r.association) assoc.push(r.association); else noAssoc++;
  }

  const existing = async (col: string, docs: Record<string, unknown>[]) =>
    new Set((await db.collection(col).find({ registrationId: { $in: docs.map((d) => d.registrationId) } }, { projection: { registrationId: 1 } }).toArray()).map((x) => x.registrationId));
  const haveClub = await existing("club-registrations", club);
  const haveAssoc = await existing("association-registrations", assoc);
  const newClub = club.filter((d) => !haveClub.has(d.registrationId));
  const newAssoc = assoc.filter((d) => !haveAssoc.has(d.registrationId));

  console.log(`Season ${season}${onlyClub ? `, club ${onlyClub}` : ""}`);
  console.log(`Members read: ${members.length}  (skipped, no club or id: ${skipped})`);
  console.log(`Club registrations:        ${newClub.length} new, ${haveClub.size} already exist`);
  console.log(`Association registrations: ${newAssoc.length} new, ${haveAssoc.size} already exist  (members whose club has no parent association: ${noAssoc})`);

  if (!apply) { console.log("\nDRY RUN — nothing changed. Add --apply to write."); await client.close(); return; }

  const write = async (col: string, docs: Record<string, unknown>[]) => {
    for (let i = 0; i < docs.length; i += 500) {
      await db.collection(col).bulkWrite(
        docs.slice(i, i + 500).map((d) => ({ updateOne: { filter: { registrationId: d.registrationId }, update: { $setOnInsert: { ...d, createdAt: now, createdBy: "backfill-registrations", updatedAt: now } }, upsert: true } })),
        { ordered: false },
      );
    }
  };
  await write("club-registrations", newClub);
  await write("association-registrations", newAssoc);
  console.log(`\nWrote ${newClub.length} club and ${newAssoc.length} association registrations.`);
  await client.close();
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
