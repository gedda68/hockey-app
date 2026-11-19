import { describe, expect, it } from "vitest";
import { computeStats, type StatsFixture } from "@/lib/competitions/statsOverview";

const fx = (id: string, h: string, a: string, hs: number, as: number, events: unknown[] = []): StatsFixture => ({
  fixtureId: id, seasonCompetitionId: "sc1", round: 1, homeTeamId: h, awayTeamId: a, status: "completed",
  result: { resultType: "normal", homeScore: hs, awayScore: as }, matchEvents: events,
});
const ev = (eventId: string, kind: string, teamId: string, memberId: string, assist?: string) => ({ eventId, kind, teamId, memberId, assistMemberId: assist ?? null });
const clubs = new Map([["t1", "c1"], ["t2", "c2"], ["t3", "c1"]]);
const data = [
  fx("f1", "t1", "t2", 3, 0, [ev("e1", "goal", "t1", "m1", "m2"), ev("e2", "goal", "t1", "m1"), ev("e3", "goal", "t1", "m2"), ev("e4", "red_card", "t2", "m9")]),
  fx("f2", "t2", "t3", 1, 1, [ev("e5", "goal", "t2", "m9"), ev("e6", "goal", "t3", "m3")]),
  { ...fx("f3", "t1", "t3", 0, 0), status: "scheduled", result: null },
];

describe("computeStats", () => {
  it("summarises only completed matches", () => {
    const r = computeStats(data, clubs, new Map());
    expect(r.summary).toMatchObject({ matches: 2, goals: 5, avgGoals: 2.5, cleanSheets: 1, red: 1 });
  });
  it("ranks players by their own goals and assists", () => {
    const r = computeStats(data, clubs, new Map());
    const m1 = r.players.find((p) => p.memberId === "m1")!;
    expect(m1).toMatchObject({ goals: 2, assists: 0, clubId: "c1" });
    expect(r.players.find((p) => p.memberId === "m2")).toMatchObject({ goals: 1, assists: 1 });
  });
  it("splits goals into field, penalty corner and penalty stroke", () => {
    const evs = [ev("a", "goal", "t1", "m1"), { ...ev("b", "goal", "t1", "m1"), notes: "Penalty Corner" }, ev("c", "penalty_stroke_goal", "t1", "m1")];
    const m1 = computeStats([fx("g1", "t1", "t2", 3, 0, evs)], clubs, new Map()).players.find((p) => p.memberId === "m1")!;
    expect(m1).toMatchObject({ goals: 3, fieldGoals: 1, corners: 1, strokes: 1 });
  });
  it("builds team goals for/against and clean sheets", () => {
    const t1 = computeStats(data, clubs, new Map()).teams.find((t) => t.teamId === "t1")!;
    expect(t1).toMatchObject({ played: 1, wins: 1, gf: 3, ga: 0, cleanSheets: 1 });
  });
  it("counts each team's cards", () => {
    const t2 = computeStats(data, clubs, new Map()).teams.find((t) => t.teamId === "t2")!;
    expect(t2).toMatchObject({ red: 1, yellow: 0, green: 0 });
  });
  it("filters by club and by player", () => {
    const c = computeStats(data, clubs, new Map(), { clubId: "c2" });
    expect(c.teams.map((t) => t.teamId)).toEqual(["t2"]);
    expect(c.players.map((p) => p.memberId)).toEqual(["m9"]);
    const p = computeStats(data, clubs, new Map(), { memberId: "m3" });
    expect(p.players.map((x) => x.memberId)).toEqual(["m3"]);
    expect(p.playerChoices.length).toBeGreaterThan(1);
  });
  it("hides unapproved results when the competition requires approval", () => {
    const r = computeStats(data, clubs, new Map([["sc1", true]]));
    expect(r.summary.matches).toBe(0);
  });
});
