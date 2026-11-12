// lib/data/publicPlayer.ts
// Public player profile: name, photo (with consent), club, teams, appearances,
// season stats and recent matches. Only for members who have played (have a
// team or a fixture lineup) — never contact details or date of birth.

import clientPromise from "@/lib/mongodb";
import { FIXTURE_LINEUPS_COLLECTION } from "@/lib/db/schemas/fixtureLineup.schema";
import { aggregateMemberCareerInAssociation } from "@/lib/competitions/playerCareerStats";
import type { PlayerSeasonTotals } from "@/lib/competitions/playerSeasonStats";
import { memberPhotoIfConsented, memberPublicName } from "@/lib/data/matchPlayers";

const PUBLIC_SC_STATUSES = ["published", "in_progress", "completed"];

export interface PublicPlayerSeasonRow {
  seasonCompetitionId: string;
  season: string;
  competitionName: string;
  teamName: string | null;
  appearances: number;
  totals: PlayerSeasonTotals | null;
}

export interface PublicPlayerMatch {
  fixtureId: string;
  dateTime: string | null;
  competitionName: string;
  round: number | null;
  teamName: string;
  opponentName: string;
  isHome: boolean;
  teamScore: number | null;
  opponentScore: number | null;
  shirtNumber: number | null;
  goals: number;
  cards: string[];
}

export interface PublicPlayerProfile {
  memberId: string;
  name: string;
  photoUrl: string | null;
  club: { name: string; logo: string | null; primary: string; secondary: string } | null;
  usualShirtNumber: number | null;
  isGoalkeeper: boolean;
  seasons: PublicPlayerSeasonRow[];
  career: { appearances: number; goals: number; greenCards: number; yellowCards: number; redCards: number };
  recentMatches: PublicPlayerMatch[];
}

type Doc = Record<string, any>;

export async function getPublicPlayerProfile(memberId: string): Promise<PublicPlayerProfile | null> {
  const id = memberId.trim();
  if (!id) return null;
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");

  const member = await db.collection("members").findOne(
    { memberId: id },
    { projection: { memberId: 1, personalInfo: 1, consents: 1, "preferences.photoConsent": 1, clubId: 1, teams: 1, playerInfo: 1 } },
  );
  if (!member) return null;

  const lineups = await db
    .collection(FIXTURE_LINEUPS_COLLECTION)
    .find({ "players.memberId": id }, { projection: { fixtureId: 1, seasonCompetitionId: 1, teamId: 1, players: 1 } })
    .toArray();
  const teamRegs = (Array.isArray(member.teams) ? member.teams : []) as Doc[];
  if (lineups.length === 0 && teamRegs.length === 0) return null; // not a player

  // Fixtures for appearances (published only)
  const fixtures = lineups.length
    ? await db
        .collection("league_fixtures")
        .find(
          { fixtureId: { $in: lineups.map((l) => String(l.fixtureId)) }, published: true },
          { projection: { fixtureId: 1, seasonCompetitionId: 1, round: 1, homeTeamId: 1, awayTeamId: 1, scheduledStart: 1, status: 1, result: 1, matchEvents: 1 } },
        )
        .toArray()
    : [];
  const fixtureById = new Map(fixtures.map((f) => [String(f.fixtureId), f]));

  const scIds = [...new Set(fixtures.map((f) => String(f.seasonCompetitionId)).filter(Boolean))];
  const teamIds = [...new Set([...lineups.map((l) => String(l.teamId)), ...fixtures.flatMap((f) => [String(f.homeTeamId), String(f.awayTeamId)]), ...teamRegs.map((t) => String(t.teamId))])];
  const [scs, teams] = await Promise.all([
    db.collection("season_competitions").find(
      { seasonCompetitionId: { $in: scIds }, status: { $in: PUBLIC_SC_STATUSES } },
      { projection: { seasonCompetitionId: 1, season: 1, competitionId: 1, displayName: 1, owningAssociationId: 1 } },
    ).toArray(),
    db.collection("teams").find({ teamId: { $in: teamIds } }, { projection: { teamId: 1, name: 1, seasonCompetitionId: 1 } }).toArray(),
  ]);
  const scById = new Map(scs.map((s) => [String(s.seasonCompetitionId), s]));
  const comps = await db.collection("competitions").find(
    { competitionId: { $in: scs.map((s) => String(s.competitionId)) } }, { projection: { competitionId: 1, name: 1 } },
  ).toArray();
  const compName = (scId: string) => {
    const sc = scById.get(scId);
    return String(comps.find((c) => c.competitionId === sc?.competitionId)?.name ?? sc?.displayName ?? scId);
  };
  const teamName = new Map(teams.map((t) => [String(t.teamId), String(t.name)]));

  // Appearances + recent matches
  const appsBySc = new Map<string, { n: number; teamId: string }>();
  const shirts = new Map<number, number>();
  let gkGames = 0;
  const recent: PublicPlayerMatch[] = [];
  for (const lu of lineups) {
    const f = fixtureById.get(String(lu.fixtureId));
    if (!f || !scById.has(String(f.seasonCompetitionId))) continue;
    const me = (lu.players as Doc[]).find((p) => p.memberId === id);
    const scId = String(f.seasonCompetitionId);
    const a = appsBySc.get(scId) ?? { n: 0, teamId: String(lu.teamId) };
    a.n++;
    appsBySc.set(scId, a);
    if (typeof me?.shirtNumber === "number") shirts.set(me.shirtNumber, (shirts.get(me.shirtNumber) ?? 0) + 1);
    if (me?.isGoalkeeper) gkGames++;

    const isHome = String(f.homeTeamId) === String(lu.teamId);
    const r = (f.status === "completed" ? f.result : null) as Doc | null;
    const myEvents = ((f.matchEvents as Doc[]) ?? []).filter((e) => e.memberId === id);
    recent.push({
      fixtureId: String(f.fixtureId),
      dateTime: f.scheduledStart ? String(f.scheduledStart) : null,
      competitionName: compName(scId),
      round: typeof f.round === "number" ? f.round : null,
      teamName: teamName.get(String(lu.teamId)) ?? "",
      opponentName: teamName.get(String(isHome ? f.awayTeamId : f.homeTeamId)) ?? "",
      isHome,
      teamScore: r ? (isHome ? r.homeScore : r.awayScore) ?? null : null,
      opponentScore: r ? (isHome ? r.awayScore : r.homeScore) ?? null : null,
      shirtNumber: typeof me?.shirtNumber === "number" ? me.shirtNumber : null,
      goals: myEvents.filter((e) => /goal/.test(e.kind) && !/miss/.test(e.kind)).length,
      cards: myEvents.filter((e) => /_card$/.test(e.kind)).map((e) => String(e.kind)),
    });
  }
  recent.sort((a, b) => String(b.dateTime ?? "").localeCompare(String(a.dateTime ?? "")));

  // Event stats per season (shared career aggregation), for each association involved
  const statsBySc = new Map<string, PlayerSeasonTotals>();
  for (const assoc of new Set(scs.map((s) => String(s.owningAssociationId)))) {
    const { bySeason } = await aggregateMemberCareerInAssociation(db, id, assoc);
    for (const s of bySeason) statsBySc.set(s.seasonCompetitionId, s.totals);
  }

  const seasons: PublicPlayerSeasonRow[] = [...appsBySc.entries()]
    .map(([scId, a]) => ({
      seasonCompetitionId: scId,
      season: String(scById.get(scId)?.season ?? ""),
      competitionName: compName(scId),
      teamName: teamName.get(a.teamId) ?? null,
      appearances: a.n,
      totals: statsBySc.get(scId) ?? null,
    }))
    .sort((x, y) => y.season.localeCompare(x.season) || y.appearances - x.appearances);

  const club = member.clubId
    ? await db.collection("clubs").findOne({ id: member.clubId }, { projection: { name: 1, logo: 1, colors: 1 } })
    : null;
  const usual = [...shirts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    memberId: id,
    name: memberPublicName(member, "Player"),
    photoUrl: memberPhotoIfConsented(member),
    club: club
      ? {
          name: String(club.name ?? ""),
          logo: club.logo ? String(club.logo) : null,
          primary: String(club.colors?.primary ?? "#06054e"),
          secondary: String(club.colors?.secondary ?? club.colors?.primary ?? "#1a1870"),
        }
      : null,
    usualShirtNumber: usual,
    isGoalkeeper: gkGames > 0 && gkGames >= lineups.length / 2,
    seasons,
    career: {
      appearances: seasons.reduce((s, r) => s + r.appearances, 0),
      goals: seasons.reduce((s, r) => s + (r.totals?.goals ?? 0), 0),
      greenCards: seasons.reduce((s, r) => s + (r.totals?.greenCards ?? 0), 0),
      yellowCards: seasons.reduce((s, r) => s + (r.totals?.yellowCards ?? 0), 0),
      redCards: seasons.reduce((s, r) => s + (r.totals?.redCards ?? 0), 0),
    },
    recentMatches: recent.slice(0, 10),
  };
}
