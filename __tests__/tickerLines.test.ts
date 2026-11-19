import { describe, expect, it } from "vitest";
import { buildTickerLines } from "@/lib/competitions/tickerLines";
import type { TickerMatch } from "@/lib/competitions/tickerLines";

const m = (id: string, sc: string, date: string, h = 1, a = 0): TickerMatch =>
  ({ matchId: id, seasonCompetitionId: sc, dateTime: date, division: "BHL 1", homeTeam: { name: `H${id}` }, awayTeam: { name: `A${id}` }, score: { home: h, away: a } });

describe("buildTickerLines", () => {
  it("lists the newest results first", () => {
    const l = buildTickerLines([m("a", "sc-1", "2026-08-01T00:00:00Z"), m("b", "sc-1", "2026-09-19T00:00:00Z")]);
    expect(l.map((x) => x.key)).toEqual(["b", "a"]);
    expect(l[0].text).toBe("BHL 1 · Hb 1–0 Ab");
  });
  it("keeps demo results out when real ones exist, even if the demo ones are newer", () => {
    const l = buildTickerLines([m("demo", "sc-demo-x-2026", "2026-11-14T00:00:00Z"), m("final", "sc-real", "2026-09-19T00:00:00Z")]);
    expect(l.map((x) => x.key)).toEqual(["final"]);
  });
  it("falls back to demo results when nothing else exists", () => {
    expect(buildTickerLines([m("demo", "sc-demo-x-2026", "2026-11-14T00:00:00Z")]).map((x) => x.key)).toEqual(["demo"]);
  });
});
