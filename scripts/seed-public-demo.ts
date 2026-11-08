/**
 * scripts/seed-public-demo.ts
 *
 * Sample league + tournament data for the public site (see data/README.md, "MongoDB public demo").
 *
 *   npm run seed:public-demo
 *
 * Run `npm run seed:tiered-demo` first so the association hierarchy exists.
 *
 * Target association: DEMO_SEED_ASSOCIATION_ID (default "bha").
 *
 * Writes (all ids are prefixed so they never collide with real data):
 *   • clubs                    Uses active clubs under the association (up to MAX_CLUBS). If there
 *                              are fewer than MIN_CLUBS, demo clubs `club-demo-*` are added.
 *   • competitions             comp-demo-<assoc>-mens-premier, comp-demo-<assoc>-womens-premier
 *   • season_competitions      sc-demo-<assoc>-<comp>-2025 (completed), -2026 (in_progress)
 *   • teams                    team-demo-<clubId>-<comp>-<season>, one per club per league
 *   • league_fixtures          double round-robin; 2025 all played, 2026 played up to last week
 *                              with the remaining rounds scheduled for the coming Saturdays
 *   • rep_tournaments          tourn-demo-<assoc>-open-men-2025 (completed, champion set)
 *                              tourn-demo-<assoc>-open-men-2026 (upcoming, draw published)
 *   • team_tournament_entries  4 entries per tournament
 *   • rep_tournament_fixtures  pool round-robin + final
 *
 * Re-running refreshes the demo documents in place (same ids) and removes demo fixtures that
 * no longer belong to the generated draw. Results are deterministic (seeded by fixture id).
 */

import "./load-env";
import { MongoClient, type AnyBulkWriteOperation, type Db, type Document } from "mongodb";

const DB_NAME = process.env.DB_NAME || "hockey-app";
const ASSOC = process.env.DEMO_SEED_ASSOCIATION_ID?.trim() || "bha";
const MIN_CLUBS = 6;
const MAX_CLUBS = 8;
const TZ = "Australia/Brisbane";
const TZ_OFFSET = "+10:00"; // Queensland has no daylight saving
const ROUNDS_PLAYED_2026 = 7; // of the double round-robin; the rest are scheduled
const BY = "seed-public-demo";

type Club = { id: string; name: string; shortName: string };

const DEMO_CLUBS: Club[] = [
  { id: "club-demo-bha", name: "Brisbane Demo Hockey Club", shortName: "Brisbane Demo" },
  { id: "club-demo-northside", name: "Northside Demo Hockey Club", shortName: "Northside" },
  { id: "club-demo-riverside", name: "Riverside Demo Hockey Club", shortName: "Riverside" },
  { id: "club-demo-eastern", name: "Eastern Suburbs Demo Hockey Club", shortName: "Eastern Suburbs" },
  { id: "club-demo-western", name: "Western Districts Demo Hockey Club", shortName: "Western Districts" },
  { id: "club-demo-bayside", name: "Bayside Demo Hockey Club", shortName: "Bayside" },
];

const LEAGUES = [
  { key: "mens-premier", name: "Men's Premier League", gender: "male" as const, label: "Men" },
  { key: "womens-premier", name: "Women's Premier League", gender: "female" as const, label: "Women" },
];

// ── helpers ────────────────────────────────────────────────────────────────────

/** Deterministic PRNG seeded from a string (FNV-1a → mulberry32). */
function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Goals for one side: 0–6, skewed by a team strength in [0, 1]. */
function goals(r: () => number, strength: number) {
  const x = r() * 0.7 + strength * 0.5;
  return Math.min(6, Math.floor(x * 5));
}

/** Circle-method round-robin. Returns rounds of [home, away] index pairs. */
function roundRobin(n: number, double: boolean): Array<Array<[number, number]>> {
  const ids = Array.from({ length: n % 2 ? n + 1 : n }, (_, i) => i);
  const bye = n % 2 ? ids.length - 1 : -1;
  const rounds: Array<Array<[number, number]>> = [];
  for (let r = 0; r < ids.length - 1; r++) {
    const pairs: Array<[number, number]> = [];
    for (let i = 0; i < ids.length / 2; i++) {
      const a = ids[i]!, b = ids[ids.length - 1 - i]!;
      if (a === bye || b === bye) continue;
      pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    ids.splice(1, 0, ids.pop()!);
  }
  return double ? [...rounds, ...rounds.map((rd) => rd.map(([h, a]) => [a, h] as [number, number]))] : rounds;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return ymd(x);
};
const at = (date: string, time: string) => new Date(`${date}T${time}:00${TZ_OFFSET}`).toISOString();

/** The next Saturday strictly after today (Brisbane date). */
function nextSaturday(): string {
  const today = new Date(Date.now() + 10 * 3600_000); // shift to Brisbane wall clock
  const dow = today.getUTCDay(); // 0 Sun … 6 Sat
  return addDays(ymd(today), ((6 - dow + 7) % 7) || 7);
}

async function bulk(db: Db, name: string, ops: AnyBulkWriteOperation<Document>[]) {
  if (!ops.length) return { upserted: 0, modified: 0 };
  const r = await db.collection(name).bulkWrite(ops, { ordered: false });
  return { upserted: r.upsertedCount, modified: r.modifiedCount };
}

const upsert = (filter: Document, doc: Document, createdAt: unknown): AnyBulkWriteOperation<Document> => ({
  updateOne: { filter, update: { $set: doc, $setOnInsert: { createdAt, createdBy: BY } }, upsert: true },
});

function report(label: string, r: { upserted: number; modified: number }, total: number) {
  console.log(`   ${label.padEnd(26)} ${String(total).padStart(4)}  (+${r.upserted} new, ${r.modified} updated)`);
}

// ── clubs ──────────────────────────────────────────────────────────────────────

async function ensureClubs(db: Db): Promise<Club[]> {
  const assoc = await db.collection("associations").findOne({ associationId: ASSOC });
  if (!assoc) throw new Error(`Association "${ASSOC}" not found — run npm run seed:tiered-demo first`);

  const col = db.collection("clubs");
  const existing = await col
    .find(
      { $or: [{ parentAssociationId: ASSOC }, { associationId: ASSOC }], active: { $ne: false } },
      { projection: { id: 1, name: 1, shortName: 1 }, sort: { name: 1 } },
    )
    .toArray();

  const clubs: Club[] = existing.slice(0, MAX_CLUBS).map((c) => ({
    id: String(c.id),
    name: String(c.name),
    shortName: String(c.shortName || c.name).replace(/\s+(Hockey Club|HC)$/i, ""),
  }));

  const now = new Date().toISOString();
  for (const demo of DEMO_CLUBS) {
    if (clubs.length >= MIN_CLUBS) break;
    if (clubs.some((c) => c.id === demo.id)) continue;
    await col.updateOne(
      { id: demo.id },
      {
        $setOnInsert: {
          id: demo.id,
          name: demo.name,
          shortName: demo.shortName,
          slug: demo.id.replace(/^club-/, ""),
          parentAssociationId: ASSOC,
          colors: { primary: "#06054e", secondary: "#FFD700" },
          active: true,
          memberSequence: 0,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
    console.log(`   + created demo club ${demo.id}`);
    clubs.push(demo);
  }
  console.log(`   = ${clubs.length} clubs: ${clubs.map((c) => c.shortName).join(", ")}`);
  return clubs;
}

// ── leagues ────────────────────────────────────────────────────────────────────

const venueFor = (c: Club) => `${c.shortName} Hockey Ground`;
const teamIdFor = (clubId: string, leagueKey: string, season: string) => `team-demo-${clubId}-${leagueKey}-${season}`;

async function seedLeagues(db: Db, clubs: Club[]) {
  const now = new Date();
  const nowIso = now.toISOString();
  const compOps: AnyBulkWriteOperation<Document>[] = [];
  const scOps: AnyBulkWriteOperation<Document>[] = [];
  const teamOps: AnyBulkWriteOperation<Document>[] = [];
  const fxOps: AnyBulkWriteOperation<Document>[] = [];
  const scIds: string[] = [];
  const fxIds: string[] = [];

  // Fixed strength per club so ladders look plausible across both seasons.
  const strength = new Map(clubs.map((c) => [c.id, rng(`strength-${c.id}`)()]));
  const rounds = roundRobin(clubs.length, true);
  const sat2026Next = nextSaturday();

  for (const lg of LEAGUES) {
    const competitionId = `comp-demo-${ASSOC}-${lg.key}`;
    compOps.push(
      upsert(
        { competitionId },
        {
          competitionId,
          owningAssociationId: ASSOC,
          name: lg.name,
          sport: "hockey",
          geographyScope: { region: "Brisbane", state: "QLD", country: "Australia" },
          status: "published",
          updatedAt: now,
          updatedBy: BY,
        },
        now,
      ),
    );

    for (const season of ["2025", "2026"]) {
      const seasonCompetitionId = `sc-demo-${ASSOC}-${lg.key}-${season}`;
      scIds.push(seasonCompetitionId);
      const divisionId = `${lg.key}-d1`;
      scOps.push(
        upsert(
          { seasonCompetitionId },
          {
            seasonCompetitionId,
            competitionId,
            owningAssociationId: ASSOC,
            season,
            displayName: `${season} ${lg.name}`,
            divisions: [{ divisionId, name: "Premier", grade: "Premier", gender: lg.gender, ageCategory: "senior" }],
            resultApprovalRequired: false,
            ladderRules: {
              pointsWin: 3, pointsDraw: 1, pointsLoss: 0, pointsForfeitWin: 3, pointsForfeitLoss: 0,
              pointsShootoutWin: 2, pointsShootoutLoss: 1, tieBreakers: ["points", "gd", "gf"],
              includeAbandonedInPlayed: false,
            },
            homeAndAway: true,
            blockoutPeriods: [],
            specialMatchPeriods: [],
            finalsSeries: {
              teamCountThreshold: 10, qualifierCountBelowThreshold: 4,
              qualifierCountAtOrAboveThreshold: 5, seriesFormat: "single_elimination",
            },
            clubNominatedVenues: clubs.map((c) => ({ clubId: c.id, venueName: venueFor(c) })),
            status: season === "2025" ? "completed" : "in_progress",
            updatedAt: now,
            updatedBy: BY,
          },
          now,
        ),
      );

      for (const c of clubs) {
        const teamId = teamIdFor(c.id, lg.key, season);
        teamOps.push(
          upsert(
            { teamId },
            {
              teamId,
              canonicalTeamId: `team-demo-${c.id}-${lg.key}`,
              clubId: c.id,
              name: `${c.shortName} ${lg.label}`,
              displayName: `${c.shortName} ${lg.label}`,
              gender: lg.gender,
              ageCategory: "senior",
              ageGroupLabel: "Open",
              grade: "Premier",
              competitionDivisionId: divisionId,
              division: { name: "Premier", level: 1, shortName: "PL" },
              roster: [],
              leadership: { viceCaptains: [] },
              season,
              status: "active",
              statistics: { totalRegistered: 0, totalAssigned: 0, totalGoalkeepers: 0, activeMembers: 0, inactiveMembers: 0, injuredMembers: 0 },
              updatedAt: now,
            },
            now,
          ),
        );
      }

      rounds.forEach((pairs, ri) => {
        const round = ri + 1;
        const date =
          season === "2025"
            ? addDays("2025-03-15", ri * 7)
            : addDays(sat2026Next, (round - ROUNDS_PLAYED_2026 - 1) * 7);
        const played = season === "2025" || round <= ROUNDS_PLAYED_2026;

        pairs.forEach(([h, a], mi) => {
          const home = clubs[h]!, away = clubs[a]!;
          const fixtureId = `fx-demo-${ASSOC}-${lg.key}-${season}-r${String(round).padStart(2, "0")}-m${mi + 1}`;
          fxIds.push(fixtureId);
          const r = rng(fixtureId);
          const time = ["13:00", "14:30", "16:00", "17:30"][mi % 4]!;
          const result = played
            ? {
                resultType: "normal",
                homeScore: goals(r, strength.get(home.id)! + 0.05),
                awayScore: goals(r, strength.get(away.id)!),
                shootoutHomeScore: null,
                shootoutAwayScore: null,
                forfeitingTeamId: null,
                notes: null,
              }
            : null;
          fxOps.push(
            upsert(
              { fixtureId },
              {
                fixtureId,
                seasonCompetitionId,
                competitionId,
                owningAssociationId: ASSOC,
                round,
                homeTeamId: teamIdFor(home.id, lg.key, season),
                awayTeamId: teamIdFor(away.id, lg.key, season),
                status: played ? "completed" : "scheduled",
                venueId: null,
                venueName: venueFor(home),
                pitchId: null,
                addressLine: null,
                scheduledStart: at(date, time),
                scheduledEnd: new Date(new Date(at(date, time)).getTime() + 90 * 60_000).toISOString(),
                timezone: TZ,
                published: true,
                publishedAt: nowIso,
                result,
                resultStatus: played ? "approved" : null,
                resultSubmittedAt: played ? nowIso : null,
                resultSubmittedBy: played ? BY : null,
                resultApprovedAt: played ? nowIso : null,
                resultApprovedBy: played ? BY : null,
                matchLevel: "league",
                umpires: null,
                matchEvents: null,
                updatedAt: nowIso,
                updatedBy: BY,
              },
              nowIso,
            ),
          );
        });
      });
    }
  }

  report("competitions", await bulk(db, "competitions", compOps), compOps.length);
  report("season_competitions", await bulk(db, "season_competitions", scOps), scOps.length);
  report("teams", await bulk(db, "teams", teamOps), teamOps.length);
  report("league_fixtures", await bulk(db, "league_fixtures", fxOps), fxOps.length);
  const stale = await db
    .collection("league_fixtures")
    .deleteMany({ seasonCompetitionId: { $in: scIds }, fixtureId: { $nin: fxIds } });
  if (stale.deletedCount) console.log(`   - removed ${stale.deletedCount} stale demo fixtures`);
}

// ── rep tournaments ────────────────────────────────────────────────────────────

async function seedTournaments(db: Db, clubs: Club[]) {
  const now = new Date();
  const nowIso = now.toISOString();
  const tOps: AnyBulkWriteOperation<Document>[] = [];
  const eOps: AnyBulkWriteOperation<Document>[] = [];
  const fOps: AnyBulkWriteOperation<Document>[] = [];
  const tIds: string[] = [];
  const fIds: string[] = [];
  const entrants = clubs.slice(0, 4);
  const assoc = await db.collection("associations").findOne({ associationId: ASSOC }, { projection: { code: 1 } });
  const code = String(assoc?.code ?? ASSOC.toUpperCase());

  const plans = [
    { season: "2025", startDate: "2025-10-11", completed: true },
    { season: "2026", startDate: "2026-12-05", completed: false },
  ];

  for (const p of plans) {
    const tournamentId = `tourn-demo-${ASSOC}-open-men-${p.season}`;
    tIds.push(tournamentId);
    const title = `${p.season} ${code} Open Men's Invitational`;
    const endDate = addDays(p.startDate, 1);
    const location = venueFor(entrants[0]!);
    const entries = entrants.map((c) => {
      const teamId = teamIdFor(c.id, "mens-premier", p.season);
      return { entryId: `tte-${teamId}-${tournamentId}`, teamId, teamName: `${c.shortName} Men`, club: c };
    });

    // Pool round-robin (6 matches over 3 rounds on day one), final on day two.
    const pool = roundRobin(entries.length, false);
    const table = new Map(entries.map((e) => [e.entryId, { pts: 0, gd: 0, gf: 0 }]));
    let seq = 0;
    pool.forEach((pairs, ri) => {
      pairs.forEach(([h, a], mi) => {
        const home = entries[h]!, away = entries[a]!;
        const fixtureId = `rfx-demo-${ASSOC}-open-men-${p.season}-pool-r${ri + 1}-m${mi + 1}`;
        fIds.push(fixtureId);
        const r = rng(fixtureId);
        const hs = p.completed ? goals(r, 0.4) : null;
        const as = p.completed ? goals(r, 0.4) : null;
        if (hs != null && as != null) {
          const th = table.get(home.entryId)!, ta = table.get(away.entryId)!;
          th.gf += hs; ta.gf += as; th.gd += hs - as; ta.gd += as - hs;
          if (hs > as) th.pts += 3; else if (as > hs) ta.pts += 3; else { th.pts += 1; ta.pts += 1; }
        }
        const start = at(p.startDate, ["09:00", "11:00", "13:00"][ri]!);
        fOps.push(
          upsert(
            { fixtureId },
            repFixture({
              fixtureId, tournamentId, phase: "pool", poolRound: ri + 1, sequence: seq++,
              home, away, start, venueName: location, completed: p.completed, hs, as, nowIso,
              poolId: "pool-a", poolLabel: "Pool A",
            }),
            nowIso,
          ),
        );
      });
    });

    // Final: top two from the pool (2025) or TBD placeholders (2026).
    const ranked = [...entries].sort((x, y) => {
      const a = table.get(x.entryId)!, b = table.get(y.entryId)!;
      return b.pts - a.pts || b.gd - a.gd || b.gf - a.gf;
    });
    const finalId = `rfx-demo-${ASSOC}-open-men-${p.season}-final`;
    fIds.push(finalId);
    let champion: (typeof entries)[number] | null = null;
    let fhs: number | null = null, fas: number | null = null, sh: number | null = null, sa: number | null = null;
    if (p.completed) {
      const r = rng(finalId);
      fhs = goals(r, 0.45); fas = goals(r, 0.4);
      if (fhs === fas) { sh = 3; sa = 2; }
      champion = fhs > fas || (sh ?? 0) > (sa ?? 0) ? ranked[0]! : ranked[1]!;
    }
    fOps.push(
      upsert(
        { fixtureId: finalId },
        repFixture({
          fixtureId: finalId, tournamentId, phase: "knockout", poolRound: 1, sequence: seq++,
          home: p.completed ? ranked[0]! : null, away: p.completed ? ranked[1]! : null,
          homeSourceLabel: "Pool A 1st", awaySourceLabel: "Pool A 2nd",
          start: at(endDate, "14:00"), venueName: location, completed: p.completed,
          hs: fhs, as: fas, sh, sa, nowIso, knockoutRoundLabel: "Final",
        }),
        nowIso,
      ),
    );

    tOps.push(
      upsert(
        { tournamentId },
        {
          tournamentId,
          season: p.season,
          ageGroup: "Open",
          gender: "male",
          title,
          startDate: p.startDate,
          endDate,
          location,
          additionalInfo: "Demo tournament generated by seed-public-demo.",
          nominationFee: 0,
          hostType: "association",
          hostId: ASSOC,
          brandingAssociationId: ASSOC,
          entryRules: {
            entryEligibility: "host_association_clubs",
            allowedClubIds: [],
            maxTeams: 8,
            entryOpensAt: addDays(p.startDate, -90),
            entryClosesAt: addDays(p.startDate, -21),
            withdrawalDeadline: addDays(p.startDate, -14),
            entryFeeCents: null,
          },
          resultApprovalRequired: false,
          championEntryId: champion?.entryId ?? null,
          championTeamName: champion?.teamName ?? null,
          updatedAt: nowIso,
        },
        nowIso,
      ),
    );

    for (const e of entries) {
      eOps.push(
        upsert(
          { entryId: e.entryId },
          {
            entryId: e.entryId,
            teamId: e.teamId,
            canonicalTeamId: `team-demo-${e.club.id}-mens-premier`,
            teamName: e.teamName,
            clubId: e.club.id,
            clubName: e.club.name,
            tournamentId,
            tournamentTitle: title,
            season: p.season,
            ageGroup: "Open",
            ageGroupLabel: "Open",
            gender: "male",
            grade: "Premier",
            startDate: p.startDate,
            endDate,
            location,
            status: "confirmed",
            feeItems: [],
            attendingMemberIds: [],
            totalFeesCents: 0,
            totalCollectedCents: 0,
            updatedAt: now,
          },
          now,
        ),
      );
    }
  }

  report("rep_tournaments", await bulk(db, "rep_tournaments", tOps), tOps.length);
  report("team_tournament_entries", await bulk(db, "team_tournament_entries", eOps), eOps.length);
  report("rep_tournament_fixtures", await bulk(db, "rep_tournament_fixtures", fOps), fOps.length);
  const stale = await db
    .collection("rep_tournament_fixtures")
    .deleteMany({ tournamentId: { $in: tIds }, fixtureId: { $nin: fIds } });
  if (stale.deletedCount) console.log(`   - removed ${stale.deletedCount} stale demo tournament fixtures`);
}

type Side = { entryId: string; teamId: string; teamName: string } | null;

function repFixture(o: {
  fixtureId: string; tournamentId: string; phase: "pool" | "knockout"; poolRound: number; sequence: number;
  home: Side; away: Side; start: string; venueName: string; completed: boolean;
  hs: number | null; as: number | null; sh?: number | null; sa?: number | null; nowIso: string;
  poolId?: string; poolLabel?: string; knockoutRoundLabel?: string;
  homeSourceLabel?: string; awaySourceLabel?: string;
}) {
  const knockout = o.phase === "knockout";
  return {
    fixtureId: o.fixtureId,
    tournamentId: o.tournamentId,
    phase: o.phase,
    drawMatchId: null,
    bracketTag: knockout ? "main" : null,
    knockoutRoundLabel: o.knockoutRoundLabel ?? null,
    knockoutRoundIndex: knockout ? 0 : null,
    matchOrder: knockout ? 0 : null,
    homeSourceLabel: o.homeSourceLabel ?? null,
    awaySourceLabel: o.awaySourceLabel ?? null,
    divisionId: null,
    poolId: o.poolId ?? null,
    poolLabel: o.poolLabel ?? null,
    poolRound: o.poolRound,
    sequence: o.sequence,
    homeEntryId: o.home?.entryId ?? null,
    awayEntryId: o.away?.entryId ?? null,
    homeTeamId: o.home?.teamId ?? null,
    awayTeamId: o.away?.teamId ?? null,
    homeTeamName: o.home?.teamName ?? null,
    awayTeamName: o.away?.teamName ?? null,
    status: o.completed ? "completed" : "scheduled",
    venueId: null,
    venueName: o.venueName,
    addressLine: null,
    scheduledStart: o.start,
    scheduledEnd: new Date(new Date(o.start).getTime() + 90 * 60_000).toISOString(),
    timezone: TZ,
    published: true,
    publishedAt: o.nowIso,
    result: o.completed
      ? {
          resultType: "normal",
          homeScore: o.hs,
          awayScore: o.as,
          shootoutHomeScore: o.sh ?? null,
          shootoutAwayScore: o.sa ?? null,
          forfeitingTeamId: null,
          notes: null,
        }
      : null,
    resultStatus: o.completed ? "approved" : null,
    resultSubmittedAt: o.completed ? o.nowIso : null,
    resultSubmittedBy: o.completed ? BY : null,
    resultApprovedAt: o.completed ? o.nowIso : null,
    resultApprovedBy: o.completed ? BY : null,
    updatedAt: o.nowIso,
    updatedBy: BY,
  };
}

// ── main ───────────────────────────────────────────────────────────────────────

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  try {
    const db = client.db(DB_NAME);
    console.log(`\n✅ Connected — database "${DB_NAME}", association "${ASSOC}"\n\n1️⃣  Clubs`);
    const clubs = await ensureClubs(db);
    console.log("\n2️⃣  Leagues (2025 completed, 2026 in progress)");
    await seedLeagues(db, clubs);
    console.log("\n3️⃣  Representative tournaments");
    await seedTournaments(db, clubs);
    console.log(`\n🎉 Public demo ready. Browse the ${ASSOC.toUpperCase()} portal (e.g. http://${ASSOC}.localhost:3000).`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
