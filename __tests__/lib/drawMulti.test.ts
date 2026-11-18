import { describe, it, expect } from "vitest";
import { alignDivisions, clubPairKey } from "@/lib/draw/align";
import { generateMultiDraw, type MultiDrawOptions } from "@/lib/draw/multi";
import { findClashes } from "@/lib/draw/clashes";

const clubs = ["Commercial", "East", "Souths", "Norths"];
const div = (id: string, doubleRound = false) => ({ id, doubleRound, teams: clubs.map((c) => ({ teamId: `${c}-${id}`, clubId: c })) });
const base: MultiDrawOptions = { divisions: [div("BHL1"), div("BHL2"), div("BHL3")], startDate: "2026-03-07", slotTimes: ["08:00", "09:30", "11:00", "12:30"], slotMinutes: 90, bufferMinutes: 0, pitches: [{ pitchId: "p1", venueId: "v1", venueName: "North" }, { pitchId: "p2", venueId: "v1", venueName: "North" }] };

describe("aligning divisions", () => {
  it("puts the same two clubs against each other in the same round across divisions", () => {
    const r = alignDivisions(base.divisions);
    expect(r.total).toBe(18);
    const byRound = new Map<string, number>();
    for (const f of r.fixtures) { const k = clubPairKey(f.homeTeamId.split("-")[0], f.awayTeamId.split("-")[0])!; byRound.set(`${f.g}#${k}`, (byRound.get(`${f.g}#${k}`) ?? 0) + 1); }
    expect([...byRound.values()].every((n) => n === 3)).toBe(true); // every meeting is in all three divisions at once
    expect(r.aligned).toBe(18);
  });
  it("is repeatable and still a full round robin in every division", () => {
    const a = alignDivisions(base.divisions), b = alignDivisions(base.divisions);
    expect(a).toEqual(b);
    for (const id of ["BHL1", "BHL2", "BHL3"]) {
      const f = a.fixtures.filter((x) => x.divisionId === id);
      expect(new Set(f.map((x) => [x.homeTeamId, x.awayTeamId].sort().join("v"))).size).toBe(6);
      for (let g = 0; g < 3; g++) { const t = f.filter((x) => x.g === g).flatMap((x) => [x.homeTeamId, x.awayTeamId]); expect(new Set(t).size).toBe(t.length); }
    }
  });
  it("copes with divisions of different sizes and with clubs missing from some", () => {
    const r = alignDivisions([div("A"), { id: "B", teams: clubs.slice(0, 3).map((c) => ({ teamId: `${c}-B`, clubId: c })) }, { id: "C", teams: clubs.slice(1).map((c) => ({ teamId: `${c}-C`, clubId: c })) }]);
    expect(r.total).toBe(6 + 3 + 3);
    expect(r.aligned).toBeGreaterThan(6);
    expect(alignDivisions([{ id: "x", teams: [{ teamId: "solo" }] }]).fixtures).toEqual([]);
  });
});

describe("multi-division draw", () => {
  const r = generateMultiDraw(base);
  it("plays a club's meeting on one pitch, back to back, in a rotating order", () => {
    const groups = new Map<string, typeof r.fixtures>();
    for (const f of r.fixtures) if (f.groupKey) groups.set(f.groupKey, [...(groups.get(f.groupKey) ?? []), f]);
    expect(groups.size).toBe(6);
    const orders = new Set<string>();
    for (const g of groups.values()) {
      expect(g).toHaveLength(3);
      expect(new Set(g.map((f) => f.pitchId)).size).toBe(1);
      const starts = g.map((f) => Date.parse(f.start!)).sort((a, b) => a - b);
      expect(starts[1] - starts[0]).toBe(90 * 60_000); expect(starts[2] - starts[1]).toBe(90 * 60_000);
      orders.add(g.sort((a, b) => a.start!.localeCompare(b.start!)).map((f) => f.divisionId).join(">"));
      expect(new Set(g.map((f) => f.homeTeamId.split("-")[0])).size).toBe(1); // one home club for the meeting
    }
    expect(orders.size).toBeGreaterThan(1);
    expect(r.alignment).toMatchObject({ grouped: 18, together: 18, matches: 18 });
  });
  it("has no pitch, team or club clashes and gives each club equal home and away", () => {
    expect(r.unplaced).toEqual([]);
    const clubOf = Object.fromEntries(base.divisions.flatMap((d) => d.teams.map((t) => [t.teamId, t.clubId!])));
    const c = findClashes(r.fixtures.map((f, i) => ({ id: String(i), start: Date.parse(f.start!), end: Date.parse(f.end!), pitchId: f.pitchId, homeTeamId: f.homeTeamId, awayTeamId: f.awayTeamId, umpires: [] })), { clubOf, bufferMinutes: 0 });
    expect(c.filter((x) => x.severity === "block")).toEqual([]);
    const home = Object.fromEntries(clubs.map((c) => [c, 0]));
    for (const f of r.fixtures) home[f.homeTeamId.split("-")[0]]++;
    expect(Math.max(...Object.values(home)) - Math.min(...Object.values(home))).toBeLessThanOrEqual(3);
  });
  it("numbers each division's rounds 1 to 3 and dates them weekly", () => {
    for (const id of ["BHL1", "BHL2", "BHL3"]) expect([...new Set(r.fixtures.filter((f) => f.divisionId === id).map((f) => f.round))].sort()).toEqual([1, 2, 3]);
    expect(r.roundDates).toEqual({ 1: "2026-03-07", 2: "2026-03-14", 3: "2026-03-21" });
  });
  it("splits a meeting up, and says so, when it cannot fit together", () => {
    const tight = generateMultiDraw({ ...base, slotTimes: ["08:00", "09:30"] });
    expect(tight.fixtures.some((f) => f.warnings.some((w) => w.includes("back to back")))).toBe(true);
    expect(tight.alignment.together).toBeLessThan(tight.alignment.grouped);
  });
  it("prefers the home club's ground and honours blackout dates and other bookings", () => {
    const homed = generateMultiDraw({ ...base, divisions: base.divisions.map((d) => ({ ...d, teams: d.teams.map((t) => ({ ...t, homeVenueId: t.clubId === "East" ? "v2" : null })) })), pitches: [...base.pitches, { pitchId: "p3", venueId: "v2", venueName: "East ground" }], blackoutDates: ["2026-03-14"] });
    expect(homed.roundDates[2]).toBe("2026-03-21");
    expect(homed.fixtures.filter((f) => f.homeTeamId.startsWith("East") && f.venueId).every((f) => f.venueId === "v2")).toBe(true);
  });
  it("can ignore club alignment", () => {
    const plain = generateMultiDraw({ ...base, alignClubs: false });
    expect(plain.alignment.grouped).toBe(0);
    expect(plain.fixtures).toHaveLength(18);
  });
});

describe("different days, times and grounds", () => {
  const sat = (id: string) => ({ ...div(id), dayOffset: 0, slotTimes: ["13:00", "14:45", "16:30"] });
  const sun = (id: string) => ({ ...div(id), dayOffset: 1, slotTimes: ["12:00", "13:45", "15:30"] });
  const grounds = [{ pitchId: "own", venueId: "East", venueName: "Easts" }, { pitchId: "s1", venueId: "Shared", venueName: "Shared 1" }, { pitchId: "s2", venueId: "Shared", venueName: "Shared 2" }, { pitchId: "uq", venueId: "UQ", venueName: "UQ" }];
  const r = generateMultiDraw({ ...base, divisions: [sat("BHL1"), sat("BHL2"), sun("BHL4")], slotTimes: ["13:00"], pitches: grounds, bufferMinutes: 15 });
  it("plays each division on its own day at its own time", () => {
    const day = (id: string) => new Set(r.fixtures.filter((f) => f.divisionId === id).map((f) => new Date(f.date! + "T00:00:00Z").getUTCDay()));
    expect([...day("BHL1")]).toEqual([6]); expect([...day("BHL4")]).toEqual([0]);
    const first = r.fixtures.filter((f) => f.divisionId === "BHL4" && f.date === "2026-03-08").map((f) => f.start).sort()[0];
    expect(first).toBe(new Date(Date.parse("2026-03-08T12:00:00+10:00")).toISOString());
    expect(r.unplaced).toEqual([]);
  });
  it("only groups divisions that play on the same day", () => {
    for (const f of r.fixtures.filter((x) => x.groupKey)) expect(f.divisionId).not.toBe("BHL4");
  });
  it("sends clubs without a ground to the shared pitches and clubs with one to their own", () => {
    const own = base.divisions.map((d) => ({ ...d, teams: d.teams.map((t) => ({ ...t, homeVenueId: t.clubId === "East" ? "East" : t.clubId === "Souths" ? "UQ" : null })) }));
    const x = generateMultiDraw({ ...base, divisions: own.slice(0, 2).map((d) => ({ ...d, dayOffset: 0, slotTimes: ["13:00", "14:45", "16:30"] })), slotTimes: ["13:00"], pitches: grounds, sharedVenueIds: ["Shared"], bufferMinutes: 15 });
    expect(x.fixtures.filter((f) => f.venueId === "East").every((f) => f.homeTeamId.startsWith("East"))).toBe(true);
    expect(x.fixtures.filter((f) => f.venueId === "UQ").every((f) => f.homeTeamId.startsWith("Souths"))).toBe(true);
    expect(x.fixtures.filter((f) => f.homeTeamId.startsWith("Commercial") && f.venueId).every((f) => f.venueId === "Shared")).toBe(true);
  });
  it("supports more than two meetings and skips a blackout on either day", () => {
    const t = generateMultiDraw({ ...base, divisions: [{ ...sat("A"), legs: 3 }, sun("B")], slotTimes: ["13:00"], blackoutDates: ["2026-03-15"], pitches: grounds, bufferMinutes: 15 });
    expect(t.fixtures.filter((f) => f.divisionId === "A")).toHaveLength(18);
    expect(t.roundDates[2]).toBe("2026-03-21");
  });
});
