import { describe, it, expect } from "vitest";
import { buildRegistrations } from "@/lib/members/registrationBackfill";

const o = { season: 2026, clubAssociation: new Map([["c1", "a1"]]), now: new Date("2026-01-01") };

describe("buildRegistrations", () => {
  it("builds deterministic club + association registrations", () => {
    const r = buildRegistrations({ memberId: "M1", roles: ["role-player"], membership: { clubId: "c1", status: "Active", joinDate: "2024-03-01", membershipType: "senior" } }, o)!;
    expect(r.club.registrationId).toBe("CREG-c1-M1-2026");
    expect(r.club.status).toBe("active");
    expect(r.club.roleIds).toEqual(["role-player"]);
    expect(r.association?.registrationId).toBe("AREG-a1-M1-2026");
    expect(r.club.registeredDate.getFullYear()).toBe(2024);
  });
  it("marks non-active members inactive and uses top-level clubId", () => {
    const r = buildRegistrations({ memberId: "M2", clubId: "c1", membership: { status: "Lapsed" } }, o)!;
    expect(r.club.status).toBe("inactive");
  });
  it("skips members without a club and omits association when club has no parent", () => {
    expect(buildRegistrations({ memberId: "M3" }, o)).toBeNull();
    expect(buildRegistrations({ memberId: "M4", clubId: "zz" }, o)!.association).toBeNull();
  });
});
