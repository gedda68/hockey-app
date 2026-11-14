/**
 * scripts/dedupe-registrations.ts   (DRY-RUN by default — nothing is deleted without --apply)
 *
 * Finds duplicate club and association registrations (same member + same club/association + same season,
 * whatever their registrationId or source) and removes the extras, keeping the best one: records from a
 * real source beat backfilled ones, then active, then ones with fees, then the most recently updated.
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

  const plans = [] as { col: string; remove: Record<string, any>[]; groups: number }[];
  for (const [col, kind] of [["club-registrations", "club"], ["association-registrations", "association"]] as const) {
    const docs = await db.collection(col).find(filter).toArray();
    const p = planDedupe(docs, kind);
    plans.push({ col, remove: p.remove, groups: p.groupsWithDupes });
    console.log(`${col}: ${docs.length} records, ${p.groupsWithDupes} duplicated registrations, ${p.remove.length} extra records to remove`);
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
  fs.writeFileSync(backup, JSON.stringify(plans.map((p) => ({ collection: p.col, records: p.remove })), null, 2));
  console.log(`\nBackup written: ${backup}`);
  for (const p of plans) {
    if (!p.remove.length) continue;
    const r = await db.collection(p.col).deleteMany({ _id: { $in: p.remove.map((d) => d._id) } });
    console.log(`${p.col}: removed ${r.deletedCount}`);
  }
  await client.close();
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
