import { describe, it, expect } from "vitest";
import { ageOn, requiresBlueCard, blueCardStatus, hasBlueCardData } from "@/lib/members/blueCard";

const now = new Date("2026-11-14T00:00:00Z");
const m = (dob: string | undefined, roles: string[]) => ({ personalInfo: { dateOfBirth: dob }, roles });

describe("ageOn", () => {
  it("handles birthdays not yet reached", () => {
    expect(ageOn("2010-11-15", now)).toBe(15);
    expect(ageOn("2010-11-14", now)).toBe(16);
    expect(ageOn("", now)).toBeNull();
  });
});

describe("requiresBlueCard", () => {
  it("needs a non-player role and to be over 15", () => {
    expect(requiresBlueCard(m("2000-01-01", ["role-coach"]), now)).toBe(true);
    expect(requiresBlueCard(m("2000-01-01", ["role-player"]), now)).toBe(false);
    expect(requiresBlueCard(m("2000-01-01", ["role-player", "role-junior-player"]), now)).toBe(false);
    expect(requiresBlueCard(m("2000-01-01", ["role-player", "role-umpire"]), now)).toBe(true);
    expect(requiresBlueCard(m("2010-11-15", ["role-coach"]), now)).toBe(false); // 15
    expect(requiresBlueCard(m("2010-11-14", ["role-coach"]), now)).toBe(true); // 16
  });
  it("treats an unknown birthday with a non-player role as possibly required", () => {
    expect(requiresBlueCard(m(undefined, ["role-coach"]), now)).toBe(true);
    expect(requiresBlueCard(m(undefined, []), now)).toBe(false);
  });
});

describe("blueCardStatus", () => {
  const card = (o: object) => ({ cardNumber: "1234567/1", status: "Valid", expiryDate: "2028-01-01", ...o });
  it("valid, expiring, expired", () => {
    expect(blueCardStatus(card({}), now).state).toBe("valid");
    expect(blueCardStatus(card({ expiryDate: "2026-12-20" }), now)).toMatchObject({ state: "expiring", ok: true });
    expect(blueCardStatus(card({ expiryDate: "2026-11-01" }), now)).toMatchObject({ state: "expired", ok: false });
  });
  it("missing, pending, blocked, exempt", () => {
    expect(blueCardStatus(undefined, now).state).toBe("missing");
    expect(blueCardStatus(card({ cardNumber: "" }), now).state).toBe("missing");
    expect(blueCardStatus(card({ status: "Applied (pending)" }), now).state).toBe("pending");
    expect(blueCardStatus(card({ status: "Suspended" }), now)).toMatchObject({ state: "blocked", ok: false });
    expect(blueCardStatus({ exempt: true, exemptReason: "Parent" }, now)).toMatchObject({ state: "exempt", ok: true });
  });
  it("detects saved data", () => {
    expect(hasBlueCardData({})).toBe(false);
    expect(hasBlueCardData({ cardNumber: "1" })).toBe(true);
  });
});
