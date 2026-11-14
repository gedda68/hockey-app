import { describe, it, expect } from "vitest";
import { normalizeMemberRoles } from "@/lib/auth/memberRoles";
import { toScopedRoles } from "@/lib/auth/toScopedRoles";
import { getPrimaryRole } from "@/lib/types/roles";

describe("normalizeMemberRoles", () => {
  it("converts imported string roles to club-scoped assignments", () => {
    const r = normalizeMemberRoles(["role-player", "role-coach", "role-junior-player"], "chc");
    expect(r.map((x) => x.role)).toEqual(["player", "coach"]);
    expect(r[0]).toMatchObject({ scopeType: "club", scopeId: "chc" });
    expect(getPrimaryRole(r)).toBe("coach");
  });
  it("never turns unrecognised strings (role-admin) into elevated roles", () => {
    expect(normalizeMemberRoles(["role-admin", "role-super-admin", "club-admin"], "chc")).toEqual([]);
  });
  it("keeps real assignments and tolerates junk", () => {
    const a = { role: "club-admin", scopeType: "club", scopeId: "chc", grantedAt: "x" };
    expect(normalizeMemberRoles([a, null, 5, {}], "chc")).toEqual([a]);
    expect(normalizeMemberRoles(undefined)).toEqual([]);
  });
  it("toScopedRoles ignores entries without a role", () => {
    expect(toScopedRoles([{ role: undefined } as any, { role: "player", scopeType: "club", scopeId: "c", grantedAt: "" }])).toHaveLength(1);
  });
});
