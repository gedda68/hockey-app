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
 *   --confirm-people <csv>  a review CSV (see review-*.csv written by each run) where the
 *                         same_person column is yes: those groups are merged as one person
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

/** Reads a review CSV and returns the nameKeys marked same_person = yes. */
function readConfirmed(file: string | undefined): string[] {
  if (!file) return [];
  const rows = fs.readFileSync(path.resolve(file), "utf8").split(/\r?\n/).filter(Boolean);
  const split = (l: string) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"'));
  const head = split(rows[0]).map((h) => h.trim().toLowerCase());
  const ni = head.indexOf("namekey");
  const si = head.indexOf("same_person");
  if (ni < 0 || si < 0) throw new Error("CSV needs nameKey and same_person columns.");
  return rows.slice(1).map(split).filter((r) => /^(y|yes|true|1)$/i.test((r[si] ?? "").trim())).map((r) => r[ni].trim());
}
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
    confirmedNameKeys: readConfirmed(opt("--confirm-people")),
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

  if (result.review.length) {
    const clubs = new Map<string, string>();
    for (const c of await client.db(DB_NAME).collection("clubs").find({}).toArray()) {
      const nm = String(c.name ?? c.shortName ?? "");
      for (const k of [c.id, c.clubId, c.slug]) if (k) clubs.set(String(k), nm);
    }
    const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = ["nameKey,same_person,memberIds,clubs,roles"];
    for (const g of result.review) {
      const docs = await client.db(DB_NAME).collection("members").find({ memberId: { $in: g.memberIds } }).toArray();
      const cl = [...new Set(docs.map((d) => clubs.get(String(d.clubId ?? d.membership?.clubId ?? "")) || String(d.clubId ?? d.membership?.clubId ?? "-")))];
      const ro = [...new Set(docs.flatMap((d) => (d.roles as string[]) ?? []))];
      lines.push([q(g.nameKey), "", q(g.memberIds.join(" ")), q(cl.join(" / ")), q(ro.join(" "))].join(","));
    }
    const csv = path.join(OUT_DIR, `review-${stamp}.csv`);
    fs.writeFileSync(csv, lines.join("\n"));
    console.log(`Review sheet written to ${csv} (put yes in same_person, then re-run with --confirm-people <that file>)`);
  }

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
