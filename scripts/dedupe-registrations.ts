/**
 * scripts/dedupe-registrations.ts   (DRY-RUN by default — nothing is deleted without --apply)
 *
 * Finds duplicate club and association registrations (same member + same club/association + same season,
 * whatever their registrationId or source) and removes the extras, keeping the best one: records from a
 * real source beat backfilled ones, then active, then ones with fees, then the most recently updated.
 * If the kept record has no fees but a removed one does (e.g. an imported registration next to a priced
 * backfilled one), the fees, total, category and roles are merged into the kept record first.
 * A registration an administrator has edited fees on is never discarded in favour of an unedited one.
 *
 *   npm run dedupe:registrations -- [--season 2026] [--apply]
 *
 * --apply first writes every record it will delete to ./registration-dedupe-backups/<stamp>.json.
 * A dry run writes registration-duplicates-<stamp>.csv to ./dedupe-output so you can review it.
 */
import "./load-env";
import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";
import { planDedupe } from "../lib/registrations/dedupe";

const DB_NAME = process.env.DB_NAME || "hockey-app";
const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };

async function main() {
  const apply = process.argv.includes("--apply");
  const season = arg("season");
  const filter = season ? { seasonYear: { $in: [Number(season), String(season)] } } : {};
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db(DB_NAME);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  const plans = [] as { col: string; remove: Record<string, any>[]; updates: { _id: unknown; set: Record<string, any> }[]; groups: number }[];
  for (const [col, kind] of [["club-registrations", "club"], ["association-registrations", "association"]] as const) {
    const docs = await db.collection(col).find(filter).toArray();
    const p = planDedupe(docs, kind);
    plans.push({ col, remove: p.remove, updates: p.updates, groups: p.groupsWithDupes });
    console.log(`${col}: ${docs.length} records, ${p.groupsWithDupes} duplicated registrations, ${p.remove.length} extra records to remove, ${p.updates.length} kept records get fees/roles merged in`);
  }
  const total = plans.reduce((n, p) => n + p.remove.length, 0);

  if (!apply) {
    const dir = path.resolve("dedupe-output");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `registration-duplicates-${stamp}.csv`);
    const rows = ["collection,registrationId,memberId,clubOrAssociation,season,source,status"];
    for (const p of plans) for (const d of p.remove) rows.push([p.col, d.registrationId, d.memberId, d.clubId ?? d.associationId, d.seasonYear, d.source ?? "", d.status].map((v) => `"${String(v ?? "")}"`).join(","));
    fs.writeFileSync(file, rows.join("\n"));
    console.log(`\nRecords that would be removed: ${file}\nDRY RUN — nothing deleted. Add --apply to remove them (a backup is written first).`);
    await client.close();
    return;
  }
  if (total === 0) { console.log("Nothing to remove."); await client.close(); return; }
  const dir = path.resolve("registration-dedupe-backups");
  fs.mkdirSync(dir, { recursive: true });
  const backup = path.join(dir, `${stamp}.json`);
  // Backup the records being removed AND the originals of kept records that get merged into.
  const keeperIds = new Map<string, unknown[]>(plans.map((p) => [p.col, p.updates.map((u) => u._id)]));
  const keepers = await Promise.all(plans.map((p) => db.collection(p.col).find({ _id: { $in: keeperIds.get(p.col) as any[] } }).toArray()));
  fs.writeFileSync(backup, JSON.stringify(plans.map((p, i) => ({ collection: p.col, records: p.remove, keptBeforeMerge: keepers[i] })), null, 2));
  console.log(`\nBackup written: ${backup}`);
  for (const p of plans) {
    if (!p.remove.length) continue;
    for (const u of p.updates) await db.collection(p.col).updateOne({ _id: u._id as any }, { $set: { ...u.set, updatedAt: new Date() } });
    const r = await db.collection(p.col).deleteMany({ _id: { $in: p.remove.map((d) => d._id) } });
    console.log(`${p.col}: removed ${r.deletedCount}`);
  }
  await client.close();
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
