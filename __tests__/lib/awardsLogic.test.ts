import { describe, it, expect } from "vitest";
import { competitionLeaderboard, cleanBallot, tally, decide, leaderboard, roundShouldClose, windowState, checkNomination, groupNominations, MAX_NOMINATIONS_PER_CATEGORY } from "@/lib/awards/logic";

const squad = ["a", "b", "c", "d", "me"];
describe("cleanBallot", () => {
  it("accepts one to three different teammates", () => {
    expect(cleanBallot({ first: "a" }, "me", squad)).toEqual({ ok: true, ballot: { first: "a" } });
    expect(cleanBallot({ first: "a", second: "b", third: "c" }, "me", squad)).toMatchObject({ ok: true });
  });
  it("rejects self-votes, repeats, strangers and gaps", () => {
    expect(cleanBallot({ first: "me" }, "me", squad)).toMatchObject({ ok: false });
    expect(cleanBallot({ first: "a", second: "a" }, "me", squad)).toMatchObject({ ok: false });
    expect(cleanBallot({ first: "zzz" }, "me", squad)).toMatchObject({ ok: false });
    expect(cleanBallot({ first: "a", third: "b" }, "me", squad)).toMatchObject({ ok: false });
    expect(cleanBallot({}, "me", squad)).toMatchObject({ ok: false });
    expect(cleanBallot(null, "me", squad)).toMatchObject({ ok: false });
  });
});
describe("tally and decide", () => {
  it("counts 3-2-1 and ranks", () => {
    const rows = tally([{ first: "a", second: "b", third: "c" }, { first: "b", second: "a" }, { first: "a" }]);
    expect(rows[0]).toMatchObject({ memberId: "a", points: 8, firsts: 2, seconds: 1 });
    expect(rows[1]).toMatchObject({ memberId: "b", points: 5 });
    expect(decide(rows)).toEqual({ kind: "winner", memberId: "a" });
  });
  it("breaks a points tie on first-place votes", () => {
    // a and b both finish on 5 points; a has the only first-place vote of the two
    const rows = tally([{ first: "a", second: "b" }, { first: "c", second: "b" }, { first: "d", second: "a", third: "b" }]);
    const top = rows.find((r) => r.memberId === "b")!;
    expect(top.points).toBe(5);
    expect(rows.find((r) => r.memberId === "a")!.points).toBe(5);
    expect(decide(rows)).toEqual({ kind: "winner", memberId: "a" });
  });
  it("reports a genuine tie for staff to settle, and nothing when nobody voted", () => {
    expect(decide(tally([{ first: "a" }, { first: "b" }]))).toEqual({ kind: "tied", memberIds: ["a", "b"] });
    expect(decide([])).toEqual({ kind: "none" });
  });
});
describe("leaderboard", () => {
  it("adds up closed matches only and counts wins", () => {
    const rows = leaderboard([
      { teamId: "t", status: "closed", tally: tally([{ first: "a", second: "b" }]), winnerId: "a" },
      { teamId: "t", status: "closed", tally: tally([{ first: "b", second: "a" }]), winnerId: "b" },
      { teamId: "t", status: "closed", tally: tally([{ first: "a" }]), winnerId: "a" },
      { teamId: "t", status: "open", tally: tally([{ first: "z" }]) },
    ]);
    expect(rows[0]).toMatchObject({ memberId: "a", points: 8, wins: 2, rounds: 3 });
    expect(rows.find((r) => r.memberId === "z")).toBeUndefined();
  });
});
describe("roundShouldClose", () => {
  const now = new Date("2026-05-10T00:00:00Z");
  it("closes when time is up or everyone has voted", () => {
    expect(roundShouldClose({ status: "open", closesAt: "2026-05-09T00:00:00Z", voterCount: 10, votedCount: 1 }, now)).toBe(true);
    expect(roundShouldClose({ status: "open", closesAt: "2026-05-12T00:00:00Z", voterCount: 10, votedCount: 10 }, now)).toBe(true);
    expect(roundShouldClose({ status: "open", closesAt: "2026-05-12T00:00:00Z", voterCount: 10, votedCount: 4 }, now)).toBe(false);
    expect(roundShouldClose({ status: "closed", closesAt: "2026-05-09T00:00:00Z", voterCount: 1, votedCount: 1 }, now)).toBe(false);
  });
});
describe("nominations", () => {
  it("window state follows status and dates", () => {
    const now = new Date("2026-09-01T00:00:00Z");
    expect(windowState({ status: "draft" }, now)).toBe("not_open");
    expect(windowState({ status: "open", opensAt: "2026-09-02T00:00:00Z" }, now)).toBe("not_open");
    expect(windowState({ status: "open", opensAt: "2026-08-01T00:00:00Z", closesAt: "2026-09-10T00:00:00Z" }, now)).toBe("open");
    expect(windowState({ status: "open", closesAt: "2026-08-30T00:00:00Z" }, now)).toBe("closed");
    expect(windowState({ status: "judging" }, now)).toBe("closed");
  });
  const base = { nominatorId: "me", nomineeId: "x", categoryId: "c1", reason: "Turned up to every session and helped the juniors" };
  it("checks the nomination", () => {
    expect(checkNomination(base, [])).toBeNull();
    expect(checkNomination({ ...base, nomineeId: "me" }, [])).toMatch(/yourself/);
    expect(checkNomination({ ...base, reason: "good" }, [])).toMatch(/why/);
    expect(checkNomination(base, [{ nominationId: "1", categoryId: "c1", nomineeId: "x", nominatorId: "me", reason: "r" }])).toMatch(/already/);
    const many = Array.from({ length: MAX_NOMINATIONS_PER_CATEGORY }, (_, i) => ({ nominationId: `${i}`, categoryId: "c1", nomineeId: `p${i}`, nominatorId: "me", reason: "r" }));
    expect(checkNomination(base, many)).toMatch(/up to/);
    expect(checkNomination(base, many.map((m) => ({ ...m, categoryId: "other" })))).toBeNull();
  });
  it("groups by award and nominee, most nominated first", () => {
    const g = groupNominations([
      { nominationId: "1", categoryId: "c1", nomineeId: "a", nominatorId: "p", reason: "r1" },
      { nominationId: "2", categoryId: "c1", nomineeId: "b", nominatorId: "q", reason: "r2" },
      { nominationId: "3", categoryId: "c1", nomineeId: "b", nominatorId: "r", reason: "r3" },
    ]);
    expect(g[0]).toMatchObject({ nomineeId: "b", count: 2 });
    expect(g[1]).toMatchObject({ nomineeId: "a", count: 1 });
  });
});

describe("competitionLeaderboard", () => {
  it("adds team votes and officials' votes into one season total", () => {
    const rows = competitionLeaderboard([
      { kind: "team", status: "closed", teamName: "U14", tally: tally([{ first: "a", second: "b" }]), winnerId: "a" },
      { kind: "team", status: "closed", teamName: "U14", tally: tally([{ first: "b" }]), winnerId: "b" },
      { kind: "officials", status: "closed", tally: tally([{ first: "b", second: "z" }]), winnerId: "b" },
      { kind: "team", status: "open", teamName: "U14", tally: tally([{ first: "q" }]) },
    ]);
    expect(rows[0]).toMatchObject({ memberId: "b", teamPoints: 5, officialPoints: 3, total: 8, wins: 2, games: 2, teamName: "U14" });
    expect(rows[1]).toMatchObject({ memberId: "a", total: 3, wins: 1 });
    expect(rows.find((r) => r.memberId === "z")).toMatchObject({ officialPoints: 2, games: 0 });
    expect(rows.find((r) => r.memberId === "q")).toBeUndefined();
  });
  it("breaks a tied total on match wins", () => {
    const rows = competitionLeaderboard([
      { kind: "team", status: "closed", teamName: "T", tally: tally([{ first: "a" }]), winnerId: "a" },
      { kind: "officials", status: "closed", tally: tally([{ first: "b" }]) },
    ]);
    expect(rows.map((r) => r.memberId)).toEqual(["a", "b"]);
  });
});
