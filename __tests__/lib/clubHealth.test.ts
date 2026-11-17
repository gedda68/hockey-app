import { describe, expect, it } from "vitest";
import { assessClub } from "@/lib/health/clubHealth";

const NOW = new Date("2026-06-01T00:00:00Z");
const member = (over: Record<string, any> = {}) => ({
  memberId: "MBR-1", roles: ["player"],
  personalInfo: { firstName: "Sam", lastName: "Lee", dateOfBirth: "1995-04-01" },
  contact: { primaryEmail: "s@x.com" },
  emergencyContacts: [{ name: "Pat", phone: "0400" }],
  membership: { status: "Active", currentPeriodEnd: "2026-12-31" },
  ...over,
});
const count = (h: ReturnType<typeof assessClub>, id: string) => h.checks.find((c) => c.id === id)!.count;

describe("assessClub", () => {
  it("scores a clean club 100", () => {
    const h = assessClub({ members: [member()], teams: [{ teamId: "t", name: "T", roster: [{ memberId: "MBR-1" }] }], now: NOW });
    expect(h.score).toBe(100);
    expect(h.checks.every((c) => c.count === 0)).toBe(true);
  });

  it("flags missing basics", () => {
    const h = assessClub({
      members: [member({ memberId: "A", personalInfo: { firstName: "No", lastName: "Dob" }, contact: {}, emergencyContacts: [] })],
      teams: [], now: NOW,
    });
    expect(count(h, "missing-dob")).toBe(1);
    expect(count(h, "missing-contact")).toBe(1);
    expect(count(h, "missing-emergency")).toBe(1);
  });

  it("flags a junior with no guardian but not one with a linked parent or family", () => {
    const kid = (over = {}) => member({ personalInfo: { firstName: "Kid", lastName: "K", dateOfBirth: "2014-01-01", ...over } });
    expect(count(assessClub({ members: [kid()], teams: [], now: NOW }), "minor-no-guardian")).toBe(1);
    expect(count(assessClub({ members: [kid({ relatedMembers: [{ memberId: "P", relationshipType: "Parent" }] })], teams: [], now: NOW }), "minor-no-guardian")).toBe(0);
    // Juniors don't need their own contact details.
    expect(count(assessClub({ members: [member({ personalInfo: { firstName: "K", lastName: "K", dateOfBirth: "2014-01-01" }, contact: {} })], teams: [], now: NOW }), "missing-contact")).toBe(0);
  });

  it("flags non-player adults without a valid blue card, and cards about to expire", () => {
    const coach = (blueCard?: any) => member({ roles: ["coach"], blueCard });
    expect(count(assessClub({ members: [coach()], teams: [], now: NOW }), "blue-card")).toBe(1);
    const valid = { status: "Valid", cardNumber: "1", expiryDate: "2028-01-01" };
    expect(count(assessClub({ members: [coach(valid)], teams: [], now: NOW }), "blue-card")).toBe(0);
    expect(count(assessClub({ members: [coach({ ...valid, expiryDate: "2026-06-20" })], teams: [], now: NOW }), "blue-card")).toBe(1);
    expect(count(assessClub({ members: [member()], teams: [], now: NOW }), "blue-card")).toBe(0); // players don't need one
  });

  it("finds duplicates by name and birth date", () => {
    const h = assessClub({ members: [member({ memberId: "A" }), member({ memberId: "B" })], teams: [], now: NOW });
    expect(count(h, "duplicates")).toBe(2);
  });

  it("ignores inactive members for most checks and lists expired memberships", () => {
    const h = assessClub({ members: [member({ membership: { status: "Inactive" }, emergencyContacts: [] }), member({ memberId: "Z", personalInfo: { firstName: "Old", lastName: "One", dateOfBirth: "1990-01-01" }, membership: { status: "Active", currentPeriodEnd: "2026-01-01" } })], teams: [], now: NOW });
    expect(count(h, "missing-emergency")).toBe(0);
    expect(count(h, "expired-membership")).toBe(1);
  });

  it("reports empty teams and open incidents, and lowers the score", () => {
    const h = assessClub({ members: [member()], teams: [{ teamId: "t", name: "Empty", roster: [{ memberId: "x", status: "inactive" }] }], openIncidents: 3, now: NOW });
    expect(count(h, "empty-team")).toBe(1);
    expect(count(h, "open-incidents")).toBe(1);
    expect(h.score).toBeLessThan(100);
  });

  it("caps the listed issues but keeps the true count", () => {
    const members = Array.from({ length: 80 }, (_, i) => member({ memberId: `M${i}`, personalInfo: { firstName: `N${i}`, lastName: "X", dateOfBirth: "1990-01-01" }, emergencyContacts: [] }));
    const c = assessClub({ members, teams: [], now: NOW }).checks.find((x) => x.id === "missing-emergency")!;
    expect(c.count).toBe(80);
    expect(c.issues).toHaveLength(50);
  });
});
