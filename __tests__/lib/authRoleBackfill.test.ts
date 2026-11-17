import { describe, expect, it } from "vitest";
import { authRoleAssignment, mapLegacyAssignment, planMemberHoldings } from "@/lib/access/legacyMapping";
import { legacyAssignmentsOf } from "@/lib/access/memberLegacy";

const NOW = new Date("2026-06-01T00:00:00Z");
const ctx = () => ({ now: NOW });

describe("authRoleAssignment (role held on the login)", () => {
  it("reads club roles against the member's club", () => {
    expect(authRoleAssignment({ auth: { role: "registrar" }, clubId: "c1" })).toEqual({ role: "registrar", scopeType: "club", scopeId: "c1" });
    expect(authRoleAssignment({ auth: { role: "club-committee" }, membership: { clubId: "c2" } })).toMatchObject({ scopeId: "c2" });
  });

  it("reads association roles against the member's association", () => {
    expect(authRoleAssignment({ auth: { role: "assoc-registrar" }, associationId: "a1", clubId: "c1" })).toEqual({ role: "assoc-registrar", scopeType: "association", scopeId: "a1" });
  });

  it("ignores ordinary defaults and unscoped accounts", () => {
    for (const role of ["player", "member", "parent", "volunteer", "super-admin", undefined]) {
      expect(authRoleAssignment({ auth: { role }, clubId: "c1", associationId: "a1" })).toBeNull();
    }
    expect(authRoleAssignment({ auth: { role: "registrar" } })).toBeNull();
    expect(authRoleAssignment({ auth: { role: "assoc-committee" }, clubId: "c1" })).toBeNull();
  });
});

describe("top administrators are not narrowed", () => {
  it("club-admin and association-admin go to review, never to a holding", () => {
    expect(mapLegacyAssignment({ role: "club-admin", scopeType: "club", scopeId: "c1" }, ctx()).kind).toBe("review");
    expect(mapLegacyAssignment({ role: "association-admin", scopeType: "association", scopeId: "a1" }, ctx()).kind).toBe("review");
  });
});

describe("a committee/registrar account gets its holding", () => {
  it("backfills a registrar whose role is only on the login", () => {
    const member = { auth: { role: "registrar" }, clubId: "c1", roles: [] };
    const plan = planMemberHoldings(legacyAssignmentsOf(member), [], ctx);
    expect(plan.add.map((h) => h.roleKey)).toEqual(["club:registrar-membership-secretary"]);
  });

  it("does not double up with the same role in roles[]", () => {
    const member = { auth: { role: "registrar" }, clubId: "c1", roles: [{ role: "registrar", scopeType: "club", scopeId: "c1" }] };
    expect(planMemberHoldings(legacyAssignmentsOf(member), [], ctx).add).toHaveLength(1);
  });

  it("lists a club-wide coach login for review", () => {
    const plan = planMemberHoldings(legacyAssignmentsOf({ auth: { role: "coach" }, clubId: "c1" }), [], ctx);
    expect(plan.add).toHaveLength(0);
    expect(plan.review).toHaveLength(1);
  });
});
