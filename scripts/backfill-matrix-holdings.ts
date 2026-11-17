/**
 * scripts/backfill-matrix-holdings.ts   (DRY-RUN by default — nothing is written without --apply)
 *
 * Gives every member the Roles & Access Matrix holdings (members.roleHoldings) that match the older roles
 * they already hold (members.roles[]), so the two systems agree. Existing holdings are never changed, and a
 * legacy role is only mapped when the matrix role covers the same ground. Roles that need a person to choose
 * (club-wide coach/manager -> which teams, association selector -> which squads) are listed for review and
 * left exactly as they are.
 *
 *   npm run backfill:matrix-holdings -- [--club <clubId>] [--limit 500] [--apply]
 *
 * Dry run writes ./matrix-backfill-output/<stamp>-{summary,add,review}.csv.
 * --apply first writes the affected members' roleHoldings to ./matrix-backfill-backups/<stamp>.json, then
 * appends the new holdings (each marked source "legacy-migration"). Re-running is safe.
 */
import "./load-env";
import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";
import { planMemberHoldings, type LegacyAssignment, type MigratedHolding } from "../lib/access/legacyMapping";
import { contextFromTeams, teamClubLookup } from "../lib/access/legacySync";
import { normalizeMemberRoles } from "../lib/auth/memberRoles";

const DB_NAME = process.env.DB_NAME || "hockey-app";
const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const csv = (rows: unknown[][]) => rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");

/** Same reading the sign-in uses: structured assignments as-is, plain text roles ("role-player") scoped to the member's club. */
const clubOf = (m: any): string | null => m.clubId || m.membership?.clubId || null;
const assignmentsFor = (m: any): LegacyAssignment[] => normalizeMemberRoles(m.roles, clubOf(m)) as unknown as LegacyAssignment[];

async function main() {
  const apply = process.argv.includes("--apply");
  const club = arg("club");
  const limit = Number(arg("limit") ?? 0) || 0;
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db(DB_NAME);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  const filter: Record<string, unknown> = { "roles.0": { $exists: true } };
  if (club) filter.clubId = club;
  let cursor = db.collection("members").find(filter, { projection: { memberId: 1, clubId: 1, "membership.clubId": 1, roles: 1, roleHoldings: 1, "personalInfo.firstName": 1, "personalInfo.lastName": 1 } });
  if (limit) cursor = cursor.limit(limit);
  const members = await cursor.toArray();

  const teamIds = members.flatMap((m) => assignmentsFor(m).filter((a) => a.scopeType === "team").map((a) => a.scopeId ?? ""));
  const teamClub = await teamClubLookup(db, teamIds);
  const ctxFor = contextFromTeams(teamClub);

  const adds: { memberId: string; name: string; holding: MigratedHolding }[] = [];
  const reviews: unknown[][] = [];
  const counts = new Map<string, number>();
  const reviewCounts = new Map<string, number>();
  const skipCounts = new Map<string, number>();
  let alreadyHeld = 0;

  for (const m of members) {
    const name = `${m.personalInfo?.firstName ?? ""} ${m.personalInfo?.lastName ?? ""}`.trim();
    const plan = planMemberHoldings(assignmentsFor(m), Array.isArray(m.roleHoldings) ? m.roleHoldings : [], ctxFor);
    alreadyHeld += plan.alreadyHeld;
    for (const h of plan.add) {
      adds.push({ memberId: m.memberId, name, holding: h });
      counts.set(`${h.legacyRole} -> ${h.roleKey}`, (counts.get(`${h.legacyRole} -> ${h.roleKey}`) ?? 0) + 1);
    }
    for (const r of plan.review) {
      reviews.push([m.memberId, name, clubOf(m), r.assignment.role, r.assignment.scopeType, r.assignment.scopeId, r.reason]);
      reviewCounts.set(`${r.assignment.role} (${r.assignment.scopeType}): ${r.reason}`, (reviewCounts.get(`${r.assignment.role} (${r.assignment.scopeType}): ${r.reason}`) ?? 0) + 1);
    }
    for (const s of plan.skipped) skipCounts.set(`${s.assignment.role}: ${s.reason}`, (skipCounts.get(`${s.assignment.role}: ${s.reason}`) ?? 0) + 1);
  }

  const shape = { structured: 0, text: 0, unreadable: 0 };
  for (const m of members) {
    const roles = Array.isArray(m.roles) ? m.roles : [];
    if (roles.some((r: unknown) => r && typeof r === "object")) shape.structured++;
    else if (roles.some((r: unknown) => typeof r === "string")) shape.text++;
    if (assignmentsFor(m).length === 0) shape.unreadable++;
  }
  console.log(`Members with a roles list: ${members.length} (structured roles: ${shape.structured}, text-only roles: ${shape.text}, nothing readable: ${shape.unreadable})`);
  console.log(`Holdings to add: ${adds.length} (already held: ${alreadyHeld})`);
  for (const [k, n] of [...counts].sort()) console.log(`  ${String(n).padStart(6)}  ${k}`);
  console.log(`Needs a person to decide: ${reviews.length}`);
  for (const [k, n] of [...reviewCounts].sort()) console.log(`  ${String(n).padStart(6)}  ${k}`);
  console.log(`Skipped (no matrix equivalent, inactive or expired):`);
  for (const [k, n] of [...skipCounts].sort()) console.log(`  ${String(n).padStart(6)}  ${k}`);

  if (!apply) {
    const dir = path.resolve("matrix-backfill-output");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${stamp}-summary.csv`), csv([["mapping", "members"], ...[...counts].sort()]));
    fs.writeFileSync(path.join(dir, `${stamp}-add.csv`), csv([["memberId", "name", "legacyRole", "matrixRole", "orgType", "orgId", "teamIds", "season"], ...adds.map(({ memberId, name, holding: h }) => [memberId, name, h.legacyRole, h.roleKey, h.orgType, h.orgId, (h.teamIds ?? []).join(" "), h.season])]));
    fs.writeFileSync(path.join(dir, `${stamp}-review.csv`), csv([["memberId", "name", "clubId", "legacyRole", "scopeType", "scopeId", "reason"], ...reviews]));
    console.log(`\nReports written to ${dir}\nDRY RUN — nothing changed. Add --apply to write the holdings (a backup is written first).`);
    await client.close();
    return;
  }

  if (!adds.length) { console.log("Nothing to add."); await client.close(); return; }
  const byMember = new Map<string, MigratedHolding[]>();
  for (const a of adds) byMember.set(a.memberId, [...(byMember.get(a.memberId) ?? []), a.holding]);
  const dir = path.resolve("matrix-backfill-backups");
  fs.mkdirSync(dir, { recursive: true });
  const before = await db.collection("members").find({ memberId: { $in: [...byMember.keys()] } }, { projection: { memberId: 1, roleHoldings: 1 } }).toArray();
  const backup = path.join(dir, `${stamp}.json`);
  fs.writeFileSync(backup, JSON.stringify(before, null, 2));
  console.log(`\nBackup written: ${backup}`);
  let done = 0;
  for (const [memberId, holdings] of byMember) {
    await db.collection("members").updateOne({ memberId }, { $push: { roleHoldings: { $each: holdings } } as never, $set: { updatedAt: new Date() }, $inc: { roleVersion: 1 } });
    done++;
  }
  console.log(`Updated ${done} members with ${adds.length} holdings.`);
  await client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
