import { describe, it, expect } from "vitest";
import {
  PatchTeamStaffBodySchema,
  PostTeamStaffBodySchema,
} from "@/lib/db/schemas/teamRosterStaff.schema";

describe("PostTeamStaffBodySchema", () => {
  it("accepts minimal staff", () => {
    const p = PostTeamStaffBodySchema.parse({
      role: "Head Coach",
      memberId: "CHC-0000001",
    });
    expect(p.showEmailOnPublicSite).toBe(false);
  });

  it("accepts WWCC and role code", () => {
    const p = PostTeamStaffBodySchema.parse({
      role: "Assistant",
      memberId: "CHC-0000001",
      staffRoleCode: "assistant_coach",
      wwccCardNumber: "ABC-123",
      wwccExpiresAt: "2027-12-31",
      showEmailOnPublicSite: true,
    });
    expect(p.staffRoleCode).toBe("assistant_coach");
    expect(p.wwccExpiresAt).toBe("2027-12-31");
  });

  it("rejects unknown keys", () => {
    expect(() =>
      PostTeamStaffBodySchema.parse({
        role: "Coach",
        memberId: "M",
        extra: 1,
      }),
    ).toThrow();
  });
});

describe("PatchTeamStaffBodySchema", () => {
  it("requires at least one field", () => {
    expect(() => PatchTeamStaffBodySchema.parse({})).toThrow();
  });

  it("allows clearing WWCC expiry with null", () => {
    const p = PatchTeamStaffBodySchema.parse({ wwccExpiresAt: null });
    expect(p.wwccExpiresAt).toBeNull();
  });
});
