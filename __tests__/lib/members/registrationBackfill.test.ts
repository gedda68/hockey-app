import { describe, it, expect } from "vitest";
import { buildRegistrations } from "@/lib/members/registrationBackfill";
import { categorise } from "@/lib/registrations/pricing";

const levels = [
  { kind: "club" as const, id: "chc", name: "Commercial" },
  { kind: "association" as const, id: "bha", name: "Brisbane Hockey", hierarchyLevel: 2 },
  { kind: "association" as const, id: "hq", name: "Hockey Queensland", hierarchyLevel: 1 },
  { kind: "association" as const, id: "ha", name: "Hockey Australia", hierarchyLevel: 0 },
];
const o = { season: 2026, levelsByClub: new Map([["chc", levels]]), now: new Date("2026-01-01") };
const base = { memberId: "M1", roles: ["role-player"], membership: { clubId: "chc", status: "Active" } };

describe("categorise", () => {
  it("18 in the season year is senior, 17 is junior", () => {
    expect(categorise({ roles: ["role-player"], personalInfo: { dateOfBirth: "2008-12-31" } }, 2026)).toBe("senior"); // turns 18 in 2026
    expect(categorise({ roles: ["role-player"], personalInfo: { dateOfBirth: "2009-01-01" } }, 2026)).toBe("junior"); // 17
  });
});

describe("buildRegistrations", () => {
  it("junior pays $20 at club and every association level", () => {
    const r = buildRegistrations({ ...base, personalInfo: { dateOfBirth: "2010-04-01" } }, o)!;
    expect(r.club.registrationCategory).toBe("junior");
    expect(r.club.fees.map((f) => f.amount)).toEqual([20, 20, 20, 20]);
    expect(r.club.totalFee).toBe(80);
    expect(r.associations.map((a) => a.registrationId)).toEqual(["AREG-bha-M1-2026", "AREG-hq-M1-2026", "AREG-ha-M1-2026"]);
    expect(r.associations.every((a) => a.totalFee === 20)).toBe(true);
  });
  it("senior pays $100 per level", () => {
    const r = buildRegistrations({ ...base, personalInfo: { dateOfBirth: "1990-04-01" } }, o)!;
    expect(r.club.registrationCategory).toBe("senior");
    expect(r.club.totalFee).toBe(400);
  });
  it("other registration (umpire) pays $20 per level", () => {
    const r = buildRegistrations({ memberId: "M2", roles: ["role-umpire"], personalInfo: { dateOfBirth: "1980-01-01" }, membership: { clubId: "chc" } }, o)!;
    expect(r.club.registrationCategory).toBe("other");
    expect(r.club.totalFee).toBe(80);
  });
  it("volunteer is club only and $0", () => {
    const r = buildRegistrations({ memberId: "M3", roles: ["role-volunteer"], membership: { clubId: "chc" } }, o)!;
    expect(r.club.registrationCategory).toBe("volunteer");
    expect(r.club.totalFee).toBe(0);
    expect(r.associations).toEqual([]);
  });
  it("skips members without a club; inactive status mapped", () => {
    expect(buildRegistrations({ memberId: "M4" }, o)).toBeNull();
    expect(buildRegistrations({ ...base, membership: { clubId: "chc", status: "Lapsed" } }, o)!.club.status).toBe("inactive");
  });
});
