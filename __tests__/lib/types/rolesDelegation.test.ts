import { describe, expect, it } from "vitest";
import {
  getEffectivePermissions,
  type RoleAssignment,
} from "@/lib/types/roles";

describe("B5 competitions.fixtures delegation", () => {
  it("implies competitions.fixtures when competitions.manage is granted", () => {
    const assignments: RoleAssignment[] = [
      {
        role: "association-admin",
        scopeType: "association",
        scopeId: "bha",
        grantedAt: new Date().toISOString(),
        active: true,
      },
    ];
    const perms = getEffectivePermissions(assignments);
    expect(perms.has("competitions.manage")).toBe(true);
    expect(perms.has("competitions.fixtures")).toBe(true);
  });

  it("assoc-competition has fixtures but not manage or association.fees", () => {
    const assignments: RoleAssignment[] = [
      {
        role: "assoc-competition",
        scopeType: "association",
        scopeId: "bha",
        grantedAt: new Date().toISOString(),
        active: true,
      },
    ];
    const perms = getEffectivePermissions(assignments);
    expect(perms.has("competitions.fixtures")).toBe(true);
    expect(perms.has("competitions.manage")).toBe(false);
    expect(perms.has("association.fees")).toBe(false);
    expect(perms.has("results.manage")).toBe(true);
  });
});
