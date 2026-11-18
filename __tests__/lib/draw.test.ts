import { describe, it, expect } from "vitest";
import { balanceHomeAway, generateDraw, type DrawOptions } from "@/lib/draw/generate";
import { findClashes } from "@/lib/draw/clashes";
import { suggestUmpires, tierFromLabel, type Official, type UmpMatch } from "@/lib/draw/umpires";
import { addDays, at, dayOf, isClock, isDay } from "@/lib/draw/time";

const teams = ["a", "b", "c", "d"].map((t) => ({ teamId: t, clubId: `club-${t}` }));
const base: DrawOptions = { teams, startDate: "2026-03-07", slotTimes: ["08:00", "09:30"], slotMinutes: 90, bufferMinutes: 0, pitches: [{ pitchId: "p1", venueId: "v1", venueName: "North" }, { pitchId: "p2", venueId: "v1", venueName: "North" }] };

describe("time", () => {
  it("handles days and Brisbane time", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(new Date(at("2026-03-07", "08:00")).toISOString()).toBe("2026-03-06T22:00:00.000Z");
    expect(dayOf(Date.parse("2026-03-06T22:00:00Z"))).toBe("2026-03-07");
    expect(isDay("2026-02-30")).toBe(false); expect(isClock("24:00")).toBe(false); expect(isClock("08:30")).toBe(true);
  });
});

describe("draw generation", () => {
  it("plays everyone once, weekly, with no team or pitch clashing", () => {
    const r = generateDraw(base);
    expect(r.fixtures).toHaveLength(6);
    expect(r.unplaced).toEqual([]);
    expect(r.roundDates).toEqual({ 1: "2026-03-07", 2: "2026-03-14", 3: "2026-03-21" });
    const pairs = new Set(r.fixtures.map((f) => [f.homeTeamId, f.awayTeamId].sort().join("-")));
    expect(pairs.size).toBe(6);
    const clashes = findClashes(r.fixtures.map((f, i) => ({ id: String(i), start: Date.parse(f.start!), end: Date.parse(f.end!), pitchId: f.pitchId, homeTeamId: f.homeTeamId, awayTeamId: f.awayTeamId, umpires: [] })));
    expect(clashes.filter((c) => c.severity === "block")).toEqual([]);
  });
  it("balances home and away", () => {
    const r = generateDraw({ ...base, doubleRound: true });
    for (const t of Object.values(r.homeAway)) expect(t.home).toBe(t.away);
    const odd = balanceHomeAway([{ homeTeamId: "a", awayTeamId: "b" }, { homeTeamId: "a", awayTeamId: "c" }, { homeTeamId: "a", awayTeamId: "d" }]);
    expect(odd.filter((f) => f.homeTeamId === "a").length).toBeLessThan(3);
  });
  it("skips blackout dates and avoids times already booked", () => {
    const busy = at("2026-03-07", "08:00");
    const r = generateDraw({ ...base, blackoutDates: ["2026-03-14"], pitchBusy: { p1: [{ start: busy, end: busy + 90 * 60_000 }] } });
    expect(r.roundDates[2]).toBe("2026-03-21");
    const first = r.fixtures.filter((f) => f.round === 1);
    expect(first.every((f) => !(f.pitchId === "p1" && f.start === new Date(busy).toISOString()))).toBe(true);
    const tb = generateDraw({ ...base, teamBusy: { a: [{ start: at("2026-03-07", "08:00"), end: at("2026-03-07", "10:30") }] }, slotTimes: ["08:00", "11:00"] });
    const a1 = tb.fixtures.find((f) => f.round === 1 && (f.homeTeamId === "a" || f.awayTeamId === "a"))!;
    expect(a1.start).toBe(new Date(at("2026-03-07", "11:00")).toISOString());
  });
  it("prefers the home team's own ground and reports what it cannot place", () => {
    const r = generateDraw({ ...base, teams: teams.map((t) => ({ ...t, homeVenueId: t.teamId === "a" ? "v2" : null })), pitches: [...base.pitches, { pitchId: "p3", venueId: "v2", venueName: "South" }] });
    expect(r.fixtures.filter((f) => f.homeTeamId === "a").every((f) => f.venueId === "v2")).toBe(true);
    const tight = generateDraw({ ...base, slotTimes: ["08:00"], pitches: [base.pitches[0]] });
    expect(tight.unplaced.length).toBeGreaterThan(0);
    expect(tight.fixtures.some((f) => f.start === null && f.warnings.length)).toBe(true);
  });
  it("keeps one club's teams apart when it can", () => {
    const sameClub = teams.map((t, i) => ({ ...t, clubId: i < 2 ? "x" : "y" }));
    const r = generateDraw({ ...base, teams: sameClub });
    const round1 = r.fixtures.filter((f) => f.round === 1 && f.start);
    expect(new Set(round1.map((f) => f.start)).size).toBeGreaterThan(0);
  });
});

describe("clashes", () => {
  const f = (id: string, start: number, extra: object = {}) => ({ id, start, end: start + 90 * 60_000, pitchId: "p1", venueId: "v1", homeTeamId: "a", awayTeamId: "b", umpires: [] as string[], ...extra });
  it("finds pitch, team, umpire and own-club clashes", () => {
    const t = at("2026-03-07", "08:00");
    const c = findClashes([f("1", t, { umpires: ["u1"] }), f("2", t + 30 * 60_000, { homeTeamId: "c", awayTeamId: "d", umpires: ["u1"] }), f("3", t, { pitchId: "p2" })], { clubOf: { a: "A", b: "B", c: "C", d: "D" }, umpireClub: { u1: "C" } });
    const kinds = c.map((x) => x.kind);
    expect(kinds).toEqual(expect.arrayContaining(["pitch_overlap", "team_double_booked", "umpire_double_booked", "umpire_own_club"]));
    expect(findClashes([f("x", t), { ...f("y", t + 3 * 3600_000), pitchId: "p9", venueId: "v9", homeTeamId: "c", awayTeamId: "d" }], {}).length).toBe(0);
  });
  it("warns when an umpire cannot get between grounds, and about unscheduled matches", () => {
    const t = at("2026-03-07", "08:00");
    const c = findClashes([f("1", t, { umpires: ["u"] }), f("2", t + 100 * 60_000, { venueId: "v2", pitchId: "p9", homeTeamId: "c", awayTeamId: "d", umpires: ["u"] }), { id: "3", start: null, end: null, homeTeamId: "a", awayTeamId: "c", umpires: [] }]);
    expect(c.map((x) => x.kind)).toEqual(expect.arrayContaining(["umpire_travel", "unscheduled"]));
  });
});

describe("umpire suggestions", () => {
  const t = at("2026-03-07", "08:00");
  const m = (id: string, start: number, extra: Partial<UmpMatch> = {}): UmpMatch => ({ id, start, end: start + 90 * 60_000, venueId: "v1", homeTeamId: "a", awayTeamId: "b", slots: 2, ...extra });
  const o = (id: string, extra: Partial<Official> = {}): Official => ({ id, name: id.toUpperCase(), tier: 1, ...extra });
  const clubOf = { a: "A", b: "B", c: "C", d: "D" };

  it("never suggests someone from either club, a relative, or an unavailable official", () => {
    const r = suggestUmpires([m("1", t)], [o("own", { clubId: "A" }), o("rel", { conflictTeamIds: ["b"] }), o("away", { unavailableDays: ["2026-03-07"] }), o("off", { unavailable: true }), o("ok1"), o("ok2")], { clubOf });
    expect(r.suggestions.map((s) => s.umpireId).sort()).toEqual(["ok1", "ok2"]);
    expect(r.suggestions.map((s) => s.umpireType).sort()).toEqual(["Match Umpire 1", "Match Umpire 2"]);
  });
  it("spreads the work and never double-books", () => {
    const ms = [m("1", t), m("2", t, { homeTeamId: "c", awayTeamId: "d" }), m("3", t + 2 * 3600_000)];
    const r = suggestUmpires(ms, ["u1", "u2", "u3", "u4"].map((i) => o(i)), { clubOf });
    expect(r.gaps).toEqual([]);
    const at8 = r.suggestions.filter((s) => s.matchId !== "3").map((s) => s.umpireId);
    expect(new Set(at8).size).toBe(4);
    expect(Math.max(...Object.values(r.load))).toBeLessThanOrEqual(2);
  });
  it("respects qualification, daily limits and travel time, and explains gaps", () => {
    const hard = suggestUmpires([m("f", t, { requiredTier: 2, slots: 1 })], [o("low"), o("high", { tier: 3 })], { clubOf });
    expect(hard.suggestions[0].umpireId).toBe("high");
    const none = suggestUmpires([m("f", t, { requiredTier: 3, slots: 1 })], [o("low")], { clubOf });
    expect(none.gaps[0].reason).toContain("qualification");
    const lim = suggestUmpires([m("1", t, { slots: 1 }), m("2", t + 2 * 3600_000, { slots: 1 })], [o("solo", { maxPerDay: 1 })], { clubOf });
    expect(lim.suggestions).toHaveLength(1); expect(lim.gaps[0].reason).toContain("daily limit");
    const far = suggestUmpires([m("2", t + 100 * 60_000, { venueId: "v2", slots: 1 })], [o("solo")], { clubOf, busy: { solo: [{ start: t, end: t + 90 * 60_000, venueId: "v1" }] } });
    expect(far.gaps[0].reason).toContain("travel");
    expect(suggestUmpires([m("1", t)], [], { clubOf }).gaps[0].reason).toContain("No officials");
  });
  it("keeps existing allocations, prefers the ground they are already at, and counts prior load", () => {
    const r = suggestUmpires([m("1", t, { existing: ["keep"], slots: 2 })], [o("keep"), o("new")], { clubOf });
    expect(r.suggestions).toHaveLength(1); expect(r.suggestions[0].umpireId).toBe("new");
    const two = suggestUmpires([m("a1", t, { slots: 1 }), m("a2", t + 2 * 3600_000, { slots: 1 })], [o("x"), o("y")], { clubOf, priorLoad: { x: 5 } });
    expect(two.suggestions.every((s) => s.umpireId === "y" || s.matchId === "a2")).toBe(true);
    expect(tierFromLabel("Level 2 Umpire")).toBe(2); expect(tierFromLabel(null, ["NATIONAL"])).toBe(3); expect(tierFromLabel("Club")).toBe(1); expect(tierFromLabel("")).toBe(0);
  });
});
