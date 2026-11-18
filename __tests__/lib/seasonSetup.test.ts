import { describe, expect, it } from "vitest";
import { matchTeams, toWindows, venuesByWords } from "@/lib/draw/seasonSetup";

describe("season setup helpers", () => {
  const docs = [{ teamId: "t1", name: "Eastern Suburbs BHL 1", clubId: "c1" }, { teamId: "t2", name: "eastern suburbs  bhl 2", clubId: "c1" }, { teamId: "t3", name: "Dup" }, { teamId: "t4", name: "dup" }];
  it("matches by name, ignoring case and spacing, and never guesses", () => {
    const r = matchTeams([{ name: "Eastern Suburbs BHL 2", club: "EST", division: "BHL 2" }, { name: "Dup", club: "X", division: "BHL 1" }, { name: "Nobody", club: "X", division: "BHL 1" }], docs);
    expect(r[0].teamId).toBe("t2"); expect(r[1].teamId).toBeNull(); expect(r[1].problem).toMatch(/2 teams/); expect(r[2].problem).toMatch(/No team/);
  });
  it("accepts a chosen id", () => { expect(matchTeams([{ name: "Dup", club: "X", division: "d" }], docs, { Dup: "t3" })[0].teamId).toBe("t3"); });
  it("finds venues by words", () => { expect(venuesByWords([{ venueId: "a", name: "Queensland State Hockey Centre" }, { venueId: "b", name: "UQ Oval" }], ["state hockey centre"]).map((v) => v.venueId)).toEqual(["a"]); });
  it("groups consecutive days", () => {
    expect(toWindows(["2027-03-26", "2027-03-27", "2027-03-28", "2027-04-25"]).map((w) => [w.startDate, w.endDate])).toEqual([["2027-03-26", "2027-03-28"], ["2027-04-25", "2027-04-25"]]);
  });
});
