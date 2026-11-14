import { describe, it, expect } from "vitest";
import { getRoleDashboard } from "@/lib/auth/roleRedirects";

describe("getRoleDashboard", () => {
  it("sends members, players, parents and unrecognised roles to their own registration page", () => {
    for (const r of ["member", "player", "parent", "staff", "role-whatever"]) expect(getRoleDashboard(r)).toBe("/admin/my-registration");
  });
  it("keeps admin landings", () => {
    expect(getRoleDashboard("super-admin")).toBe("/admin/dashboard");
  });
});
