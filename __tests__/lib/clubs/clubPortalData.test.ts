// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  getClubActiveCoaches,
  getClubActivePlayers,
  getClubMemberLinks,
  getClubMemberStats,
  getClubTeamsOverview,
  getClubUpcomingFixtures,
  teamCategory,
} from "@/lib/clubs/clubPortalData";
import { memoryDb } from "../../helpers/memoryDb";

const club = { id: "club-X", slug: "x-hockey", committee: [{ position: "President", name: "Ana Zee" }] };
const m = (memberId: string, first: string, last: string, roles: string[], status = "Active", extra = {}) => ({
  memberId, clubId: "club-X", roles, membership: { status }, personalInfo: { firstName: first, lastName: last, displayName: `${first} ${last}` }, ...extra,
});
const db = memoryDb({
  clubs: [club],
  members: [
    m("p1", "Ana", "Zee", ["role-player"]),
    m("p2", "Ben", "Ode", ["role-junior-player"], "Inactive"),
    m("c1", "Cal", "Pym", ["role-coach"]),
    m("c2", "Old", "Coach", ["role-coach"], "Inactive"),
    m("c3", "Ash", "Bee", []),
    m("c4", "Zed", "Aaa", ["role-coach"]),
    m("u1", "Dee", "Ump", ["role-umpire", "role-volunteer"]),
    m("x1", "Eve", "Away", [], "Active", { clubId: "club-Y", clubRegistrations: [{ clubId: "club-X" }] }), // plays here too
    m("o1", "Out", "Sider", ["role-player"], "Active", { clubId: "club-Y" }),
  ],
  teams: [
    { teamId: "t1", clubId: "club-X", name: "X BHL 1", grade: "BHL 1", season: "2026", ageCategory: "senior", gender: "mixed", seasonCompetitionId: "sc1",
      roster: [{ memberId: "p1", roleCategory: "Participant", registrationType: "registered", jerseyNumber: 7 }, { memberId: "c1", roleId: "role-coach", roleCategory: "Official" }],
      leadership: { captain: "p1" } },
    { teamId: "t2", clubId: "club-X", name: "X JHL U14A", season: "2026", ageCategory: "junior", gender: "mixed", roster: [{ memberId: "x1", roleCategory: "Participant", registrationType: "registered" }, { memberId: "c1", roleId: "role-coach", roleCategory: "Official" }] },
    { teamId: "t9", clubId: "club-Y", name: "Y BHL 1", season: "2026", ageCategory: "senior" },
  ],
  fixture_lineups: [
    { fixtureId: "f1", teamId: "t1", players: [{ memberId: "p1", shirtNumber: 7, isCaptain: true }, { memberId: "x1", shirtNumber: 21 }, { memberId: "p2", didNotPlay: true }], staff: [{ memberId: "c1", role: "Coach" }, { memberId: "c3", role: "Assistant Coach" }] },
  ],
  league_fixtures: [
    { fixtureId: "f1", scheduledStart: "2026-03-01T01:00:00.000Z", published: true, status: "completed", homeTeamId: "t1", awayTeamId: "t9" },
    { fixtureId: "f2", scheduledStart: "2030-03-01T01:00:00.000Z", published: true, status: "scheduled", round: 3, seasonCompetitionId: "sc1", homeTeamId: "t9", awayTeamId: "t1", venueName: "SHC" },
  ],
  season_competitions: [{ seasonCompetitionId: "sc1", displayName: "2030 BHL 1" }],
});

describe("club portal data", () => {
  it("categorises teams", () => {
    expect(teamCategory({ ageCategory: "senior", gender: "mixed" })).toBe("mens");
    expect(teamCategory({ ageCategory: "senior", gender: "female" })).toBe("womens");
    expect(teamCategory({ ageCategory: "masters", gender: "male" })).toBe("masters-men");
    expect(teamCategory({ ageCategory: "masters", name: "Women's Masters 1" })).toBe("masters-women");
    expect(teamCategory({ ageCategory: "junior", gender: "mixed" })).toBe("junior-boys");
    expect(teamCategory({ ageCategory: "junior", name: "U12 Girls" })).toBe("junior-girls");
  });

  it("counts members incl. registered-elsewhere, active, unique players and coaches", async () => {
    expect(await getClubMemberStats(db, club)).toEqual({
      total: 8, active: 6, inactive: 2, players: 3, activePlayers: 2, coaches: 4, activeCoaches: 3,
    });
  });

  it("links members to teams and positions", async () => {
    const members = (await db.collection("members").find({ $or: [{ clubId: "club-X" }, { "clubRegistrations.clubId": "club-X" }] }).toArray());
    const links = await getClubMemberLinks(db, club, members);
    expect(links.p1).toEqual({ teams: [{ teamId: "t1", name: "X BHL 1", season: "2026", role: "Player" }], positions: ["President", "Player"] });
    expect(links.x1!.teams.map((t) => t.teamId).sort()).toEqual(["t1", "t2"]); // more than one team
    expect(links.c1!.positions).toEqual(["Coach"]);
    expect(links.u1!.positions).toEqual(["Umpire", "Volunteer"]);
    expect(links.x1!.positions).toEqual(["Player"]); // from team sheets, no member role
    expect(links.p2!.teams).toEqual([]); // DNP only
    expect(links.p2!.positions).toEqual(["Junior Player"]);
  });

  it("builds team overviews with latest team sheet and staff", async () => {
    const { season, teams } = await getClubTeamsOverview(db, club);
    expect(season).toBe("2026");
    const t1 = teams.find((t) => t.teamId === "t1")!;
    expect(t1.category).toBe("mens");
    expect(t1.players.map((p) => [p.name, p.inLatestLineup, p.registered, p.isCaptain])).toEqual([
      ["Ana Zee", true, true, true],
      ["Eve Away", true, false, false],
    ]);
    expect(t1.staff.map((s) => [s.name, s.role])).toEqual([["Cal Pym", "Coach"], ["Ash Bee", "Assistant Coach"]]);
    expect(teams.map((t) => t.category)).toEqual(["mens", "junior-boys"]);
  });

  it("lists upcoming fixtures for the club's teams only", async () => {
    const f = await getClubUpcomingFixtures(db, club, new Date("2029-01-01T00:00:00Z"));
    expect(f).toEqual([
      expect.objectContaining({ fixtureId: "f2", teamId: "t1", opponent: "Y BHL 1", isHome: false, competition: "2030 BHL 1", venue: "SHC", category: "mens", round: 3 }),
    ]);
  });

  it("lists active coaches (sorted by surname) with the teams they coach", async () => {
    const coaches = await getClubActiveCoaches(db, club);
    expect(coaches.map((c) => c.memberId)).toEqual(["c4", "c3", "c1"]); // Aaa, Bee, Pym; inactive c2 excluded
    expect(coaches.find((c) => c.memberId === "c1")!.teams.map((t) => [t.teamId, t.role])).toEqual([["t1", "Coach"], ["t2", "Coach"]]);
    expect(coaches.find((c) => c.memberId === "c3")).toMatchObject({ roles: ["Assistant Coach"], teams: [{ teamId: "t1", role: "Assistant Coach" }] });
    expect(coaches.find((c) => c.memberId === "c4")!.teams).toEqual([]);
  });

  it("builds a single team's overview by id", async () => {
    const { teams } = await getClubTeamsOverview(db, club, { teamId: "t2" });
    expect(teams.map((t) => t.teamId)).toEqual(["t2"]);
    expect((await getClubTeamsOverview(db, club, { teamId: "t9" })).teams).toEqual([]); // other club's team
  });

  it("lists active players with the teams they're selected in", async () => {
    const players = await getClubActivePlayers(db, club);
    expect(players.map((p) => p.memberId)).toEqual(["x1", "p1"]); // Away, Zee; inactive p2 excluded
    expect(players.find((p) => p.memberId === "x1")!.teams.map((t) => [t.teamId, t.games])).toEqual([["t1", 1], ["t2", 0]]); // more than one team
    expect(players.find((p) => p.memberId === "p1")!.teams).toEqual([{ teamId: "t1", name: "X BHL 1", season: "2026", role: "Player", games: 1 }]);
  });
});
