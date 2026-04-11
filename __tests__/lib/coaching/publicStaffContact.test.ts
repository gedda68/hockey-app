import { describe, it, expect } from "vitest";
import {
  buildPublicStaffRow,
  sanitizeLegacyStaffPerson,
  sanitizeLegacyRosterTeamsStaff,
} from "@/lib/coaching/publicStaffContact";

describe("buildPublicStaffRow", () => {
  it("omits email/phone when flags false", () => {
    const row = buildPublicStaffRow(
      {
        id: "s1",
        role: "Coach",
        memberId: "M1",
        showEmailOnPublicSite: false,
        showPhoneOnPublicSite: false,
      },
      { email: "a@b.com", phone: "0400" },
    );
    expect(row?.email).toBeUndefined();
    expect(row?.phone).toBeUndefined();
  });

  it("includes email/phone when opted in", () => {
    const row = buildPublicStaffRow(
      {
        id: "s1",
        role: "Coach",
        memberId: "M1",
        showEmailOnPublicSite: true,
        showPhoneOnPublicSite: true,
      },
      { email: "a@b.com", phone: "0400" },
    );
    expect(row?.email).toBe("a@b.com");
    expect(row?.phone).toBe("0400");
  });

  it("returns null without id or memberId", () => {
    expect(buildPublicStaffRow({ role: "x" }, null)).toBeNull();
  });
});

describe("sanitizeLegacyStaffPerson", () => {
  it("removes email without opt-in", () => {
    const o = sanitizeLegacyStaffPerson({
      name: "Pat",
      email: "x@y.com",
      wwccCardNumber: "secret",
    });
    expect(o.email).toBeUndefined();
    expect(o.wwccCardNumber).toBeUndefined();
    expect(o.name).toBe("Pat");
  });
});

describe("sanitizeLegacyRosterTeamsStaff", () => {
  it("sanitizes nested staff record", () => {
    const teams = [
      {
        name: "A",
        staff: {
          coach: { name: "C", email: "e@e.com", showEmailOnPublicSite: true },
        },
      },
    ];
    sanitizeLegacyRosterTeamsStaff(teams);
    expect(
      (teams[0] as { staff: { coach: { email?: string } } }).staff.coach.email,
    ).toBe("e@e.com");
  });
});
