/**
 * scripts/normalize-members.ts
 *
 * Renames member ids from `MBR-ALT-<n>` to `MBR_<n>` in `members` and in every
 * collection that refers to them, and replaces the vendor-named `altius` field on
 * members with proper fields (playerInfo.appearances, officiating, ...).
 *
 *   npm run normalize:members                       # DRY RUN: report only
 *   npm run normalize:members -- --apply --confirm-db <DB_NAME>
 *
 * Run `npm run dedupe:members` first (merge duplicates), then this.
 *
 * Safety: dry run by default; --apply needs --confirm-db; a full JSON backup of every
 * document that will change is written BEFORE any write; audit/log collections keep
 * the ids they recorded; renames whose new id already exists are skipped and listed.
 */
import "./load-env";
import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";
import { runNormalize } from "../lib/members/normalizeRunner";
import type { DbLike } from "../lib/members/dedupeRunner";

const argv = process.argv.slice(2);
const flag = (n: string) => argv.includes(n);
const opt = (n: string) => {
  const i = argv.indexOf(n);
  return i >= 0 ? argv[i + 1] : undefined;
};

const APPLY = flag("--apply");
const OUT_DIR = path.resolve(opt("--out") ?? "dedupe-output");
const DB_NAME = process.env.DB_NAME || "hockey-app";

async function main() {
  if (APPLY && opt("--confirm-db") !== DB_NAME) {
    throw new Error(`--apply needs --confirm-db ${DB_NAME} (guards against the wrong database).`);
  }
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  console.log(`Database: ${DB_NAME}   Mode: ${APPLY ? "APPLY" : "dry run (no changes)"}\n`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const result = await runNormalize(client.db(DB_NAME) as unknown as DbLike, {
    apply: APPLY,
    writeBackup: (b) => {
      const f = path.join(OUT_DIR, `normalize-backup-${stamp}.json`);
      fs.writeFileSync(f, JSON.stringify(b));
      console.log(`Backup written to ${f}`);
    },
  });

  console.log(`Member ids to rename: ${result.renames.length}`);
  for (const r of result.renames.slice(0, 15)) console.log(`  ${r.from}  ->  ${r.to}`);
  if (result.renames.length > 15) console.log(`  … and ${result.renames.length - 15} more`);
  if (result.collisions.length) {
    console.log(`\nSKIPPED (new id already exists - run the merge first or check by hand): ${result.collisions.length}`);
    for (const c of result.collisions.slice(0, 15)) console.log(`  ${c.from}  ->  ${c.to}`);
  }
  console.log("\nDocuments changed: " + (Object.entries(result.changedDocs).map(([c, n]) => `${c} (${n})`).join(", ") || "none"));
  const hist = Object.entries(result.historyOnly);
  if (hist.length) console.log("Left as recorded (history/audit): " + hist.map(([c, n]) => `${c} (${n})`).join(", "));
  const rem = Object.entries(result.remainingMentions);
  if (rem.length) {
    console.log("\nStill mention the old system after this change (not renamed here):");
    for (const [k, n] of rem.slice(0, 25)) console.log(`  ${k}  ×${n}`);
  }

  const planFile = path.join(OUT_DIR, `normalize-plan-${stamp}.json`);
  fs.writeFileSync(planFile, JSON.stringify({ db: DB_NAME, ...result }, null, 2));
  console.log(`\nPlan written to ${planFile}`);
  console.log(APPLY ? `\nDone: ${result.changed} document(s) updated.` : `\nDry run only. Re-run with: npm run normalize:members -- --apply --confirm-db ${DB_NAME}`);
  await client.close();
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
