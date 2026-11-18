import { describe, expect, it } from "vitest";
import { easterSunday, queenslandHolidays } from "@/lib/draw/holidays";
import { finalsPlan, finalsWeekDate, legsForTeams, placeFinals, resolveSlot } from "@/lib/draw/finals";

describe("holidays", () => {
  it("finds Easter", () => { expect(easterSunday(2027)).toBe("2027-03-28"); expect(easterSunday(2026)).toBe("2026-04-05"); });
  it("lists 2027 Queensland holidays", () => {
    const d = queenslandHolidays(2027).map((h) => h.date);
    for (const x of ["2027-01-01", "2027-01-26", "2027-03-26", "2027-03-27", "2027-03-28", "2027-03-29", "2027-04-25", "2027-04-26", "2027-05-03", "2027-10-04", "2027-12-25", "2027-12-26", "2027-12-27", "2027-12-28"]) expect(d).toContain(x);
  });
});

describe("finals", () => {
  it("chooses legs by team count", () => { expect(legsForTeams(10)).toBe(2); expect(legsForTeams(8)).toBe(2); expect(legsForTeams(7)).toBe(3); expect(legsForTeams(6)).toBe(3); });
  it("has four weeks for ten teams, ending in the grand final", () => {
    const p = finalsPlan(10);
    expect(p.weeks).toBe(4); expect(p.games).toHaveLength(6); expect(p.byes).toEqual([{ week: 1, pos: 1 }]);
    expect(p.games.filter((g) => g.week === 1)).toHaveLength(2);
    const gf = p.games.find((g) => g.grandFinal)!;
    expect(gf.week).toBe(4); expect(gf.home).toEqual({ kind: "winner", game: 3 }); expect(gf.away).toEqual({ kind: "winner", game: 5 });
    expect(p.games.find((g) => g.game === 5)).toMatchObject({ week: 3, home: { kind: "loser", game: 3 }, away: { kind: "winner", game: 4 } });
  });
  it("has three weeks for nine or fewer", () => {
    const p = finalsPlan(6);
    expect(p.weeks).toBe(3); expect(p.games).toHaveLength(4);
    expect(p.games[3]).toMatchObject({ grandFinal: true, home: { kind: "winner", game: 1 }, away: { kind: "winner", game: 3 } });
    expect(finalsWeekDate(p, "2027-09-12", 1)).toBe("2027-08-29");
  });
  it("resolves slots", () => {
    expect(resolveSlot({ kind: "pos", pos: 2 }, ["a", "b", "c"], {})).toBe("b");
    expect(resolveSlot({ kind: "winner", game: 1 }, [], {})).toBeNull();
    expect(resolveSlot({ kind: "loser", game: 1 }, [], { 1: { winner: "x", loser: "y" } })).toBe("y");
  });
  it("places finals on pitches without overlaps", () => {
    const pitches = [{ pitchId: "p1", venueId: "v", venueName: "V1" }, { pitchId: "p2", venueId: "v", venueName: "V2" }] as never[];
    const r = placeFinals([1, 2, 3].map((n) => ({ id: `d${n}`, teamCount: 10, grandFinalDate: "2027-09-18", startTime: "13:00", endTime: "20:00" })), { pitches, matchMinutes: 90, gapMinutes: 15 });
    expect(r.unplaced).toEqual([]); expect(r.placed).toHaveLength(18);
    const keys = r.placed.map((p) => `${p.pitchId}|${p.start}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(r.placed.find((p) => p.game.grandFinal && p.divisionId === "d1")!.date).toBe("2027-09-18");
  });
});
