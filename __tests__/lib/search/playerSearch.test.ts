import { describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import {
  PLAYER_RESULT_LIMIT,
  searchPublicPlayers,
  shapePlayerHits,
  type TeamLite,
} from "@/lib/search/playerSearch";
import type { PlayerFootprint } from "@/lib/competitions/publicPlayerFootprint";

const footprint = (memberId: string, teamIds: string[], seasons = 1): PlayerFootprint => ({
  memberId,
  teamIds,
  seasonCompetitions: Array.from({ length: seasons }, (_, i) => ({
    seasonCompetitionId: `sc-${i}`,
    season: String(2026 - i),
    competitionId: "c",
    owningAssociationId: "a",
    resultApprovalRequired: false,
  })),
});

const teams = new Map<string, TeamLite>([
  ["t-bay", { teamId: "t-bay", clubId: "club-bay", label: "Bayside A" }],
  ["t-nth", { teamId: "t-nth", clubId: "club-nth", label: "Northside A" }],
]);

describe("shapePlayerHits", () => {
  const candidates = [
    { memberId: "m-zed", displayName: "Zed Zhang" },
    { memberId: "m-amy", displayName: "Amy Adams" },
    { memberId: "m-hidden", displayName: "No Footprint" },
  ];
  const footprints = new Map([
    ["m-zed", footprint("m-zed", ["t-bay"], 3)],
    ["m-amy", footprint("m-amy", ["t-bay", "t-nth"])],
  ]);

  it("drops candidates with no public footprint and sorts by name", () => {
    const hits = shapePlayerHits({ candidates, footprints, teamsById: teams, allowedClubIds: null });
    expect(hits.map((h) => h.memberId)).toEqual(["m-amy", "m-zed"]);
    expect(hits[1].seasonCount).toBe(3);
  });

  it("scopes to allowed clubs: out-of-scope players vanish, out-of-scope teams are hidden", () => {
    const hits = shapePlayerHits({
      candidates,
      footprints,
      teamsById: teams,
      allowedClubIds: ["club-nth"],
    });
    expect(hits.map((h) => h.memberId)).toEqual(["m-amy"]);
    expect(hits[0].teamNames).toEqual(["Northside A"]);
  });

  it("an empty allowed-club list shows nobody", () => {
    expect(
      shapePlayerHits({ candidates, footprints, teamsById: teams, allowedClubIds: [] }),
    ).toEqual([]);
  });

  it("caps teams per hit at two and respects the result limit", () => {
    const many = new Map<string, TeamLite>(
      ["a", "b", "c"].map((x) => [`t-${x}`, { teamId: `t-${x}`, clubId: "c1", label: `Team ${x}` }]),
    );
    const hits = shapePlayerHits({
      candidates: [{ memberId: "m1", displayName: "One" }],
      footprints: new Map([["m1", footprint("m1", ["t-a", "t-b", "t-c"])]]),
      teamsById: many,
      allowedClubIds: null,
    });
    expect(hits[0].teamNames).toHaveLength(2);

    const lots = Array.from({ length: PLAYER_RESULT_LIMIT + 5 }, (_, i) => ({
      memberId: `m${i}`,
      displayName: `Player ${String(i).padStart(2, "0")}`,
    }));
    const lotFp = new Map(lots.map((c) => [c.memberId, footprint(c.memberId, ["t-bay"])]));
    expect(
      shapePlayerHits({ candidates: lots, footprints: lotFp, teamsById: teams, allowedClubIds: null }),
    ).toHaveLength(PLAYER_RESULT_LIMIT);
  });
});

/** Minimal in-memory Db: records the projection used on `members`. */
function fakeDb(data: {
  members: Array<Record<string, unknown>>;
  fixtures: Array<Record<string, unknown>>;
  seasonCompetitions: Array<Record<string, unknown>>;
  teams: Array<Record<string, unknown>>;
}) {
  const seen: { memberProjection?: Record<string, unknown> } = {};
  const cursor = (rows: Array<Record<string, unknown>>, onProject?: (p: Record<string, unknown>) => void) => {
    const c = {
      project(p: Record<string, unknown>) {
        onProject?.(p);
        return c;
      },
      limit() {
        return c;
      },
      toArray: async () => rows,
    };
    return c;
  };
  const db = {
    collection(name: string) {
      if (name === "members") {
        return { find: () => cursor(data.members, (p) => (seen.memberProjection = p)) };
      }
      if (name === "league_fixtures") {
        return { aggregate: () => cursor(data.fixtures) };
      }
      if (name === "season_competitions") return { find: () => cursor(data.seasonCompetitions) };
      if (name === "teams") return { find: () => cursor(data.teams) };
      throw new Error(`unexpected collection ${name}`);
    },
  } as unknown as Db;
  return { db, seen };
}

describe("searchPublicPlayers", () => {
  const base = {
    members: [
      { memberId: "m-pub", personalInfo: { firstName: "Jane", lastName: "Smith" } },
      { memberId: "m-priv", personalInfo: { firstName: "Janet", lastName: "Jones" } },
    ],
    fixtures: [
      {
        fixtureId: "f1",
        round: 1,
        seasonCompetitionId: "sc-1",
        homeTeamId: "t-bay",
        awayTeamId: "t-nth",
        status: "completed",
        result: { homeScore: 2, awayScore: 0 },
        resultStatus: "submitted",
        matchEvents: [{ eventId: "e1", kind: "goal", teamId: "t-bay", memberId: "m-pub" }],
      },
    ],
    seasonCompetitions: [
      {
        seasonCompetitionId: "sc-1",
        season: "2026",
        competitionId: "c1",
        owningAssociationId: "a1",
        resultApprovalRequired: false,
      },
    ],
    teams: [{ teamId: "t-bay", clubId: "club-bay", name: "Bayside A" }],
  };

  it("returns only members with a public footprint, with name-only data", async () => {
    const { db } = fakeDb(base);
    const hits = await searchPublicPlayers(db, "jan", { allowedClubIds: null });
    expect(hits).toEqual([
      { memberId: "m-pub", displayName: "Jane Smith", teamNames: ["Bayside A"], seasonCount: 1 },
    ]);
  });

  it("requests only name fields from the members collection", async () => {
    const { db, seen } = fakeDb(base);
    await searchPublicPlayers(db, "jan", { allowedClubIds: null });
    expect(Object.keys(seen.memberProjection ?? {}).sort()).toEqual([
      "memberId",
      "personalInfo.displayName",
      "personalInfo.firstName",
      "personalInfo.lastName",
    ]);
  });

  it("returns nothing for a too-short query without touching the database", async () => {
    const { db } = fakeDb({ ...base, members: [] });
    expect(await searchPublicPlayers(db, "j", { allowedClubIds: null })).toEqual([]);
  });

  it("hides the player on a portal whose clubs do not include their team", async () => {
    const { db } = fakeDb(base);
    expect(await searchPublicPlayers(db, "jan", { allowedClubIds: ["club-other"] })).toEqual([]);
  });
});
