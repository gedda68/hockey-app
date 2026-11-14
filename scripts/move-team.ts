/**
 * scripts/move-team.ts   (DRY-RUN by default — nothing changes without --apply)
 *
 * Moves one team (with its players and staff) from one division roster to another, e.g. the team
 * named BHL2 that was created inside the BHL1 roster -> into the BHL2 roster.
 *
 *   npm run move:team -- --team BHL2 --from BHL1 --to BHL2 [--club <clubId>] [--season 2026]
 *                        [--category senior] [--gender male] [--create-target] [--apply]
 *
 * - Without --apply it only prints the plan.
 * - With --apply it first writes a JSON backup of both rosters (and the affected member
 *   selection history) to ./move-team-backups, then moves the team and re-points each member's
 *   teamSelectionHistory (rosterId / division) for that team.
 * - The target roster must already exist (same club, season, category, gender); pass
 *   --create-target to create an empty one when it doesn't.
 * - Refuses if the target already has a team with the same name.
 */
import "./load-env";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";

const DB_NAME = process.env.DB_NAME || "hockey-app";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (n: string) => process.argv.includes(`--${n}`);

async function main() {
  const team = arg("team"), from = arg("from"), to = arg("to");
  if (!team || !from || !to) {
    console.error("Usage: npm run move:team -- --team BHL2 --from BHL1 --to BHL2 [--club id] [--season 2026] [--category senior] [--gender male] [--create-target] [--apply]");
    process.exit(1);
  }
  const season = arg("season") ?? String(new Date().getFullYear());
  const apply = flag("apply");

  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db(DB_NAME);
  const rosters = db.collection("teamRosters");

  const base: Record<string, unknown> = { season };
  if (arg("club")) base.clubId = arg("club");
  if (arg("category")) base.category = arg("category");
  if (arg("gender")) base.gender = arg("gender");

  const sources = await rosters.find({ ...base, division: from, "teams.name": team }).toArray();
  if (sources.length === 0) { console.log(`No ${from} roster with a team named "${team}" for ${season}.`); await client.close(); return; }
  if (sources.length > 1) {
    console.log(`More than one matching source roster — narrow with --club/--category/--gender:`);
    for (const s of sources) console.log(`  ${s.id}  club=${s.clubId} ${s.category} ${s.gender}`);
    await client.close(); process.exit(1);
  }
  const src = sources[0];
  const moving = (src.teams as any[]).filter((t) => t.name === team);
  if (moving.length !== 1) { console.log(`Expected exactly one "${team}" team in the source roster, found ${moving.length}.`); await client.close(); process.exit(1); }
  const t = moving[0];

  let dst = await rosters.findOne({ season, clubId: src.clubId, category: src.category, gender: src.gender, division: to });
  console.log(`Source roster : ${src.id}  (${from} ${src.category} ${src.gender}, club ${src.clubId}, ${(src.teams as any[]).length} team(s))`);
  console.log(`Team to move  : "${team}" — ${(t.players ?? []).length} player(s), staff: ${t.coach ? "coach " : ""}${t.assistantCoach ? "asst " : ""}${t.manager ? "manager" : ""}`.trim());
  if (!dst) {
    console.log(`Target roster : none found for ${to}${flag("create-target") ? " — will be CREATED" : " — re-run with --create-target to create it"}`);
    if (!flag("create-target")) { await client.close(); return; }
  } else {
    console.log(`Target roster : ${dst.id}  (${to}, ${(dst.teams as any[]).length} team(s))`);
    if ((dst.teams as any[]).some((x) => x.name === team)) { console.log(`Target already has a team named "${team}" — stopping.`); await client.close(); process.exit(1); }
  }

  const playerIds = (t.players ?? []).map((p: any) => p.memberId ?? p.playerId ?? p.id).filter(Boolean);
  const affectedMembers = await db.collection("members").countDocuments({ memberId: { $in: playerIds }, "teamSelectionHistory.rosterId": src.id });
  console.log(`Member histories to re-point: ${affectedMembers}`);

  if (!apply) { console.log("\nDRY RUN — nothing changed. Add --apply to do it."); await client.close(); return; }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.resolve("move-team-backups");
  fs.mkdirSync(dir, { recursive: true });
  const members = await db.collection("members").find({ memberId: { $in: playerIds } }, { projection: { memberId: 1, teamSelectionHistory: 1 } }).toArray();
  const backup = path.join(dir, `move-${team}-${stamp}.json`);
  fs.writeFileSync(backup, JSON.stringify({ source: src, target: dst, members }, null, 2));
  console.log(`Backup written: ${backup}`);

  const now = new Date().toISOString();
  if (!dst) {
    dst = {
      id: `roster-${randomUUID()}`, clubId: src.clubId, clubName: src.clubName, clubColors: src.clubColors, clubLogo: src.clubLogo,
      category: src.category, division: to, gender: src.gender, season, teams: [], shadowPlayers: [], withdrawn: [],
      createdAt: now, lastUpdated: now,
    } as any;
    await rosters.insertOne(dst as any);
  }
  await rosters.updateOne({ id: dst!.id }, { $push: { teams: t } as any, $set: { lastUpdated: now } });
  await rosters.updateOne({ id: src.id }, { $pull: { teams: { name: team } } as any, $set: { lastUpdated: now } });
  const r = await db.collection("members").updateMany(
    { memberId: { $in: playerIds } },
    { $set: { "teamSelectionHistory.$[h].rosterId": dst!.id, "teamSelectionHistory.$[h].division": to } },
    { arrayFilters: [{ "h.rosterId": src.id, "h.teamName": team }] },
  );
  console.log(`Moved "${team}" from ${from} to ${to}. Member records updated: ${r.modifiedCount}`);
  await client.close();
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
