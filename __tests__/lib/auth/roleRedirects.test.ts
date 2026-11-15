import { describe, it, expect } from "vitest";
import { getRoleDashboard } from "@/lib/auth/roleRedirects";

describe("getRoleDashboard", () => {
  it("sends members, players and parents to their personal dashboard", () => {
    for (const r of ["member", "player", "parent"]) expect(getRoleDashboard(r)).toBe("/admin/dashboard");
  });
  it("sends unrecognised roles to their own registration page", () => {
    for (const r of ["staff", "role-whatever"]) expect(getRoleDashboard(r)).toBe("/admin/my-registration");
  });
  it("keeps admin landings", () => {
    expect(getRoleDashboard("super-admin")).toBe("/admin/dashboard");
  });
});

describe("getRoleDashboard falls back when the landing is not permitted", () => {
  it("never lands a role on a page it is denied", async () => {
    const { evaluateAdminRouteAccess } = await import("@/lib/auth/adminRouteAccess");
    for (const r of ["coach", "manager", "team-selector", "umpire", "volunteer", "player", "member", "parent", "public", "junior"]) {
      const path = getRoleDashboard(r, "some-club", "some-assoc");
      expect(evaluateAdminRouteAccess(path, { role: r })).toBe("allow");
    }
  });
});
