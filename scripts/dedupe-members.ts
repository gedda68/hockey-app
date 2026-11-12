/**
 * scripts/dedupe-members.ts
 *
 * Finds duplicate members (the Players list is a view over `members`, so this covers
 * players too), merges each set into one record, re-points every reference to the
 * removed ids across ALL collections, and removes the extras.
 *
 *   npm run dedupe:members                       # DRY RUN: report only, changes nothing
 *   npm run dedupe:members -- --apply --confirm-db <DB_NAME>
 *
 * Options
 *   --allow-missing-dob   also merge records that have no date of birth (see docs)
 *   --merge-undated       same name, some records have a birthday and some don't: keep the one
 *                         with the birthday, merge the undated ones into it
 *   --merge-generated-staff  for data with no birthdays: merge generated MBR-ALT-STAFF-/OFF-
 *                         records into the one player record that has the same name
 *   --merge-same-name     nobody with this name has a birthday: treat them as one person, unless
 *                         the records are in different clubs (those are listed for review)
 *   --out <dir>           where the plan/backup JSON is written (default ./dedupe-output)
 *
 * Safety
 *   - Dry run by default. --apply also needs --confirm-db matching the database name.
 *   - A full JSON backup of every document that will change is written BEFORE any write.
 *   - Removed members are moved to `members_merged_backup`, not destroyed, and each
 *     merge is recorded in `member_merge_log`.
 *   - Safe to re-run: merged ids no longer exist, so nothing is applied twice.
 *   - Groups that need a human (no birthday, or several logins) are listed, not merged.
 */
import "./load-env";
import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";
import { runDedupe, type DbLike } from "../lib/members/dedupeRunner";

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

  const result = await runDedupe(client.db(DB_NAME) as unknown as DbLike, {
    apply: APPLY,
    allowMissingDob: flag("--allow-missing-dob"),
    mergeGeneratedShadows: flag("--merge-generated-staff"),
    attachUndatedToDated: flag("--merge-undated"),
    mergeSameName: flag("--merge-same-name"),
    writeBackup: (backup) => {
      const f = path.join(OUT_DIR, `backup-${stamp}.json`);
      fs.writeFileSync(f, JSON.stringify(backup));
      console.log(`Backup written to ${f}`);
    },
  });

  const name = (id: string, plan: (typeof result.plans)[number]) => {
    const d = plan.details[id];
    return `${id}  club=${d?.clubId || "-"}  roles=${d?.roles.join(",") || "-"}  refs=${plan.referenceCounts[id] ?? 0}`;
  };
  for (const p of result.plans) {
    console.log(`• ${p.group.nameKey.replace("|", " ")}  DOB ${p.group.dateOfBirth || "n/a"}  — ${p.group.reason}`);
    console.log(`    KEEP   ${name(p.survivorId, p)}   [${p.survivorWhy.join("; ") || "tie-break by id"}]`);
    for (const id of p.loserIds) console.log(`    MERGE  ${name(id, p)}`);
    if (p.blocked) console.log(`    SKIPPED: ${p.blocked}`);
  }
  if (result.review.length) {
    console.log("\nNeeds review (not merged):");
    for (const g of result.review) console.log(`  • ${g.nameKey}  ${g.reason}: ${g.memberIds.join(", ")}`);
  }
  const hist = Object.entries(result.historyOnly);
  if (hist.length) console.log("\nLeft as recorded (history/audit): " + hist.map(([c, n]) => `${c} (${n})`).join(", "));

  const planFile = path.join(OUT_DIR, `plan-${stamp}.json`);
  fs.writeFileSync(planFile, JSON.stringify({ db: DB_NAME, ...result }, null, 2));
  console.log(`\nPlan written to ${planFile}`);

  const runnable = result.plans.filter((p) => !p.blocked).length;
  if (APPLY) {
    console.log(`\nDone: ${result.merged} group(s) merged, ${result.referencesRewritten} reference(s) re-pointed.`);
  } else {
    console.log(`\nDry run only. ${runnable} group(s) would be merged. Re-run with: npm run dedupe:members -- --apply --confirm-db ${DB_NAME}`);
  }
  await client.close();
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
