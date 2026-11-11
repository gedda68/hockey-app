// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildMatchTimeline } from "@/lib/competitions/matchTimeline";
import { periodsFrom, transformTeamStats } from "@/lib/altius/teamStats";
import type { FixtureMatchEventPublic } from "@/types";

const ev = (kind: string, teamId: string, minute: number | null, notes: string | null = null) =>
  ({ eventId: `${kind}-${teamId}-${minute}`, kind, teamId, memberId: "m", minute, notes }) as FixtureMatchEventPublic;

describe("buildMatchTimeline", () => {
  const events = [
    ev("goal", "H", 12, "Penalty Corner"),
    ev("green_card", "A", 30),
    ev("goal", "A", 66, "Field Goal"),
    ev("yellow_card", "H", 70), // after the last period end → still last period
    ev("goal", "H", null, "Field Goal"),
  ];
  const teamStats = {
    H: { penaltyCornersAwarded: { total: 3, byPeriod: [2, 0, 0, 1] } },
    A: { penaltyCornersAwarded: { total: 1, byPeriod: [0, 1, 0, 0] } },
  };

  it("groups by quarter with club penalty-corner rows first", () => {
    const g = buildMatchTimeline(events, [17, 34, 51, 68], teamStats, ["H", "A"]);
    expect(g.map((x) => [x.label, x.range])).toEqual([
      ["1st quarter", "0'–17'"],
      ["2nd quarter", "17'–34'"],
      ["3rd quarter", "34'–51'"],
      ["4th quarter", "51'–68'"],
      ["Time not recorded", null],
    ]);
    expect(g[0]!.items).toEqual([
      { type: "club", teamId: "H", kind: "penalty_corners", awarded: 2, scored: 1 },
      { type: "event", event: events[0] },
    ]);
    expect(g[1]!.items[0]).toEqual({ type: "club", teamId: "A", kind: "penalty_corners", awarded: 1, scored: 0 });
    expect(g[2]!.items).toEqual([]);
    expect(g[3]!.items.map((i) => (i.type === "club" ? `club:${i.teamId}` : i.event.kind))).toEqual(["club:H", "goal", "yellow_card"]);
  });

  it("labels halves and falls back to one group without periods", () => {
    expect(buildMatchTimeline([ev("goal", "H", 5)], [30, 60], {}, ["H"]).map((g) => g.label)).toEqual(["First half", "Second half"]);
    const flat = buildMatchTimeline([ev("goal", "H", 5)], [], teamStats, ["H", "A"]);
    expect(flat[0]!.items[0]).toMatchObject({ type: "club", teamId: "H", awarded: 3 });
  });
});

describe("transformTeamStats", () => {
  it("reads quarters and halves layouts and only keeps recorded optional stats", () => {
    expect(periodsFrom([1, 0, 0, 2])).toEqual([1, 0, 0, 2]);
    expect(periodsFrom([1, null, 0, null])).toEqual([1, 0]);
    const zero = { home: [0, 0, 0, 0], homeTotal: 0, away: [0, 0, 0, 0], awayTotal: 0 };
    const { teamStats, warnings } = transformTeamStats(
      {
        data: {
          "5013": { qEnds: [17, 34, 51, 68], stats: { "Penalty Corners": { home: [1, 0, 0, 2], homeTotal: 3, away: [0, 1, 0, 1], awayTotal: 2 }, Shots: zero } },
          "9999": { qEnds: [], stats: {} },
        },
      },
      [{ fixtureId: "fx-altius-5013", legacyMatchId: "5013", seasonCompetitionId: "sc", homeTeamId: "team-altius-504", awayTeamId: "team-altius-510", matchEvents: [] }],
      new Date("2026-11-11T00:00:00Z"),
    );
    expect(warnings).toEqual([]);
    expect(teamStats).toHaveLength(2);
    expect(teamStats[0]).toMatchObject({
      statsId: "fts-altius-5013-504",
      teamId: "team-altius-504",
      periodEndMinutes: [17, 34, 51, 68],
      penaltyCornersAwarded: { total: 3, byPeriod: [1, 0, 0, 2] },
      shots: null,
      penaltyStrokesAwarded: null,
    });
    expect(teamStats[1]!.penaltyCornersAwarded).toEqual({ total: 2, byPeriod: [0, 1, 0, 1] });
  });
});
