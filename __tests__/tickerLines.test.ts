import { describe, expect, it } from "vitest";
import { buildTickerLines, fixtureRoundLabel } from "@/lib/competitions/tickerLines";
import type { TickerMatch } from "@/lib/competitions/tickerLines";

const m = (id: string, sc: string, date: string, h = 1, a = 0): TickerMatch =>
  ({ matchId: id, seasonCompetitionId: sc, dateTime: date, division: "BHL 1", homeTeam: { name: `H${id}` }, awayTeam: { name: `A${id}` }, score: { home: h, away: a } });

describe("buildTickerLines", () => {
  it("lists the newest results first", () => {
    const l = buildTickerLines([m("a", "sc-1", "2026-08-01T00:00:00Z"), m("b", "sc-1", "2026-09-19T00:00:00Z")]);
    expect(l.map((x) => x.key)).toEqual(["b", "a"]);
    expect(l[0]).toMatchObject({ division: "BHL 1", home: { name: "Hb", icon: null }, away: { name: "Ab" }, homeScore: "1", awayScore: "0" });
  });
  it("keeps demo results out when real ones exist, even if the demo ones are newer", () => {
    const l = buildTickerLines([m("demo", "sc-demo-x-2026", "2026-11-14T00:00:00Z"), m("final", "sc-real", "2026-09-19T00:00:00Z")]);
    expect(l.map((x) => x.key)).toEqual(["final"]);
  });
  it("falls back to demo results when nothing else exists", () => {
    expect(buildTickerLines([m("demo", "sc-demo-x-2026", "2026-11-14T00:00:00Z")]).map((x) => x.key)).toEqual(["demo"]);
  });
});

describe("shootouts", () => {
  it("adds the shootout score only when there was one", () => {
    const so = { ...m("s", "sc-1", "2026-09-19T00:00:00Z", 1, 1), shootoutScore: { home: 5, away: 4 } };
    const [a, b] = buildTickerLines([so, m("n", "sc-1", "2026-09-18T00:00:00Z")]);
    expect(a).toMatchObject({ homeScore: "1", awayScore: "1", homeShootout: "5", awayShootout: "4" });
    expect(b.homeShootout).toBeUndefined();
  });
});

describe("fixtureRoundLabel", () => {
  it("labels league rounds and finals stages", () => {
    expect(fixtureRoundLabel({ round: 20, matchLevel: "league" })).toBe("Round 20");
    expect(fixtureRoundLabel({ round: 23, matchLevel: "finals", altius: { phaseLabel: "Grand Final" } })).toBe("Grand Final");
    expect(fixtureRoundLabel({ round: 24, matchLevel: "finals", finals: { week: 2 } })).toBe("Finals Week 2");
    expect(fixtureRoundLabel({ round: 0 })).toBe("");
  });
});
