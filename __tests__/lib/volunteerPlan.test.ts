import { describe, it, expect } from "vitest";
import { planShifts, type PlanTemplate } from "@/lib/volunteers/plan";

const all: PlanTemplate[] = [{ kind: "ground_setup", enabled: true, slots: 2 }, { kind: "canteen", enabled: true, slots: 3 }, { kind: "scoring", enabled: true, slots: 1 }];
// Saturday 12 Dec 2026 in Brisbane: 08:00 = Fri 22:00Z, 09:30 = Fri 23:30Z, 11:00 = Sat 01:00Z
const f = (id: string, iso: string, venue = "Oakes Oval", label?: string) => ({ fixtureId: id, startsAt: iso, venue, label });

describe("planShifts", () => {
  const day = [f("F1", "2026-12-11T22:00:00Z", "Oakes Oval", "U16 v Brothers"), f("F2", "2026-12-11T23:30:00Z"), f("F3", "2026-12-12T01:00:00Z")];
  it("sets up an hour before the first match and runs the canteen until the last one ends", () => {
    const p = planShifts(day, all);
    const g = p.find((s) => s.kind === "ground_setup")!, c = p.find((s) => s.kind === "canteen")!;
    expect(g).toMatchObject({ date: "2026-12-12", startTime: "07:00", endTime: "08:00", slots: 2, location: "Oakes Oval", autoKey: "auto:ground_setup:2026-12-12" });
    expect(c).toMatchObject({ date: "2026-12-12", startTime: "07:30", endTime: "12:20", slots: 3 });
  });
  it("one scoring shift per match, tied to the fixture", () => {
    const s = planShifts(day, all).filter((x) => x.kind === "scoring");
    expect(s.map((x) => [x.fixtureId, x.startTime, x.endTime])).toEqual([["F1", "07:50", "09:20"], ["F2", "09:20", "10:50"], ["F3", "10:50", "12:20"]]);
    expect(s[0].notes).toBe("U16 v Brothers");
  });
  it("only the kinds turned on, and nothing without matches", () => {
    expect(planShifts(day, [{ kind: "canteen", enabled: true, slots: 2 }, { kind: "scoring", enabled: false, slots: 1 }]).map((x) => x.kind)).toEqual(["canteen"]);
    expect(planShifts([], all)).toEqual([]);
  });
  it("groups matches by day in order, and skips a bad date", () => {
    const p = planShifts([f("B", "2026-12-18T22:00:00Z"), f("A", "2026-12-11T22:00:00Z"), { fixtureId: "X", startsAt: "nope" }], [{ kind: "canteen", enabled: true, slots: 1 }]);
    expect(p.map((x) => x.date)).toEqual(["2026-12-12", "2026-12-19"]);
  });
  it("a late match doesn't run past midnight", () => {
    const p = planShifts([f("L", "2026-12-12T13:30:00Z")], [{ kind: "canteen", enabled: true, slots: 1 }]); // 23:30 local
    expect(p[0].endTime).toBe("23:59");
  });
  it("different venues on one day leave the location blank", () => {
    expect(planShifts([f("A", "2026-12-11T22:00:00Z", "North"), f("B", "2026-12-12T01:00:00Z", "South")], [{ kind: "canteen", enabled: true, slots: 1 }])[0].location).toBeUndefined();
  });
});

import { rankHelpers } from "@/lib/volunteers/cover";
describe("rankHelpers", () => {
  const h = (...ids: string[]) => ids.map((memberId) => ({ memberId }));
  it("most experienced first, ties by id, without those already on the shift", () => {
    expect(rankHelpers(h("b", "a", "b", "c", "c", "c"), new Set(["a"]))).toEqual(["c", "b"]);
    expect(rankHelpers(h("b", "a"), new Set())).toEqual(["a", "b"]);
  });
  it("is capped", () => expect(rankHelpers(h(..."abcdefghijkl".split("")), new Set(), 3)).toHaveLength(3));
  it("nothing when nobody has done it before", () => expect(rankHelpers([], new Set())).toEqual([]));
});
