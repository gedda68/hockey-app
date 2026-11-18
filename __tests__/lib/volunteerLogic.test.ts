import { describe, it, expect } from "vitest";
import { canJoin, canRelease, cleanShift, dueShiftReminder, fill, overlaps, shiftStartMs, timeRange } from "@/lib/volunteers/logic";

const good = { kind: "canteen", date: "2026-12-05", startTime: "08:00", endTime: "11:00", slots: 2 };
const shift = (o: Partial<{ shiftId: string; date: string; startTime: string; endTime: string; slots: number; status: string }> = {}) => ({ shiftId: "S1", date: "2026-12-05", startTime: "08:00", endTime: "11:00", slots: 2, status: "open", ...o });
const at = (iso: string) => new Date(iso);

describe("cleanShift", () => {
  it("accepts a good shift and names it after its kind", () => {
    const r = cleanShift(good, "2026-11-18");
    expect(r.ok && r.value.label).toBe("Canteen");
    expect(r.ok && r.dates).toEqual(["2026-12-05"]);
  });
  it("'other' needs a name", () => {
    expect(cleanShift({ ...good, kind: "other" }, "2026-11-18").ok).toBe(false);
    expect(cleanShift({ ...good, kind: "other", label: "BBQ" }, "2026-11-18")).toMatchObject({ ok: true, value: { label: "BBQ" } });
  });
  it("rejects bad dates, times and numbers", () => {
    expect(cleanShift({ ...good, date: "2026-02-30" }, "2026-11-18").ok).toBe(false);
    expect(cleanShift({ ...good, date: "2026-11-01" }, "2026-11-18").ok).toBe(false);
    expect(cleanShift({ ...good, endTime: "08:00" }, "2026-11-18").ok).toBe(false);
    expect(cleanShift({ ...good, startTime: "8am" }, "2026-11-18").ok).toBe(false);
    expect(cleanShift({ ...good, slots: 0 }, "2026-11-18").ok).toBe(false);
    expect(cleanShift({ ...good, repeatWeeks: 40 }, "2026-11-18").ok).toBe(false);
  });
  it("repeats weekly, across a month end", () => {
    const r = cleanShift({ ...good, date: "2026-12-26", repeatWeeks: 2 }, "2026-11-18");
    expect(r.ok && r.dates).toEqual(["2026-12-26", "2027-01-02", "2027-01-09"]);
  });
});

describe("filling and joining", () => {
  const su = (memberId: string, status = "confirmed") => ({ memberId, status });
  it("a place stays held while a swap is requested, and cover is counted", () => {
    expect(fill(2, [su("a"), su("b", "swap_requested")])).toEqual({ filled: 2, free: 0, needCover: 1, full: true });
    expect(fill(3, [su("a"), su("b", "cancelled"), su("c", "swapped")])).toMatchObject({ filled: 1, free: 2, full: false });
  });
  it("signing up needs a free place; taking over needs someone who wants cover", () => {
    const full = [su("a"), su("b")];
    expect(canJoin(shift(), full, "z", [], at("2026-12-01T00:00:00Z"), "signup")).toMatchObject({ ok: false, reason: expect.stringMatching(/full/) });
    expect(canJoin(shift(), full, "z", [], at("2026-12-01T00:00:00Z"), "takeover")).toMatchObject({ ok: false });
    expect(canJoin(shift(), [su("a"), su("b", "swap_requested")], "z", [], at("2026-12-01T00:00:00Z"), "takeover").ok).toBe(true);
    expect(canJoin(shift(), [su("a")], "z", [], at("2026-12-01T00:00:00Z"), "signup").ok).toBe(true);
  });
  it("can't join twice, after the start, when cancelled, or into a clash", () => {
    expect(canJoin(shift(), [su("a")], "a", [], at("2026-12-01T00:00:00Z"), "signup").ok).toBe(false);
    expect(canJoin(shift(), [], "z", [], at("2026-12-04T22:30:00Z"), "signup").ok).toBe(false); // 08:30 Sat local, started
    expect(canJoin(shift({ status: "cancelled" }), [], "z", [], at("2026-12-01T00:00:00Z"), "signup").ok).toBe(false);
    const other = shift({ shiftId: "S2", startTime: "10:00", endTime: "12:00" });
    expect(canJoin(shift(), [], "z", [other], at("2026-12-01T00:00:00Z"), "signup")).toMatchObject({ ok: false, reason: expect.stringMatching(/clash/) });
    expect(canJoin(shift(), [], "z", [shift({ shiftId: "S3", startTime: "11:00", endTime: "13:00" })], at("2026-12-01T00:00:00Z"), "signup").ok).toBe(true); // back to back is fine
  });
  it("overlap and release", () => {
    expect(overlaps(shift(), shift({ startTime: "10:59", endTime: "12:00" }))).toBe(true);
    expect(overlaps(shift(), shift({ date: "2026-12-06" }))).toBe(false);
    expect(canRelease(shift(), at("2026-12-01T00:00:00Z")).ok).toBe(true);
    expect(canRelease(shift(), at("2026-12-05T05:00:00Z")).ok).toBe(false);
  });
});

describe("reminders", () => {
  // Shift: Sat 5 Dec 2026 08:00 Brisbane = Fri 4 Dec 22:00Z.
  const s = shift();
  it("start time is in Brisbane time", () => expect(new Date(shiftStartMs(s)).toISOString()).toBe("2026-12-04T22:00:00.000Z"));
  it("48h reminder from two days out, in the daytime", () => {
    expect(dueShiftReminder(s, [], at("2026-12-02T20:00:00Z"))).toBeNull(); // 54h before... Thu 06:00 local, quiet
    expect(dueShiftReminder(s, [], at("2026-12-02T23:00:00Z"))).toBe("48h"); // Thu 09:00 local, 47h before
    expect(dueShiftReminder(s, ["48h"], at("2026-12-03T00:00:00Z"))).toBeNull();
    expect(dueShiftReminder(s, [], at("2026-12-02T01:00:00Z"))).toBeNull(); // 69h before
  });
  it("evening-before reminder from 5pm", () => {
    expect(dueShiftReminder(s, ["48h"], at("2026-12-04T06:59:00Z"))).toBeNull(); // 16:59 local Fri
    expect(dueShiftReminder(s, ["48h"], at("2026-12-04T07:00:00Z"))).toBe("eve");
    expect(dueShiftReminder(s, ["48h", "eve"], at("2026-12-04T08:00:00Z"))).toBeNull();
  });
  it("a late sign-up gets only the evening one; never overnight or after the start or when cancelled", () => {
    expect(dueShiftReminder(s, [], at("2026-12-04T08:00:00Z"))).toBe("eve");
    expect(dueShiftReminder(s, [], at("2026-12-04T11:30:00Z"))).toBeNull(); // 21:30 local
    expect(dueShiftReminder(s, [], at("2026-12-04T22:00:00Z"))).toBeNull();
    expect(dueShiftReminder({ ...s, status: "cancelled" }, [], at("2026-12-04T08:00:00Z"))).toBeNull();
  });
  it("formats times", () => { expect(timeRange({ startTime: "08:00", endTime: "11:30" })).toBe("8am to 11:30am"); expect(timeRange({ startTime: "12:00", endTime: "15:00" })).toBe("12pm to 3pm"); });
});
