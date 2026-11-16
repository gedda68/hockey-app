import { describe, it, expect } from "vitest";
import { resolveAccess, getMatrixRole, type RoleHolding } from "@/lib/access/matrix";
import { holderState, canManageHolding, cleanHoldingPatch } from "@/lib/access/roleHolders";

const ctx = { kind: "org", orgType: "club", orgId: "c1" } as const;
const as = (...keys: string[]) => ({ access: resolveAccess(keys.map((roleKey): RoleHolding => ({ roleKey, orgType: "club", orgId: "c1" })), ctx, { blueCardValid: true }) });
const role = (k: string) => getMatrixRole(k)!;
const coach = role("club:head-coach");
const held: RoleHolding = { roleKey: coach.key, orgType: "club", orgId: "c1", teamIds: ["R1:A"] };
const now = new Date("2026-11-16");

describe("holderState", () => {
  it("covers active, ended, expired, pending and waiting on a Blue Card", () => {
    expect(holderState({}, { blueCardRequired: false }, { blueCardOk: false, now })).toBe("active");
    expect(holderState({ status: "ended" }, { blueCardRequired: false }, { blueCardOk: true, now })).toBe("ended");
    expect(holderState({ status: "pending" }, { blueCardRequired: false }, { blueCardOk: true, now })).toBe("pending");
    expect(holderState({ expiresAt: "2026-01-01" }, { blueCardRequired: false }, { blueCardOk: true, now })).toBe("expired");
    expect(holderState({}, { blueCardRequired: true }, { blueCardOk: false, now })).toBe("waiting-blue-card");
    expect(holderState({}, { blueCardRequired: true }, { blueCardOk: true, now })).toBe("active");
  });
});

describe("canManageHolding", () => {
  it("follows the appointment authority", () => {
    expect(canManageHolding(as("club:secretary"), coach, { self: false }).ok).toBe(true);
    expect(canManageHolding(as("club:head-coach"), coach, { self: false }).ok).toBe(false);
    expect(canManageHolding(as("club:secretary"), role("club:website-it-administrator"), { self: false }).ok).toBe(false); // above level
  });
  it("won't let people change their own roles, except super-admin", () => {
    const r = canManageHolding(as("club:secretary"), coach, { self: true });
    expect(r.ok).toBe(false);
    expect(canManageHolding({ ...as("club:secretary"), isSuperAdmin: true }, coach, { self: true }).ok).toBe(true);
  });
  it("words refusals as change, not appoint", () => {
    const r = canManageHolding(as("club:head-coach"), coach, { self: false });
    expect(!r.ok && r.reason).not.toMatch(/appoint/);
  });
});

describe("cleanHoldingPatch", () => {
  it("accepts a new team and trims ids", () => {
    const r = cleanHoldingPatch(coach, held, { teamIds: [" R2:B ", "R2:B"] });
    expect(r).toEqual({ ok: true, set: { teamIds: ["R2:B"] } });
  });
  it("won't leave a team role without a team", () => {
    const r = cleanHoldingPatch(coach, held, { teamIds: [] });
    expect(r.ok).toBe(false);
  });
  it("sets and clears the end date; rejects bad dates and blank seasons", () => {
    const set = cleanHoldingPatch(coach, held, { expiresAt: "2026-12-31" });
    expect(set.ok && typeof set.set.expiresAt).toBe("string");
    expect(cleanHoldingPatch(coach, held, { expiresAt: "" })).toEqual({ ok: true, set: { expiresAt: null } });
    expect(cleanHoldingPatch(coach, held, { expiresAt: "nope" }).ok).toBe(false);
    expect(cleanHoldingPatch(coach, held, { season: " " }).ok).toBe(false);
    expect(cleanHoldingPatch(coach, held, { season: "2027" })).toEqual({ ok: true, set: { season: "2027" } });
  });
  it("rejects an empty change", () => {
    expect(cleanHoldingPatch(coach, held, {}).ok).toBe(false);
  });
});
