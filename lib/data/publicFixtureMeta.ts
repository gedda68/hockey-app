// lib/data/publicFixtureMeta.ts — a competition's published fixtures with the club and team behind each side, for filtering and export.
import clientPromise from "@/lib/mongodb";
import type { Match } from "@/types";

export type FixtureMeta = {
  match: Match;
  homeTeamId?: string;
  awayTeamId?: string;
  homeClubId?: string;
  awayClubId?: string;
};

export async function loadFixturesMeta(seasonCompetitionId: string): Promise<{
  fixtures: FixtureMeta[];
  clubLabelById: Map<string, string>;
  teamLabelById: Map<string, string>;
}> {
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");

  const raw = await db
    .collection("league_fixtures")
    .find(
      { seasonCompetitionId, published: true },
      {
        projection: {
          fixtureId: 1,
          seasonCompetitionId: 1,
          competitionId: 1,
          round: 1,
          status: 1,
          homeTeamId: 1,
          awayTeamId: 1,
          scheduledStart: 1,
          venueName: 1,
          result: 1,
          resultStatus: 1,
        },
      },
    )
    .sort({ round: 1, scheduledStart: 1, fixtureId: 1 })
    .toArray();

  const teamIds = new Set<string>();
  for (const f of raw) {
    if (typeof f.homeTeamId === "string" && f.homeTeamId) teamIds.add(f.homeTeamId);
    if (typeof f.awayTeamId === "string" && f.awayTeamId) teamIds.add(f.awayTeamId);
  }

  const teams =
    teamIds.size > 0
      ? await db
          .collection("teams")
          .find({ teamId: { $in: [...teamIds] } })
          .project({ teamId: 1, name: 1, clubId: 1 })
          .toArray()
      : [];

  const teamLabelById = new Map<string, string>();
  const clubIdByTeam = new Map<string, string>();
  for (const t of teams) {
    const tid = typeof t.teamId === "string" ? t.teamId : "";
    if (!tid) continue;
    teamLabelById.set(tid, String(t.name ?? tid));
    if (t.clubId) clubIdByTeam.set(tid, String(t.clubId));
  }

  const clubIds = new Set<string>();
  for (const cid of clubIdByTeam.values()) if (cid) clubIds.add(cid);

  const clubs =
    clubIds.size > 0
      ? await db
          .collection("clubs")
          .find({ id: { $in: [...clubIds] } })
          .project({ id: 1, name: 1, shortName: 1 })
          .toArray()
      : [];

  const clubLabelById = new Map<string, string>();
  for (const c of clubs) {
    const id = typeof c.id === "string" ? c.id : "";
    if (!id) continue;
    const label = String(c.name ?? c.shortName ?? id).trim() || id;
    clubLabelById.set(id, label);
  }

  const fixtures: FixtureMeta[] = raw.map((f) => {
    const homeTeamId = typeof f.homeTeamId === "string" ? f.homeTeamId : undefined;
    const awayTeamId = typeof f.awayTeamId === "string" ? f.awayTeamId : undefined;
    const homeClubId = homeTeamId ? clubIdByTeam.get(homeTeamId) : undefined;
    const awayClubId = awayTeamId ? clubIdByTeam.get(awayTeamId) : undefined;
    const matchId = String(f.fixtureId ?? "");
    const scheduled = typeof f.scheduledStart === "string" ? f.scheduledStart : new Date().toISOString();

    // Use the existing normalization already inside lib/data/matches via filterMatches mapping,
    // but for filtering we only need stable ids here; the displayed cards use `match`.
    const match: Match = {
      matchId,
      seasonCompetitionId: String(f.seasonCompetitionId ?? seasonCompetitionId),
      division: String(f.competitionId ?? "Competition"),
      round: f.round ?? "",
      status: String(f.status ?? "Scheduled"),
      homeTeam: homeTeamId ? (teamLabelById.get(homeTeamId) ?? homeTeamId) : "Home",
      awayTeam: awayTeamId ? (teamLabelById.get(awayTeamId) ?? awayTeamId) : "Away",
      dateTime: scheduled,
      location: typeof f.venueName === "string" ? f.venueName : undefined,
    };

    return { match, homeTeamId, awayTeamId, homeClubId, awayClubId };
  });

  return { fixtures, clubLabelById, teamLabelById };
}

/** Teams with the bye in each round of a division with an odd number of teams (counts all matches, published or not). */
export async function loadByes(seasonCompetitionId: string): Promise<Record<number, { teamId: string; name: string }[]>> {
  const { computeByes } = await import("@/lib/competitions/byes");
  const db = (await clientPromise).db(process.env.DB_NAME || "hockey-app");
  const fx = await db.collection("league_fixtures").find({ seasonCompetitionId, status: { $nin: ["cancelled"] } }).project({ round: 1, homeTeamId: 1, awayTeamId: 1, matchLevel: 1, status: 1 }).toArray();
  const byes = computeByes(fx);
  const ids = [...new Set(Object.values(byes).flat())];
  if (!ids.length) return {};
  const teams = await db.collection("teams").find({ teamId: { $in: ids } }).project({ teamId: 1, name: 1 }).toArray();
  const nameOf = new Map(teams.map((t) => [String(t.teamId), String(t.name ?? t.teamId)]));
  return Object.fromEntries(Object.entries(byes).map(([r, list]) => [Number(r), list.map((teamId) => ({ teamId, name: nameOf.get(teamId) ?? teamId }))]));
}
