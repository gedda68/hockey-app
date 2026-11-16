import { describe, it, expect } from "vitest";
import {
  MATRIX_ROLES, CLUB_AREAS, ASSOC_AREAS, getMatrixRole, resolveAccess, scopeCovers, legacyRoleFor,
  legacyAssignmentsFor, contextOptions, accessMode, canEdit, canAdmin, type RoleHolding,
} from "@/lib/access/matrix";

const club = (roleKey: string, extra: Partial<RoleHolding> = {}, orgId = "club-1"): RoleHolding => ({ roleKey, orgType: "club", orgId, ...extra });
const assoc = (roleKey: string, orgId = "assoc-1"): RoleHolding => ({ roleKey, orgType: "association", orgId });

describe("matrix data", () => {
  it("loads every role with a code for every area", () => {
    expect(MATRIX_ROLES.filter((r) => r.orgType === "club")).toHaveLength(69);
    expect(MATRIX_ROLES.filter((r) => r.orgType === "association")).toHaveLength(92);
    for (const r of MATRIX_ROLES) {
      const areas = r.orgType === "club" ? CLUB_AREAS : ASSOC_AREAS;
      expect(Object.keys(r.access)).toHaveLength(areas.length);
      for (const c of Object.values(r.access)) expect("-VORAE".includes(c)).toBe(true);
    }
  });
  it("has unique role keys", () => {
    const keys = MATRIX_ROLES.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("matches known rows from the sheet", () => {
    const pres = getMatrixRole("club:president")!;
    expect(pres).toMatchObject({ level: 5, scope: "club" });
    expect(pres.access).toMatchObject({ clubSettings: "A", committeeGovernance: "A", financeFees: "R", medicalInjury: "-", usersRoles: "A" });
    const player = getMatrixRole("club:player")!;
    expect(player.access).toMatchObject({ ownProfile: "O", financeFees: "O", availabilitySelection: "O", medicalInjury: "O", teamsSquads: "V" });
    const ref = getMatrixRole("association:referee-umpire")!;
    expect(ref).toMatchObject({ scope: "assignedMatches", blueCardRequired: true });
    expect(ref.access).toMatchObject({ fixturesResults: "E", officialsAppointments: "O", integrityChildSafety: "E" });
    expect(getMatrixRole("club:head-coach")).toMatchObject({ scope: "team", blueCardRequired: true });
  });
});

describe("resolveAccess", () => {
  it("takes the highest code per area across the roles in the selected organisation", () => {
    const r = resolveAccess([club("club:player"), club("club:treasurer")], { kind: "org", orgType: "club", orgId: "club-1" });
    expect(r.areas.financeFees).toBe("A"); // Treasurer A beats Player O
    expect(r.areas.medicalInjury).toBe("O"); // only Player has it
    expect(r.areas.usersRoles).toBe("-");
    expect(r.level).toBe(5);
  });
  it("ignores roles held in other organisations", () => {
    const holdings = [club("club:president", {}, "club-1"), club("club:player", {}, "club-2")];
    const r = resolveAccess(holdings, { kind: "org", orgType: "club", orgId: "club-2" });
    expect(r.areas.clubSettings).toBe("-");
    expect(r.roles.map((x) => x.role.key)).toEqual(["club:player"]);
  });
  it("keeps Blue Card roles inactive until a valid card is held", () => {
    const h = [club("club:head-coach", { teamIds: ["t1"] })];
    const ctx = { kind: "org", orgType: "club", orgId: "club-1" } as const;
    const without = resolveAccess(h, ctx, { blueCardValid: false });
    expect(without.areas.trainingCoaching).toBe("-");
    expect(without.inactive).toEqual([{ roleKey: "club:head-coach", reason: "blue-card" }]);
    expect(resolveAccess(h, ctx, { blueCardValid: true }).areas.trainingCoaching).toBe("E");
  });
  it("skips ended, pending, expired and unknown holdings", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    const r = resolveAccess([
      club("club:secretary", { status: "pending" }), club("club:treasurer", { expiresAt: "2026-01-01T00:00:00Z" }), club("club:nope"),
    ], { kind: "org", orgType: "club", orgId: "club-1" }, { now });
    expect(r.roles).toHaveLength(0);
    expect(r.inactive.map((i) => i.reason).sort()).toEqual(["expired", "not-active", "unknown-role"]);
  });
  it("personal context only grants the own profile", () => {
    const r = resolveAccess([club("club:president")], { kind: "personal" });
    expect(r.areas).toEqual({ ownProfile: "O" });
  });
  it("maps codes to page modes and capabilities", () => {
    expect(accessMode("-")).toBe("hidden");
    expect(accessMode("O")).toBe("own");
    expect(canEdit("R")).toBe(false);
    expect(canEdit("E")).toBe(true);
    expect(canAdmin("E")).toBe(false);
  });
});

describe("scopeCovers", () => {
  it("limits team, age-group and assigned-match roles to what they hold", () => {
    const coach = getMatrixRole("club:head-coach")!;
    const h = club("club:head-coach", { teamIds: ["t1"] });
    expect(scopeCovers(coach, h, { teamId: "t1" })).toBe(true);
    expect(scopeCovers(coach, h, { teamId: "t2" })).toBe(false);
    const ump = getMatrixRole("club:club-umpire-referee")!;
    expect(scopeCovers(ump, club(ump.key, { fixtureIds: ["f1"] }), { fixtureId: "f2" })).toBe(false);
  });
  it("covers a guardian's linked children and own-club delegates", () => {
    const parent = getMatrixRole("club:parent-guardian")!;
    expect(scopeCovers(parent, club(parent.key), { memberId: "kid", selfMemberId: "me", childMemberIds: ["kid"] })).toBe(true);
    expect(scopeCovers(parent, club(parent.key), { memberId: "other", selfMemberId: "me", childMemberIds: ["kid"] })).toBe(false);
    const delegate = getMatrixRole("association:club-delegate")!;
    expect(scopeCovers(delegate, assoc(delegate.key, "a1"), { associationId: "a1" })).toBe(true);
  });
});

describe("compatibility with coarse roles", () => {
  it("maps matrix roles to the nearest existing role", () => {
    expect(legacyRoleFor(getMatrixRole("club:president")!)).toBe("club-admin");
    expect(legacyRoleFor(getMatrixRole("club:head-coach")!)).toBe("coach");
    expect(legacyRoleFor(getMatrixRole("association:referee-umpire")!)).toBe("umpire");
    expect(legacyRoleFor(getMatrixRole("club:canteen-manager")!)).toBe("volunteer");
    expect(legacyRoleFor(getMatrixRole("club:social-member")!)).toBe("member");
  });
  it("turns active holdings into coarse assignments, de-duplicated, honouring Blue Card", () => {
    const h = [club("club:head-coach"), club("club:assistant-coach"), club("club:player")];
    expect(legacyAssignmentsFor(h, { blueCardValid: false }).map((a) => a.role)).toEqual(["player"]);
    expect(legacyAssignmentsFor(h, { blueCardValid: true }).map((a) => a.role)).toEqual(["coach", "player"]);
  });
  it("lists one context per organisation with active roles", () => {
    const h = [club("club:player"), club("club:treasurer"), club("club:player", {}, "club-2"), assoc("association:selector-chair-of-selectors")];
    const opts = contextOptions(h);
    expect(opts.map((o) => `${o.orgType}:${o.orgId}`)).toEqual(["club:club-1", "club:club-2", "association:assoc-1"]);
    expect(opts[0].roleNames).toEqual(["Player", "Treasurer"]);
  });
});

import { contextFromSession } from "@/lib/access/memberAccess";
describe("contextFromSession", () => {
  it("uses the active club, then association, else personal", () => {
    expect(contextFromSession({ clubId: "c1", associationId: "a1" })).toEqual({ kind: "org", orgType: "club", orgId: "c1" });
    expect(contextFromSession({ clubId: null, associationId: "a1" })).toEqual({ kind: "org", orgType: "association", orgId: "a1" });
    expect(contextFromSession({ clubId: null, associationId: null })).toEqual({ kind: "personal" });
  });
});
