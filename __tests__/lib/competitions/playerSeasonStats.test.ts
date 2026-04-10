import { describe, expect, it } from "vitest";
import {
  aggregatePlayerStatsForSeason,
  asMatchEvents,
  isFixtureResultPublicForEvents,
} from "@/lib/competitions/playerSeasonStats";

describe("playerSeasonStats (E6)", () => {
  it("isFixtureResultPublicForEvents mirrors fixture API visibility", () => {
    expect(
      isFixtureResultPublicForEvents(
        { status: "completed", result: { homeScore: 1 }, resultStatus: "submitted" },
        false,
      ),
    ).toBe(true);
    expect(
      isFixtureResultPublicForEvents(
        { status: "completed", result: { homeScore: 1 }, resultStatus: "submitted" },
        true,
      ),
    ).toBe(false);
    expect(
      isFixtureResultPublicForEvents(
        { status: "completed", result: { homeScore: 1 }, resultStatus: "approved" },
        true,
      ),
    ).toBe(true);
  });

  it("aggregates goals and assists", () => {
    const fixtures = [
      {
        fixtureId: "fx-1",
        round: 1,
        homeTeamId: "h",
        awayTeamId: "a",
        status: "completed",
        result: { homeScore: 2, awayScore: 0 },
        resultStatus: "approved",
        matchEvents: [
          {
            eventId: "e1",
            kind: "goal" as const,
            teamId: "h",
            memberId: "M1",
            assistMemberId: "M2",
          },
          {
            eventId: "e2",
            kind: "goal" as const,
            teamId: "h",
            memberId: "M1",
          },
        ],
      },
    ];
    const { totalsByMember } = aggregatePlayerStatsForSeason(fixtures, true);
    expect(totalsByMember.get("M1")).toMatchObject({
      goals: 2,
      assists: 0,
      matchesWithEvents: 1,
    });
    expect(totalsByMember.get("M2")).toMatchObject({
      goals: 0,
      assists: 1,
      matchesWithEvents: 1,
    });
  });

  it("asMatchEvents drops invalid rows", () => {
    expect(asMatchEvents(null)).toEqual([]);
    expect(
      asMatchEvents([
        { eventId: "x", kind: "goal", teamId: "t", memberId: "m" },
        { bad: true },
      ]),
    ).toHaveLength(1);
  });
});
