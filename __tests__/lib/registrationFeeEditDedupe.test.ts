import { describe, it, expect } from "vitest";
import { applyToLines, validateChange, sumLines } from "@/lib/registrations/feeEdit";
import { planDedupe } from "@/lib/registrations/dedupe";

const lines = [
  { itemId: "a", name: "Club junior", amount: 20, clubId: "chc" },
  { itemId: "b", name: "BHA junior", amount: 20, associationId: "bha" },
];

describe("applyToLines", () => {
  it("adds, edits and removes within a level", () => {
    const add = applyToLines(lines, { action: "add", levelKind: "club", levelId: "chc", name: "Strip", amount: 60 }, "n1") as any;
    expect(add.lines.map((l: any) => l.itemId)).toEqual(["a", "b", "n1"]);
    expect(sumLines(add.lines)).toBe(100);
    const edit = applyToLines(lines, { action: "edit", levelKind: "club", levelId: "chc", itemId: "a", name: "Club junior", amount: 35 }) as any;
    expect(sumLines(edit.lines)).toBe(55);
    const rm = applyToLines(lines, { action: "remove", levelKind: "association", levelId: "bha", itemId: "b" }) as any;
    expect(rm.lines).toHaveLength(1);
  });
  it("refuses to touch another level's line", () => {
    expect("error" in (applyToLines(lines, { action: "remove", levelKind: "club", levelId: "chc", itemId: "b" }) as any)).toBe(true);
  });
  it("validates input", () => {
    expect(validateChange({ action: "add", levelKind: "club", levelId: "c", name: "", amount: 5 })).toMatch(/name/);
    expect(validateChange({ action: "add", levelKind: "club", levelId: "c", name: "x", amount: -1 })).toMatch(/Amount/);
    expect(validateChange({ action: "edit", levelKind: "club", levelId: "c", name: "x", amount: 1 })).toMatch(/itemId/);
  });
});

describe("planDedupe", () => {
  it("keeps the real-source record and the one admins edited; treats 2026 and '2026' as the same season", () => {
    const docs = [
      { _id: 1, memberId: "M1", clubId: "c", seasonYear: 2026, source: "backfill", status: "active", fees: [{}] },
      { _id: 2, memberId: "M1", clubId: "c", seasonYear: "2026", source: "altius", status: "active" },
      { _id: 3, memberId: "M2", clubId: "c", seasonYear: 2026, source: "backfill", status: "active", fees: [{}] },
      { _id: 4, memberId: "M2", clubId: "c", seasonYear: 2026, source: "backfill", status: "active", fees: [{}], feeChanges: [{}] },
      { _id: 5, memberId: "M3", clubId: "c", seasonYear: 2026 },
    ];
    const p = planDedupe(docs, "club");
    expect(p.groupsWithDupes).toBe(2);
    expect(p.remove.map((d) => d._id).sort()).toEqual([1, 3]);
  });
});
