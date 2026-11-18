/**
 * scripts/create-bhl-2027.ts   (DRY-RUN by default: nothing is written without --apply)
 *
 * Sets up the 2027 BHL season from scripts/data/bhl-2027.json:
 *   1. a competition and a 2027 season competition for each of BHL 1 to BHL 7 (reused if they already exist),
 *      with home-and-away on, the blackout dates (Queensland public holidays, Easter, state titles) and the finals note;
 *   2. the whole season's draw (all divisions together, club meetings lined up), saved unpublished;
 *   3. every division's finals, placed on the dates leading to its grand final. Finals teams are filled in later from the ladder.
 *
 *   npm run setup:bhl-2027 -- --association <associationId> [--apply] [--map "Team name=teamId" ...]
 *
 * Teams must already exist under the association's clubs (matched by exactly the same name). Any that don't match are listed;
 * give each one with --map. Re-running with --apply replaces the 2027 fixtures of these seven divisions (and only those).
 */
import "./load-env";
import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";
import { SeasonCompetitionSchema, FinalsSeriesConfigSchema } from "../lib/db/schemas/competition.schema";
import { buildPlan, cleanDrawInput, savePlan } from "../lib/draw/service";
import { dayRange, queenslandHolidays } from "../lib/draw/holidays";
import { finalsPlan, legsForTeams, placeFinals, slotText } from "../lib/draw/finals";
import { matchTeams, toWindows, venuesByWords, type VenueDoc } from "../lib/draw/seasonSetup";
import { addDays } from "../lib/draw/time";

const DB_NAME = process.env.DB_NAME || "hockey-app";
const arg = (name: string) => process.argv.flatMap((a, i, all) => (all[i - 1] === name ? [a] : []));
const WEEKDAY: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
const newId = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

async function main() {
  const apply = process.argv.includes("--apply");
  const associationId = arg("--association")[0];
  if (!associationId) throw new Error("Give --association <associationId>");
  const manual = Object.fromEntries(arg("--map").map((m) => { const i = m.lastIndexOf("="); return [m.slice(0, i), m.slice(i + 1)]; }));
  const cfg = JSON.parse(fs.readFileSync(path.resolve("scripts/data/bhl-2027.json"), "utf8"));
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db(DB_NAME);
  const problems: string[] = [];

  const assoc = await db.collection("associations").findOne({ associationId });
  if (!assoc) throw new Error(`Association ${associationId} not found`);
  if (typeof assoc.level !== "number" || assoc.level <= 1) problems.push("The association must be a regional/metro association (level 2 or more) to own season competitions");

  const clubs = await db.collection("clubs").find({ $or: [{ parentAssociationId: associationId }, { associationId }] }).project({ id: 1 }).toArray();
  const teamDocs = await db.collection("teams").find({ clubId: { $in: clubs.map((c) => String(c.id)) } }).project({ teamId: 1, name: 1, teamName: 1, displayName: 1, clubId: 1 }).toArray();
  const matches = matchTeams(cfg.teams, teamDocs.map((t) => ({ teamId: String(t.teamId), name: t.name, teamName: t.teamName, displayName: t.displayName, clubId: t.clubId })), manual);
  for (const m of matches) if (m.problem) problems.push(`Team "${m.wanted.name}": ${m.problem}`);

  const venues = (await db.collection("association_venues").find({ associationId, status: "active" }).toArray()).map((v) => ({ venueId: String(v.venueId), name: String(v.name ?? ""), pitches: (v.pitches ?? []) as { pitchId: string; label?: string }[] })) as (VenueDoc & { pitches: { pitchId: string; label?: string }[] })[];
  const shared = venuesByWords(venues, cfg.sharedVenueKeywords);
  if (shared.length < cfg.sharedVenueKeywords.length) problems.push(`Shared grounds: found ${shared.map((v) => v.name).join(", ") || "none"} for ${cfg.sharedVenueKeywords.join(" / ")}`);
  const homeVenueByClub: Record<string, string> = {};
  for (const [code, word] of Object.entries<string>(cfg.clubHomeVenueKeywords)) {
    const v = venuesByWords(venues, [word]);
    const clubId = matches.find((m) => m.wanted.club === code)?.clubId;
    if (v.length !== 1) problems.push(`Home ground for ${code}: ${v.length ? `${v.length} venues match "${word}"` : `no venue matches "${word}"`}`);
    else if (clubId) homeVenueByClub[clubId] = v[0].venueId;
  }
  const finalsVenues = venuesByWords(venues, cfg.finalsVenueKeywords);
  const finalsPitches = (finalsVenues as (VenueDoc & { pitches: { pitchId: string; label?: string }[] })[]).flatMap((v) => v.pitches.map((p) => ({ pitchId: p.pitchId, venueId: v.venueId, venueName: `${v.name}${p.label ? ` · ${p.label}` : ""}`, addressLine: null })));
  if (!finalsPitches.length) problems.push("No pitches found for the finals venue");

  const holidays = queenslandHolidays(Number(cfg.season));
  const labelOf = new Map(holidays.map((h) => [h.date, h.name] as const));
  const stateDays = (cfg.stateTitles as string[][]).flatMap(([a, b, l]) => dayRange(a, b).map((d) => { labelOf.set(d, l); return d; }));
  const blackout = [...new Set([...holidays.map((h) => h.date), ...stateDays])].sort();
  const windows = toWindows(blackout, (d) => labelOf.get(d) ?? "");

  console.log(`Association ${associationId}: ${matches.filter((m) => m.teamId).length}/${matches.length} teams matched, ${shared.length} shared grounds, ${Object.keys(homeVenueByClub).length} club grounds, ${windows.length} blackout windows`);
  if (problems.length) { console.log("\nNeeds attention:\n - " + problems.join("\n - ")); if (apply) { console.log("\nNothing was written."); await client.close(); process.exit(1); } }

  // 1. Competitions and season competitions.
  const now = new Date();
  const scByDivision = new Map<string, string>();
  for (const d of cfg.divisions as { name: string }[]) {
    const count = matches.filter((m) => m.wanted.division === d.name).length;
    let comp = await db.collection("competitions").findOne({ owningAssociationId: associationId, name: d.name });
    let sc = comp ? await db.collection("season_competitions").findOne({ competitionId: comp.competitionId, season: cfg.season }) : null;
    console.log(`${d.name}: ${comp ? "competition exists" : "will create competition"}, ${sc ? "season exists" : "will create 2027 season"}, ${count} teams, each pair plays ${legsForTeams(count)}x, finals ${finalsPlan(count).weeks} weeks`);
    if (!apply) { if (sc) scByDivision.set(d.name, String(sc.seasonCompetitionId)); continue; }
    if (!comp) { const fresh = { competitionId: newId("comp"), owningAssociationId: associationId, name: d.name, sport: "hockey", status: "draft", createdAt: now, updatedAt: now, createdBy: "script:bhl-2027" }; await db.collection("competitions").insertOne({ ...fresh }); comp = fresh as never; }
    if (!sc) {
      const doc = SeasonCompetitionSchema.parse({
        seasonCompetitionId: newId("scomp"), competitionId: comp!.competitionId, owningAssociationId: associationId, season: cfg.season, homeAndAway: true, blockoutPeriods: windows,
        finalsSeries: FinalsSeriesConfigSchema.parse({ teamCountThreshold: 10, qualifierCountBelowThreshold: 4, qualifierCountAtOrAboveThreshold: 5, seriesFormat: "custom", seriesFormatNotes: "10+ teams: top 5, 4 weeks (1st has the week 1 bye). Fewer: top 4, 3 weeks. Grand final on a fixed day." }),
        displayName: `${d.name} ${cfg.season}`, status: "draft", createdAt: now, updatedAt: now, createdBy: "script:bhl-2027",
      });
      const { _id: _omit, ...rest } = doc; await db.collection("season_competitions").insertOne(rest); sc = rest as never;
    }
    scByDivision.set(d.name, String(sc!.seasonCompetitionId));
  }
  if (!apply) { console.log("\nDry run: nothing written. Add --apply to create everything."); await client.close(); return; }

  // 2. The draw.
  const startWeekday = new Date(`${cfg.startDate}T00:00:00Z`).getUTCDay();
  const raw = {
    divisions: (cfg.divisions as { name: string; day: string; startTime: string; endTime: string }[]).map((d) => ({
      seasonCompetitionId: scByDivision.get(d.name), teamIds: matches.filter((m) => m.wanted.division === d.name).map((m) => m.teamId),
      dayOffset: (WEEKDAY[d.day] - startWeekday + 7) % 7, startTime: d.startTime, endTime: d.endTime, legs: legsForTeams(matches.filter((m) => m.wanted.division === d.name).length),
    })),
    startDate: cfg.startDate, roundGapDays: cfg.roundGapDays, slotTimes: [], slotMinutes: cfg.slotMinutes, bufferMinutes: cfg.bufferMinutes, blackoutDates: blackout,
    homeVenueByClub, sharedVenueIds: shared.map((v) => v.venueId), alignClubs: true, suggestUmpires: false, replace: true,
  };
  const input = cleanDrawInput(raw);
  if (!input.ok) throw new Error(input.error);
  const built = await buildPlan(db, input.value);
  if (!built.ok) throw new Error(built.error);
  if (built.plan.unplaced.length) console.log(`Warning: ${built.plan.unplaced.length} matches could not be placed`);
  await savePlan(db, built.scope, built.plan, { userId: "script:bhl-2027", replace: true, withUmpires: false });
  console.log(`Saved ${built.plan.fixtures.length} regular-season fixtures (unpublished)`);

  // 3. Finals.
  const lastRound = Math.max(...built.plan.fixtures.map((f) => f.round));
  const placed = placeFinals((cfg.divisions as { name: string; startTime: string; endTime: string; grandFinalDate: string }[]).map((d) => ({ id: d.name, teamCount: matches.filter((m) => m.wanted.division === d.name).length, grandFinalDate: d.grandFinalDate, startTime: d.startTime, endTime: d.endTime })), { pitches: finalsPitches, matchMinutes: cfg.slotMinutes, gapMinutes: cfg.bufferMinutes });
  if (placed.unplaced.length) console.log(`Warning: ${placed.unplaced.length} finals could not be placed`);
  const docs = placed.placed.map((p, i) => {
    const sc = scByDivision.get(p.divisionId)!;
    return {
      fixtureId: `fx-${sc}-f${p.game.game}-${Date.now()}-${i}`, seasonCompetitionId: sc, competitionId: String((built.plan.fixtures.find((f) => f.seasonCompetitionId === sc))?.competitionId ?? ""), owningAssociationId: associationId,
      round: lastRound + p.game.week, homeTeamId: null, awayTeamId: null, status: "scheduled", venueId: p.venueId, venueName: p.venueName, pitchId: p.pitchId, addressLine: null,
      scheduledStart: p.start, scheduledEnd: p.end, timezone: "Australia/Brisbane", published: false, publishedAt: null,
      result: null, resultStatus: null, resultSubmittedAt: null, resultSubmittedBy: null, resultApprovedAt: null, resultApprovedBy: null, legacyMatchId: null, umpires: null, matchEvents: null,
      matchLevel: "finals", finals: { game: p.game.game, week: p.game.week, name: p.game.name, grandFinal: p.game.grandFinal, homeSlot: p.game.home, awaySlot: p.game.away, homeText: slotText(p.game.home), awayText: slotText(p.game.away) },
      createdAt: now.toISOString(), createdBy: "script:bhl-2027",
    };
  });
  if (docs.length) await db.collection("league_fixtures").insertMany(docs);
  console.log(`Saved ${docs.length} finals fixtures (unpublished, teams to be filled in from the ladder)`);
  await client.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
