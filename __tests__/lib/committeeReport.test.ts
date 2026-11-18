import { describe, it, expect } from "vitest";
import { buildCommitteeReport, committeeCsv, type Person, type Reg } from "@/lib/reports/committee";
import { ageGroup, genderLabel, roleKinds } from "@/lib/reports/groups";
import { cleanSchool, groupKey } from "@/lib/members/school";

describe("groups", () => {
  it("ages by season year, and understands labels and role ids", () => {
    expect(ageGroup("2014-03-01", 2026)).toBe("Under 14");
    expect(ageGroup("2000-01-01", 2026)).toBe("Open");
    expect(ageGroup("1980-01-01", 2026)).toBe("Masters 45+");
    expect(ageGroup(undefined, 2026)).toBe("Unknown");
    expect(genderLabel("F")).toBe("Female");
    expect(genderLabel("Male")).toBe("Male");
    expect(genderLabel("non-binary")).toBe("Other");
    expect(genderLabel("")).toBe("Unknown");
    expect(roleKinds(["role-junior-player", "coach"])).toMatchObject({ player: true, coach: true, umpire: false });
    expect(roleKinds(["role-technical-official"]).technical).toBe(true);
    expect(roleKinds(["role-umpire"]).umpire).toBe(true);
  });
  it("school: only a clear answer is kept", () => {
    expect(cleanSchool(undefined)).toBeNull();
    expect(cleanSchool({ attends: "yes" })).toBeNull();
    expect(cleanSchool({ attends: false, name: "Ignored" })).toEqual({ attends: false });
    expect(cleanSchool({ attends: true, name: "  Kelvin   Grove SC ", district: " Brisbane North " })).toEqual({ attends: true, name: "Kelvin Grove SC", district: "Brisbane North" });
    expect(cleanSchool({ attends: true })).toEqual({ attends: true });
    expect(groupKey("Kelvin Grove  S.C.")).toBe(groupKey("kelvin grove sc"));
  });
});

const reg = (memberId: string, season: string, roles: string[], clubId = "c1", at: string | null | undefined = `${season}-02-10T00:00:00Z`): Reg => ({ memberId, season, roles, clubId, at });
const people = new Map<string, Person>([
  ["a", { name: "Ann", gender: "F", dob: "2012-01-01", school: { attends: true, name: "Kelvin Grove SC", district: "Brisbane North" } }],
  ["b", { name: "Ben", gender: "M", dob: "2012-05-01", school: { attends: true, name: "kelvin grove sc", district: "Brisbane North" } }],
  ["c", { name: "Cat", gender: "F", dob: "2010-05-01", school: { attends: false } }],
  ["d", { name: "Dan", gender: "M", dob: "1985-05-01" }],
  ["e", { name: "Eve", gender: "F", dob: "1990-05-01" }],
  ["f", { name: "Fay", gender: "F", dob: "2013-05-01" }],
]);
const regs: Reg[] = [
  reg("a", "2024", ["role-player"]), reg("b", "2024", ["role-player"]), reg("c", "2024", ["role-player"]), reg("d", "2024", ["coach"]),
  reg("a", "2025", ["role-player"]), reg("b", "2025", ["role-player"]), reg("d", "2025", ["coach"]), reg("e", "2025", ["umpire"], "c2"),
  reg("a", "2026", ["role-player"]), reg("c", "2026", ["role-player"], "c2", "2026-04-02T00:00:00Z"), reg("d", "2026", ["coach", "umpire"]), reg("e", "2026", ["technical-official"], "c2"), reg("f", "2026", ["role-junior-player"], "c1", "2026-03-01T00:00:00Z"),
  reg("zz", "2026", ["player"], "c1", null), { memberId: "x", season: "bad", roles: [] },
];
const r = buildCommitteeReport({ regs, people, season: "2026", clubNames: new Map([["c1", "Hawks"], ["c2", "Eagles"]]) });

describe("trend and retention", () => {
  it("counts people and kinds each season", () => {
    expect(r.seasons).toEqual(["2024", "2025", "2026"]);
    expect(r.trend.map((t) => t.people)).toEqual([4, 4, 6]);
    expect(r.trend[2]).toMatchObject({ players: 4, coaches: 1, umpires: 1, technical: 1 });
  });
  it("works out who came back, who left, and who is new or returning after a break", () => {
    expect(r.retention).toHaveLength(2);
    expect(r.retention[0]).toMatchObject({ season: "2025", previous: 4, retained: 3, lapsed: 1, rate: 75 });
    expect(r.retention[0]).toMatchObject({ brandNew: 1, returning: 0 });
    // 2026: from 2025's {a,b,d,e}: a,d,e came back, b left; c returns after a break, f and zz are new
    expect(r.retention[1]).toMatchObject({ season: "2026", previous: 4, retained: 3, lapsed: 1, rate: 75, returning: 1, brandNew: 2 });
  });
  it("retention by age group and gender, using last season's age", () => {
    expect(r.retentionByAge.find((x) => x.label === "Under 14")).toMatchObject({ cohort: 2, retained: 1, rate: 50 });
    expect(r.retentionByGender.find((x) => x.label === "Female")).toMatchObject({ cohort: 2, retained: 2, rate: 100 });
    expect(r.retentionByGender.find((x) => x.label === "Male")).toMatchObject({ cohort: 2, retained: 1, rate: 50 });
  });
});

describe("participation", () => {
  it("splits players and all members by age group and gender", () => {
    expect(r.players.find((c) => c.label === "Under 14")).toMatchObject({ total: 1, Female: 1 }); // f, born 2013
    expect(r.players.find((c) => c.label === "Under 16")).toMatchObject({ total: 1, Female: 1 }); // a, born 2012
    expect(r.players.find((c) => c.label === "Under 18")).toMatchObject({ total: 1, Female: 1 }); // c, born 2010
    expect(r.players.find((c) => c.label === "Unknown")).toMatchObject({ total: 1, Unknown: 1 }); // zz has no profile
    expect(r.members.reduce((s, c) => s + c.total, 0)).toBe(r.totals.members);
    expect(r.totals).toMatchObject({ members: 6, players: 4, femalePlayers: 3, malePlayers: 0 });
  });
  it("registration by month, against last season", () => {
    expect(r.monthly[1]).toMatchObject({ month: "Feb", current: 3, previous: 4 }); // 2026: a, d, e registered in Feb; 2025: all four did
    expect(r.monthly[2].current).toBe(1); // f in March
    expect(r.monthly[3].current).toBe(1); // c in April
  });
});

describe("officials, schools and clubs", () => {
  it("lists registered coaches, umpires and technical officials by name with their clubs", () => {
    expect(r.officials.coaches).toEqual([expect.objectContaining({ name: "Dan", clubs: ["Hawks"] })]);
    expect(r.officials.umpires.map((o) => o.name)).toEqual(["Dan"]);
    expect(r.officials.technical).toEqual([expect.objectContaining({ name: "Eve", clubs: ["Eagles"] })]);
  });
  it("groups schools and districts however they were typed, and says how much is recorded", () => {
    expect(r.school.schools[0]).toMatchObject({ label: "Kelvin Grove SC", count: 1, district: "Brisbane North" });
    expect(r.school.atSchool).toBe(1);
    expect(r.school.notAtSchool).toBe(1);
    expect(r.school.notRecorded).toBe(4);
    const both = buildCommitteeReport({ regs: [reg("a", "2026", ["player"]), reg("b", "2026", ["player"])], people, season: "2026" });
    expect(both.school.schools).toEqual([expect.objectContaining({ count: 2 })]);
    expect(both.school.districts).toEqual([{ label: "Brisbane North", count: 2 }]);
    expect(both.school.youngCoverage).toBe(100);
  });
  it("counts players by school and district, split by gender", () => {
    const x = buildCommitteeReport({ regs: [reg("a", "2026", ["player"]), reg("b", "2026", ["player"]), reg("d", "2026", ["coach"])], people, season: "2026" });
    expect(x.schoolPlayers.districts).toEqual([expect.objectContaining({ label: "Brisbane North", total: 2, Female: 1, Male: 1 })]);
    expect(x.schoolPlayers.schools[0]).toMatchObject({ total: 2, Female: 1, Male: 1, district: "Brisbane North" });
    expect(x.schoolPlayers.recorded).toBe(2);
  });
  it("compares clubs", () => {
    expect(r.clubs.find((c) => c.clubId === "c2")).toMatchObject({ name: "Eagles", people: 2, previous: 1, retained: 1, rate: 100 });
  });
  it("makes a spreadsheet with a section for each table, safe from formulas", () => {
    const csv = committeeCsv(buildCommitteeReport({ regs: [reg("e", "2026", ["umpire"])], people: new Map([["e", { name: "=SUM(A1)" }]]), season: "2026" }), "Hawks");
    expect(csv).toContain("Registration trend");
    expect(csv).toContain("\"'=SUM(A1)\"");
    expect(committeeCsv(r, "Hawks")).toContain("Players by age group and gender");
  });
  it("copes with no registrations at all", () => {
    const empty = buildCommitteeReport({ regs: [], people: new Map(), season: "2026" });
    expect(empty.totals.members).toBe(0);
    expect(empty.trend).toEqual([]);
    expect(empty.monthly).toHaveLength(12);
  });
});
