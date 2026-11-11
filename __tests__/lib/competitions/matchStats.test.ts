// @vitest-environment node
import { describe, expect, it } from "vitest";
import { computeMatchStats, entryLabel, goalType, roleTag } from "@/lib/competitions/matchStats";
import type { FixtureMatchEventPublic } from "@/types";

const ev = (kind: string, teamId: string, memberId: string, minute: number | null, notes: string | null = null) =>
  ({ eventId: `${kind}-${memberId}-${minute}`, kind, teamId, memberId, minute, notes }) as FixtureMatchEventPublic;

const players = {
  a1: { name: "Ana Zee", teamId: "H", shirtNumber: 7, isCaptain: true, href: "/p/a1" },
  a2: { name: "Ben Ode", teamId: "H", shirtNumber: 1, isGoalkeeper: true, href: "/p/a2" },
  b1: { name: "Cal Pym", teamId: "A", shirtNumber: 10, href: "/p/b1" },
};

describe("computeMatchStats", () => {
  const events = [
    ev("goal", "H", "a1", 40, "Field Goal"),
    ev("goal", "H", "a1", 12, "Penalty Corner"),
    ev("penalty_stroke_goal", "A", "b1", 55),
    ev("green_card", "A", "b1", 20),
    ev("yellow_card", "H", "a2", 30),
  ];
  const s = computeMatchStats(events, "H", "A", players);

  it("counts goals by type and cards per team, hiding empty rows", () => {
    expect(s.rows).toEqual([
      { key: "goals", label: "Goals", home: 2, away: 1 },
      { key: "field", label: "Field goals", home: 1, away: 0 },
      { key: "corner", label: "Penalty corner goals", home: 1, away: 0 },
      { key: "stroke", label: "Penalty stroke goals", home: 0, away: 1 },
      { key: "green", label: "Green cards", home: 0, away: 1 },
      { key: "yellow", label: "Yellow cards", home: 1, away: 0 },
    ]);
  });

  it("lists scorers with minutes in order", () => {
    expect(s.scorers.home).toEqual([
      expect.objectContaining({ memberId: "a1", shirtNumber: 7, goals: [{ minute: 12, type: "Penalty corner" }, { minute: 40, type: "Field goal" }] }),
    ]);
    expect(s.scorers.away[0]).toMatchObject({ memberId: "b1", goals: [{ minute: 55, type: "Penalty stroke" }] });
  });

  it("builds team sheets ordered by shirt with goals and cards", () => {
    expect(s.lineups.home.map((p) => [p.shirtNumber, p.name, p.goals, p.cards])).toEqual([
      [1, "Ben Ode", 0, ["yellow"]],
      [7, "Ana Zee", 2, []],
    ]);
    expect(goalType({ kind: "shootout_goal", notes: null } as FixtureMatchEventPublic)).toBe("shootout");
  });
});

describe("team sheet helpers", () => {
  it("formats role tags and entry status", () => {
    expect(roleTag({ isCaptain: true, isGoalkeeper: true })).toBe("(GK, C)");
    expect(roleTag({ isCaptain: true, isGoalkeeper: false })).toBe("(C)");
    expect(roleTag({ isCaptain: false, isGoalkeeper: true })).toBe("(GK)");
    expect(roleTag({ isCaptain: false, isGoalkeeper: false })).toBe("");
    expect(entryLabel({ started: true, minuteEntered: null, didNotPlay: false })).toBe("Started");
    expect(entryLabel({ started: false, minuteEntered: 23, didNotPlay: false })).toBe("On 23'");
    expect(entryLabel({ started: false, minuteEntered: null, didNotPlay: true })).toBe("DNP");
  });

  it("orders starters by shirt, subs by minute entered, then DNP", () => {
    const s = computeMatchStats([], "H", "A", {
      s9: { name: "S Nine", teamId: "H", shirtNumber: 9, started: true },
      s2: { name: "S Two", teamId: "H", shirtNumber: 2, started: true },
      b14: { name: "B Late", teamId: "H", shirtNumber: 14, minuteEntered: 40 },
      b12: { name: "B Early", teamId: "H", shirtNumber: 12, minuteEntered: 6 },
      d1: { name: "D Bench", teamId: "H", shirtNumber: 1, didNotPlay: true },
    });
    expect(s.lineups.home.map((p) => p.memberId)).toEqual(["s2", "s9", "b12", "b14", "d1"]);
  });
});
