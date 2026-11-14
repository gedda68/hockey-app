import { describe, it, expect } from "vitest";
import { planUsernames } from "@/lib/auth/memberLogins";
import { applicableFees, starterFees } from "@/lib/registrations/feeList";

const p = (memberId: string, firstName: string, lastName: string) => ({ memberId, firstName, lastName });

describe("planUsernames", () => {
  it("is lastname + first initial", () => {
    expect(planUsernames([p("1", "Mitchell", "Aitchison")]).get("1")).toBe("aitchisonm");
  });
  it("adds first-name letters when two people clash", () => {
    const m = planUsernames([p("1", "Mitchell", "Smith"), p("2", "Michael", "Smith"), p("3", "Jo", "Smith")]);
    expect(m.get("3")).toBe("smithj");
    expect(m.get("1")).toBe("smithmit");
    expect(m.get("2")).toBe("smithmic");
  });
  it("numbers identical full names and avoids taken usernames", () => {
    const m = planUsernames([p("1", "Sam", "Lee"), p("2", "Sam", "Lee")], ["leesx"]);
    expect(new Set(m.values()).size).toBe(2);
    expect(m.get("1")).toBe("leesam");
    expect(m.get("2")).toBe("leesam2");
    expect(planUsernames([p("1", "Al", "Ng")], ["nga"]).get("1")).not.toBe("nga");
  });
  it("strips punctuation and accents", () => {
    expect(planUsernames([p("1", "José", "O'Brien")]).get("1")).toBe("obrienj");
  });
});

describe("fee lists", () => {
  it("association fees are inherited, club fees chosen; no association volunteer fee", () => {
    const a = starterFees("association", "HQ");
    expect(a.every((f) => f.inherited)).toBe(true);
    expect(a.find((f) => f.feeId === "std-volunteer")).toBeUndefined();
    expect(starterFees("club", "CHC").find((f) => f.feeId === "std-volunteer")?.amount).toBe(0);
    expect(starterFees("club", "CHC").every((f) => f.chosenByMember)).toBe(true);
  });
  it("applicableFees filters by category, active flag and dates", () => {
    const list = [
      ...starterFees("club", "CHC"),
      { feeId: "x", name: "Old", amount: 5, gstIncluded: true, isActive: true, appliesTo: { ageCategories: ["junior"] }, validTo: "2000-01-01" },
    ];
    expect(applicableFees(list, "junior").map((f) => f.feeId)).toEqual(["std-junior"]);
    expect(applicableFees(undefined, "junior")).toEqual([]);
  });
});
