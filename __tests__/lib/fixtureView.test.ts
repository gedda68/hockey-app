import { describe, expect, it } from "vitest";
import { defaultYear, exportRows, pickNextRound, resolveRound, selectMatches, teamText, toCsv } from "@/lib/competitions/fixtureView";

const now = new Date("2027-03-10T10:00:00Z");
const ms = [
  { round: 1, dateTime: "2027-03-06T03:00:00Z", status: "Final" }, { round: 2, dateTime: "2027-03-13T03:00:00Z", status: "Scheduled" },
  { round: 2, dateTime: "2027-03-13T05:00:00Z", status: "Scheduled" }, { round: 3, dateTime: "2027-03-20T03:00:00Z", status: "Scheduled" },
];
describe("match day filters", () => {
  it("opens on this year, else the nearest later one, else the latest", () => {
    expect(defaultYear(["2026", "2027"], new Date("2027-05-01"))).toBe("2027");
    expect(defaultYear(["2026", "2028"], new Date("2027-05-01"))).toBe("2028");
    expect(defaultYear(["2025", "2026"], new Date("2027-05-01"))).toBe("2026");
  });
  it("finds the next round by date", () => {
    expect(pickNextRound(ms, now)).toBe("2");
    expect(pickNextRound(ms, new Date("2027-06-01"))).toBe("3");
    expect(pickNextRound([], now)).toBeNull();
  });
  it("resolves the choices", () => {
    expect(selectMatches(ms, resolveRound(undefined, ms, now))).toHaveLength(2);
    expect(selectMatches(ms, resolveRound("3", ms, now))).toHaveLength(1);
    expect(selectMatches(ms, resolveRound("all", ms, now))).toHaveLength(4);
    expect(selectMatches(ms, resolveRound("week", ms, new Date("2027-03-12T00:00:00")))).toHaveLength(2);
  });
  it("builds export rows in Brisbane time", () => {
    const rows = exportRows([{ round: 1, dateTime: "2027-03-06T03:00:00Z", division: "BHL 1", home: "A", away: "B", venue: "BUR1", status: "Scheduled" }, { round: 2, dateTime: "2027-03-13T03:00:00Z", division: "BHL 1", home: "A", away: "C", venue: "", status: "Final", homeScore: 3, awayScore: 1 }]);
    expect(rows[0].slice(0, 4)).toEqual([1, "06 Mar 2027", "Saturday", "1:00 pm"]);
    expect(rows[1][9]).toBe("3 - 1");
    expect(toCsv([["a", 'b"c']])).toBe('"a","b""c"');
    expect(teamText({ name: "X" })).toBe("X"); expect(teamText("Y")).toBe("Y");
  });
});
