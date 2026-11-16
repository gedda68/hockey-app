import { describe, it, expect } from "vitest";
import { resolveAccess, getMatrixRole, type RoleHolding } from "@/lib/access/matrix";
import { canAppoint, appointableRoles, missingScope, holdingFromAppointment, hasHolding, cleanIds, type RoleAppointment } from "@/lib/access/appointments";

const ctx = { kind: "org", orgType: "club", orgId: "c1" } as const;
const as = (...keys: string[]) => ({
  access: resolveAccess(keys.map((roleKey): RoleHolding => ({ roleKey, orgType: "club", orgId: "c1" })), ctx, { blueCardValid: true }),
});
const role = (k: string) => getMatrixRole(k)!;

describe("canAppoint", () => {
  it("lets Users & Roles editors (secretary) appoint up to their level", () => {
    expect(canAppoint(as("club:secretary"), role("club:treasurer")).ok).toBe(true);
    expect(canAppoint(as("club:secretary"), role("club:website-it-administrator")).ok).toBe(false); // L6 above L5
  });
  it("lets a delegate with Admin in the category's area appoint inside it", () => {
    const director = as("club:director-of-coaching");
    expect(canAppoint(director, role("club:head-coach")).ok).toBe(true);
    expect(canAppoint(director, role("club:treasurer")).ok).toBe(false);
  });
  it("blocks people without authority, wrong org type and membership types", () => {
    expect(canAppoint(as("club:head-coach"), role("club:assistant-coach")).ok).toBe(false);
    expect(canAppoint(as("club:president"), role("association:referee-umpire")).ok).toBe(false);
    expect(canAppoint(as("club:president"), role("club:social-member")).ok).toBe(false);
  });
  it("needs a chosen organisation; super-admin is only limited by org type", () => {
    const personal = { access: resolveAccess([], { kind: "personal" }) };
    expect(canAppoint(personal, role("club:treasurer")).ok).toBe(false);
    expect(canAppoint({ ...as("club:patron"), isSuperAdmin: true }, role("club:treasurer")).ok).toBe(true);
  });
  it("lists only appointable roles", () => {
    const names = appointableRoles(as("club:director-of-coaching")).map((r) => r.name);
    expect(names).toContain("Head Coach");
    expect(names).not.toContain("President");
    expect(names).not.toContain("Social Member");
  });
});

describe("scope and holdings", () => {
  it("requires the scope each role needs", () => {
    expect(missingScope(role("club:head-coach"), {})).toMatch(/team/i);
    expect(missingScope(role("club:head-coach"), { teamIds: ["t1"] })).toBeNull();
    expect(missingScope(role("club:club-umpire-referee"), {})).toMatch(/match/i);
    expect(missingScope(role("club:president"), {})).toBeNull();
  });
  it("creates an active holding from an accepted appointment", () => {
    const a: RoleAppointment = { appointmentId: "APT-1", roleKey: "club:head-coach", orgType: "club", orgId: "c1", memberId: "m1", teamIds: ["t1"], season: "2026", status: "pending", createdAt: "" };
    const h = holdingFromAppointment(a);
    expect(h).toMatchObject({ roleKey: "club:head-coach", orgId: "c1", teamIds: ["t1"], status: "active", appointmentId: "APT-1" });
    expect(hasHolding([h], "club:head-coach", "c1")).toBe(true);
    expect(hasHolding([h], "club:head-coach", "c2")).toBe(false);
  });
  it("cleans id lists", () => {
    expect(cleanIds([" a ", "a", "", "b"])).toEqual(["a", "b"]);
    expect(cleanIds([])).toBeUndefined();
    expect(cleanIds("x")).toBeUndefined();
  });
});
