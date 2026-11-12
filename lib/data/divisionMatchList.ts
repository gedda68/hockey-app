// lib/data/divisionMatchList.ts
// Compact list of one season competition's published matches, for the match
// centre's quick-links sidebar.

import clientPromise from "@/lib/mongodb";

const PUBLIC_SC_STATUSES = ["published", "in_progress", "completed"];

export interface DivisionMatchListItem {
  fixtureId: string;
  round: number | null;
  /** Finals label (e.g. "Grand Final") when the fixture is a finals game. */
  stage: string | null;
  dateTime: string | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  shootout: string | null;
  status: string;
}

export async function getDivisionMatchList(seasonCompetitionId: string): Promise<DivisionMatchListItem[]> {
  const id = seasonCompetitionId.trim();
  if (!id) return [];
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");

  const sc = await db
    .collection("season_competitions")
    .findOne({ seasonCompetitionId: id, status: { $in: PUBLIC_SC_STATUSES } }, { projection: { _id: 1 } });
  if (!sc) return [];

  const fixtures = await db
    .collection("league_fixtures")
    .find(
      { seasonCompetitionId: id, published: true },
      { projection: { fixtureId: 1, round: 1, matchLevel: 1, scheduledStart: 1, homeTeamId: 1, awayTeamId: 1, status: 1, result: 1 } },
    )
    .sort({ scheduledStart: 1, round: 1 })
    .toArray();

  const teamIds = [...new Set(fixtures.flatMap((f) => [String(f.homeTeamId), String(f.awayTeamId)]))];
  const teams = await db.collection("teams").find({ teamId: { $in: teamIds } }, { projection: { teamId: 1, name: 1 } }).toArray();
  const name = new Map(teams.map((t) => [String(t.teamId), String(t.name)]));

  return fixtures.map((f) => {
    const r = f.status === "completed" ? (f.result as Record<string, any> | null) : null;
    const so = r && r.shootoutHomeScore != null && r.shootoutAwayScore != null ? `${r.shootoutHomeScore}-${r.shootoutAwayScore}` : null;
    return {
      fixtureId: String(f.fixtureId),
      round: typeof f.round === "number" ? f.round : null,
      stage: f.matchLevel === "finals" ? (typeof r?.notes === "string" && r.notes ? r.notes : "Finals") : null,
      dateTime: f.scheduledStart ? String(f.scheduledStart) : null,
      homeTeam: name.get(String(f.homeTeamId)) ?? "Home",
      awayTeam: name.get(String(f.awayTeamId)) ?? "Away",
      homeScore: typeof r?.homeScore === "number" ? r.homeScore : null,
      awayScore: typeof r?.awayScore === "number" ? r.awayScore : null,
      shootout: so,
      status: String(f.status ?? "scheduled"),
    };
  });
}
