/**
 * scripts/backfill-registrations.ts   (DRY-RUN by default — nothing changes without --apply)
 *
 * Fees come from each club's and association's own fee list (`fees[]`, see npm run seed:fee-lists); a level
 * with no list yet falls back to the starter list.
 *
 * Registers every member at the club and at every association above the club (city/region, state,
 * national), with a registration category and itemised fees (see lib/registrations/pricing.ts):
 *   junior (under 18 in the season year) $20 per level · senior $100 per level ·
 *   other (umpire/coach/official) $20 per level · volunteer $0, club level only.
 * The club registration carries the full itemised stack; each association registration holds its own line.
 *
 *   npm run backfill:registrations -- [--season 2026] [--club <clubId>] [--apply]
 *
 * - New registrations are inserted. Ones this script made earlier (source "backfill") are refreshed with
 *   the category/fees. Registrations from any other source (online, import, Altius) are never touched.
 * - Status is "active" for Active/Life members, otherwise "inactive". Members with no club are skipped.
 */
import "./load-env";
import { MongoClient } from "mongodb";
import { buildRegistrations, memberClubId } from "../lib/members/registrationBackfill";
import type { Level } from "../lib/registrations/pricing";

const DB_NAME = process.env.DB_NAME || "hockey-app";
const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
type Doc = Record<string, any>;

async function main() {
  const season = parseInt(arg("season") ?? String(new Date().getFullYear()), 10);
  const onlyClub = arg("club");
  const apply = process.argv.includes("--apply");
  const now = new Date();

  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db(DB_NAME);

  const assocs = await db.collection("associations").find({}, { projection: { associationId: 1, name: 1, parentAssociationId: 1, fees: 1 } }).toArray();
  const assocById = new Map(assocs.map((a) => [String(a.associationId), a]));
  const depth = (id: string): number => { let d = 0, cur = assocById.get(id); const seen = new Set<string>(); while (cur?.parentAssociationId && !seen.has(String(cur.associationId))) { seen.add(String(cur.associationId)); d++; cur = assocById.get(String(cur.parentAssociationId)); } return d; };

  const clubs = await db.collection("clubs").find({}, { projection: { id: 1, clubId: 1, name: 1, parentAssociationId: 1, fees: 1 } }).toArray();
  const levelsByClub = new Map<string, Level[]>();
  for (const c of clubs) {
    const levels: Level[] = [{ kind: "club", id: String(c.id ?? c.clubId), name: String(c.name ?? c.id), fees: c.fees }];
    let cur = c.parentAssociationId ? assocById.get(String(c.parentAssociationId)) : undefined;
    const seen = new Set<string>();
    while (cur && !seen.has(String(cur.associationId))) {
      seen.add(String(cur.associationId));
      levels.push({ kind: "association", id: String(cur.associationId), name: String(cur.name ?? cur.associationId), hierarchyLevel: depth(String(cur.associationId)), fees: cur.fees });
      cur = cur.parentAssociationId ? assocById.get(String(cur.parentAssociationId)) : undefined;
    }
    for (const k of [c.id, c.clubId]) if (k) levelsByClub.set(String(k), levels.map((l) => (l.kind === "club" ? { ...l, id: String(k) } : l)));
  }

  const members = await db.collection("members").find({}, { projection: { memberId: 1, clubId: 1, roles: 1, createdAt: 1, membership: 1, personalInfo: 1 } }).toArray();
  const club: Doc[] = [], assoc: Doc[] = [];
  const tally: Record<string, number> = {};
  let skipped = 0, total = 0;
  for (const m of members as any[]) {
    if (onlyClub && memberClubId(m) !== onlyClub) continue;
    const r = buildRegistrations(m, { season, levelsByClub, now });
    if (!r) { skipped++; continue; }
    club.push(r.club); assoc.push(...r.associations);
    tally[r.club.registrationCategory] = (tally[r.club.registrationCategory] ?? 0) + 1;
    total += r.club.totalFee;
  }

  const lookup = async (col: string, docs: Doc[]) =>
    new Map((await db.collection(col).find({ registrationId: { $in: docs.map((d) => d.registrationId) } }, { projection: { registrationId: 1, source: 1 } }).toArray()).map((x) => [x.registrationId, x.source]));
  const haveClub = await lookup("club-registrations", club);
  const haveAssoc = await lookup("association-registrations", assoc);
  const plan = (docs: Doc[], have: Map<string, unknown>) => ({
    insert: docs.filter((d) => !have.has(d.registrationId)),
    refresh: docs.filter((d) => have.get(d.registrationId) === "backfill"),
    keep: docs.filter((d) => have.has(d.registrationId) && have.get(d.registrationId) !== "backfill"),
  });
  const pc = plan(club, haveClub), pa = plan(assoc, haveAssoc);

  console.log(`Season ${season}${onlyClub ? `, club ${onlyClub}` : ""}   Members read: ${members.length} (skipped, no club: ${skipped})`);
  console.log(`Categories: ${Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  console.log(`Total itemised fees across all levels: $${total.toLocaleString()} AUD`);
  console.log(`Club registrations:        ${pc.insert.length} new, ${pc.refresh.length} refreshed, ${pc.keep.length} left alone (other source)`);
  console.log(`Association registrations: ${pa.insert.length} new, ${pa.refresh.length} refreshed, ${pa.keep.length} left alone (other source)`);

  if (!apply) { console.log("\nDRY RUN — nothing changed. Add --apply to write."); await client.close(); return; }

  const write = async (col: string, p: ReturnType<typeof plan>) => {
    const ops = [
      ...p.insert.map((d) => ({ updateOne: { filter: { registrationId: d.registrationId }, update: { $setOnInsert: { ...d, createdAt: now, createdBy: "backfill-registrations", updatedAt: now } }, upsert: true } })),
      ...p.refresh.map((d) => ({ updateOne: { filter: { registrationId: d.registrationId, source: "backfill" }, update: { $set: { ...d, updatedAt: now } } } })),
    ];
    for (let i = 0; i < ops.length; i += 500) await db.collection(col).bulkWrite(ops.slice(i, i + 500) as any, { ordered: false });
  };
  await write("club-registrations", pc);
  await write("association-registrations", pa);
  console.log("\nDone.");
  await client.close();
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
