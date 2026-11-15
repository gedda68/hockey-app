import { describe, it, expect } from "vitest";
import { computeMilestones, rankInCompetition, buildRepAppearances, membershipLength } from "@/lib/members/playingExtras";

describe("computeMilestones", () => {
  it("awards a badge every 50 games", () => {
    expect(computeMilestones(49).badges).toHaveLength(0);
    const m = computeMilestones(151);
    expect(m.badges.map((b) => b.games)).toEqual([50, 100, 150]);
    expect(m.badges.map((b) => b.label)).toEqual(["50th game", "100th game", "150th game"]);
    expect(m.next).toEqual({ games: 200, remaining: 49 });
  });
  it("next milestone from zero and on an exact multiple", () => {
    expect(computeMilestones(0).next).toEqual({ games: 50, remaining: 50 });
    expect(computeMilestones(100).next).toEqual({ games: 150, remaining: 50 });
  });
});

describe("rankInCompetition", () => {
  const goals = new Map([["a", 10], ["b", 7], ["c", 7], ["d", 1]]);
  it("ranks by goals with ties sharing a rank", () => {
    expect(rankInCompetition("a", goals)).toEqual({ rank: 1, of: 4, goals: 10 });
    expect(rankInCompetition("b", goals)?.rank).toBe(2);
    expect(rankInCompetition("c", goals)?.rank).toBe(2);
    expect(rankInCompetition("d", goals)?.rank).toBe(4);
    expect(rankInCompetition("z", goals)).toBeNull();
  });
});

describe("buildRepAppearances", () => {
  it("lists accepted player selections and attended tournaments, once each", () => {
    const r = buildRepAppearances(
      "m1",
      [
        { memberId: "m1", status: "accepted", season: "2025", ageGroup: "U16", nominationType: "player" },
        { memberId: "m1", status: "accepted", season: "2025", ageGroup: "U16", nominationType: "player" },
        { memberId: "m1", status: "pending", season: "2026", ageGroup: "Open" },
        { memberId: "m1", status: "accepted", season: "2026", nominationType: "official" },
      ],
      [{ tournamentId: "t1", attendingMemberIds: ["m1"] }, { tournamentId: "t2", attendingMemberIds: ["x"] }],
      new Map([["t1", { title: "2026 State Championships", season: "2026" }]]),
    );
    expect(r).toEqual([
      { year: "2026", label: "2026 State Championships", kind: "tournament" },
      { year: "2025", label: "Representative selection · U16", kind: "selection" },
    ]);
  });
});

describe("membershipLength", () => {
  const now = new Date("2026-11-15T00:00:00Z");
  it("counts whole years since the join date", () => {
    expect(membershipLength("2016-03-01", now)).toEqual({ sinceYear: 2016, years: 10 });
    expect(membershipLength("2016-12-25", now)).toEqual({ sinceYear: 2016, years: 9 });
  });
  it("uses the earliest season when it predates the join date, or when there is none", () => {
    expect(membershipLength("2020-01-01", now, 2015).sinceYear).toBe(2015);
    expect(membershipLength(null, now, 2018)).toEqual({ sinceYear: 2018, years: 8 });
    expect(membershipLength(null, now)).toEqual({ sinceYear: null, years: 0 });
  });
});
