// scripts/altius-2026/seed.ts
//
// Seeds BHA 2026 BHL / JHL / MHL data harvested from hockeybrisbane.altius.live
// into the hockey-app MongoDB.
//
//   npx tsx scripts/altius-2026/seed.ts                 # dry run: validate + print counts
//   npx tsx scripts/altius-2026/seed.ts --apply         # write to the database
//
// Options:
//   --file=data/altius/2026/bha-2026-altius.json   harvest file (default shown)
//   --only=BHL,JHL,MHL                             limit to some leagues
//   --skip-people                                  skip members + registrations (fixtures keep events)
//   --association=bha                              owning association id (default bha)
//
// See scripts/altius-2026/README.md for the full workflow.

import "../load-env";
import dns from "node:dns";
import fs from "node:fs";
import path from "node:path";
import { MongoClient, type AnyBulkWriteOperation, type Db, type Document } from "mongodb";
import { transformHarvest, type ClubRef, type TransformResult } from "../../lib/altius/transform";
import type { AltiusHarvest } from "../../lib/altius/harvestTypes";
import { validateTransform } from "../../lib/altius/validate";
import { transformTeamStats, type AltiusMatchStatsHarvest } from "../../lib/altius/teamStats";
import { FixtureTeamStatsSchema, FIXTURE_TEAM_STATS_COLLECTION } from "../../lib/db/schemas/fixtureTeamStats.schema";

if (process.env.DNS_SERVERS !== "system") {
  dns.setServers((process.env.DNS_SERVERS || "1.1.1.1,8.8.8.8").split(","));
}

const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=");
const APPLY = process.argv.includes("--apply");
const SKIP_PEOPLE = process.argv.includes("--skip-people");
const FILE = arg("file") ?? "data/altius/2026/bha-2026-altius.json";
/** Optional second harvest: per-match statistics PDFs (penalty corners awarded per period). */
const STATS_FILE = arg("stats-file") ?? "data/altius/2026/bha-2026-altius-stats.json";
const ONLY = (arg("only") ?? "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
const ASSOC = arg("association") ?? "bha";
const SEASON = "2026";
const BY = "altius-seed-2026";

async function main() {
  const harvest = JSON.parse(fs.readFileSync(path.resolve(FILE), "utf-8")) as AltiusHarvest;
  if (ONLY.length) {
    harvest.comps = Object.fromEntries(Object.entries(harvest.comps).filter(([, c]) => ONLY.includes(c.league)));
  }

  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db(process.env.DB_NAME || "hockey-app");

  const assoc = await db.collection("associations").findOne({ $or: [{ associationId: ASSOC }, { code: ASSOC.toUpperCase() }] });
  if (!assoc) throw new Error(`Association "${ASSOC}" not found — run the association seed first.`);
  const associationId = String(assoc.associationId);

  const clubs = await db.collection("clubs").find({}, { projection: { id: 1, shortName: 1, name: 1, parentAssociationId: 1 } }).toArray();
  const clubsByShortName = new Map<string, ClubRef>();
  for (const c of clubs) {
    if (!c.shortName || !c.id) continue;
    const key = String(c.shortName).toUpperCase();
    // prefer clubs already linked to this association
    if (!clubsByShortName.has(key) || c.parentAssociationId === associationId) {
      clubsByShortName.set(key, { id: String(c.id), shortName: key, name: String(c.name ?? "") });
    }
  }

  const t = transformHarvest(harvest, { associationId, season: SEASON, clubsByShortName, by: BY });
  const problems = validateTransform(t);

  let teamStats: Document[] = [];
  if (fs.existsSync(path.resolve(STATS_FILE))) {
    const statsHarvest = JSON.parse(fs.readFileSync(path.resolve(STATS_FILE), "utf-8")) as AltiusMatchStatsHarvest;
    const ts = transformTeamStats(statsHarvest, t.fixtures);
    teamStats = ts.teamStats;
    t.warnings.push(...ts.warnings);
    for (const d of teamStats) {
      const r = FixtureTeamStatsSchema.safeParse(d);
      if (!r.success) problems.push(`team stats ${d.statsId}: ${r.error.issues[0]?.path.join(".")} — ${r.error.issues[0]?.message}`);
    }
    console.log(`\nTeam stats file: ${STATS_FILE} → ${teamStats.length} fixture_team_stats documents`);
  } else {
    console.log(`\n(No ${STATS_FILE} — skipping fixture_team_stats. Penalty corners awarded won't show.)`);
  }

  printSummary(t, problems);
  if (t.unmappedTeams.length) {
    console.log("\n⚠ Teams whose club isn't in your clubs collection — a minimal club will be created for each:");
    for (const u of t.unmappedTeams) console.log(`   ${u.code.padEnd(14)} ${u.name}  [${u.competition}]`);
    for (const c of t.newClubs) console.log(`   → ${c.id}  "${c.name}" (${c.shortName})`);
    console.log("   If one of these is really an existing club, add its code to ALTIUS_CODE_TO_CLUB_SHORTNAME in lib/altius/transform.ts and re-run.");
  }
  if (problems.length) {
    console.log(`\n✖ ${problems.length} schema problems (first 20):`);
    problems.slice(0, 20).forEach((p) => console.log("   " + p));
    if (APPLY) throw new Error("Refusing to write while documents fail validation.");
  }
  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to write.");
    await client.close();
    return;
  }

  await write(db, t, teamStats);
  await client.close();
}

function printSummary(t: TransformResult, problems: string[]) {
  console.log(`\nAltius 2026 → hockey-app (${APPLY ? "APPLY" : "DRY RUN"})`);
  const rows: [string, number][] = [
    ["clubs to create (visitors)", t.newClubs.length],
    ["competitions", t.competitions.length],
    ["season_competitions", t.seasonCompetitions.length],
    ["teams", t.teams.length],
    ["league_fixtures", t.fixtures.length],
    ["  …with match events", t.fixtures.filter((f) => f.matchEvents?.length).length],
    ["  …with umpires", t.fixtures.filter((f) => f.umpires?.length).length],
    ["members (players)", t.members.filter((m) => m.altius?.playerId).length],
    ["members (team staff)", t.members.filter((m) => m.altius?.staffName).length],
    ["members (officials)", t.members.filter((m) => m.altius?.officialName).length],
    ["association-registrations", t.associationRegistrations.length],
    ["club-registrations", t.clubRegistrations.length],
    ["association_venues", t.venues.length],
    ["fixture_lineups", t.lineups.length],
    ["competition_awards", t.awards.length],
  ];
  for (const [k, n] of rows) console.log(`  ${k.padEnd(28)} ${n}`);
  console.log(`  warnings                     ${t.warnings.length}${t.warnings.length ? " (see altius-seed-warnings.txt)" : ""}`);
  console.log(`  schema problems              ${problems.length}`);
  if (t.warnings.length) fs.writeFileSync("altius-seed-warnings.txt", t.warnings.join("\n") + "\n");
}

const set = (filter: Document, doc: Document, now: Date): AnyBulkWriteOperation<Document> => {
  const { createdAt, createdBy, ...rest } = doc;
  return {
    updateOne: { filter, update: { $set: rest, $setOnInsert: { createdAt: createdAt ?? now, createdBy: createdBy ?? BY } }, upsert: true },
  };
};

/** Only create if missing — keeps edits admins make later (contact details, addresses…). */
const insertOnly = (filter: Document, doc: Document, alwaysSet: Document, now: Date): AnyBulkWriteOperation<Document> => {
  const onInsert: Document = { ...doc };
  for (const k of Object.keys(alwaysSet)) delete onInsert[k];
  return {
    updateOne: {
      filter,
      update: { $setOnInsert: { ...onInsert, createdAt: onInsert.createdAt ?? now, createdBy: onInsert.createdBy ?? BY }, $set: alwaysSet },
      upsert: true,
    },
  };
};

async function bulk(db: Db, name: string, ops: AnyBulkWriteOperation<Document>[], label = name) {
  let up = 0, mod = 0;
  for (let i = 0; i < ops.length; i += 500) {
    const r = await db.collection(name).bulkWrite(ops.slice(i, i + 500), { ordered: false });
    up += r.upsertedCount;
    mod += r.modifiedCount;
  }
  console.log(`  ${label.padEnd(28)} +${up} new, ${mod} updated`);
}

async function write(db: Db, t: TransformResult, teamStats: Document[]) {
  const now = new Date();
  const nowIso = now.toISOString();
  console.log("\nWriting…");

  if (t.newClubs.length) {
    await bulk(db, "clubs", t.newClubs.map((c) => insertOnly({ id: c.id }, c, { updatedAt: c.updatedAt }, now)), "clubs (imported visitors)");
  }
  await bulk(db, "competitions", t.competitions.map((d) => set({ competitionId: d.competitionId }, d, now)));
  await bulk(db, "season_competitions", t.seasonCompetitions.map((d) => set({ seasonCompetitionId: d.seasonCompetitionId }, d, now)));
  await bulk(db, "association_venues", t.venues.map((d) =>
    insertOnly({ venueId: d.venueId }, { ...d, createdAt: nowIso, updatedAt: nowIso }, { pitches: d.pitches, updatedAt: nowIso }, now)));
  await bulk(db, "teams", t.teams.map((d) => set({ teamId: d.teamId }, d, now)));
  await bulk(db, "league_fixtures", t.fixtures.map((d) => {
    const { createdAt: _c, createdBy: _b, ...doc } = d;
    return { updateOne: { filter: { fixtureId: d.fixtureId }, update: { $set: doc, $setOnInsert: { createdAt: nowIso, createdBy: BY } }, upsert: true } };
  }));

  if (teamStats.length) {
    await db.collection(FIXTURE_TEAM_STATS_COLLECTION).createIndex({ fixtureId: 1, teamId: 1 }, { unique: true });
    await bulk(db, FIXTURE_TEAM_STATS_COLLECTION, teamStats.map((d) => set({ statsId: d.statsId }, d, now)));
  }

  // Remove Altius fixtures that no longer exist in the harvest for these season competitions
  const scIds = t.seasonCompetitions.map((s) => s.seasonCompetitionId);
  const fxIds = t.fixtures.map((f) => f.fixtureId);
  const stale = await db.collection("league_fixtures").deleteMany({
    seasonCompetitionId: { $in: scIds }, fixtureId: { $regex: /^fx-altius-/, $nin: fxIds },
  });
  if (stale.deletedCount) console.log(`  removed ${stale.deletedCount} stale Altius fixtures`);

  if (!SKIP_PEOPLE) {
    await bulk(db, "members", t.members.map((m) =>
      insertOnly({ memberId: m.memberId }, m, { altius: m.altius, teams: m.teams, roles: m.roles, updatedAt: now }, now)));
    await bulk(db, "association-registrations", t.associationRegistrations.map((r) =>
      insertOnly({ registrationId: r.registrationId }, r, { updatedAt: now }, now)));
    await bulk(db, "club-registrations", t.clubRegistrations.map((r) =>
      insertOnly({ registrationId: r.registrationId }, r, { updatedAt: now }, now)));

    // Registration summaries on the member documents
    const clubNames = new Map((await db.collection("clubs").find({}, { projection: { id: 1, name: 1 } }).toArray()).map((c) => [String(c.id), String(c.name)]));
    const assocName = (await db.collection("associations").findOne({ associationId: t.associationRegistrations[0]?.associationId }))?.name ?? "";
    const memberOps: AnyBulkWriteOperation<Document>[] = [];
    for (const r of t.associationRegistrations) {
      memberOps.push({ updateOne: { filter: { memberId: r.memberId }, update: { $addToSet: { associationRegistrations: {
        registrationId: r.registrationId, associationId: r.associationId, associationName: assocName, seasonYear: r.seasonYear, status: r.status } } as never } } });
    }
    for (const r of t.clubRegistrations) {
      memberOps.push({ updateOne: { filter: { memberId: r.memberId }, update: { $addToSet: { clubRegistrations: {
        registrationId: r.registrationId, clubId: r.clubId, clubName: clubNames.get(r.clubId) ?? r.clubId, registrationType: r.registrationType, seasonYear: r.seasonYear, status: r.status } } as never } } });
    }
    await bulk(db, "members", memberOps, "members (registration links)");

    await db.collection("fixture_lineups").createIndex({ fixtureId: 1, teamId: 1 }, { unique: true });
    await db.collection("fixture_lineups").createIndex({ "players.memberId": 1 });
    await bulk(db, "fixture_lineups", t.lineups.map((l) => set({ lineupId: l.lineupId }, l, now)));
    await bulk(db, "competition_awards", t.awards.map((a) => set({ awardRecordId: a.awardRecordId }, a, now)));
  }

  console.log("\nDone. Re-running is safe: documents are matched by their Altius-derived IDs.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
