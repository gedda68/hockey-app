import { describe, expect, it } from "vitest";
import { filterMenuForRole, type MenuItem } from "@/app/(admin)/admin/global-config/menuConfig";
import { evaluateAdminRouteAccess } from "@/lib/auth/adminRouteAccess";

const OVERSIGHT = ["assoc-committee", "assoc-coach", "assoc-selector", "assoc-registrar", "assoc-competition"];
const as = (role: string) => ({
  role,
  associationId: "assoc-x",
  scopedRoles: [{ role, scopeType: "association" as const, scopeId: "assoc-x" }],
});
const can = (role: string, path: string) => evaluateAdminRouteAccess(path, as(role)) === "allow";
const flat = (m: MenuItem[]): MenuItem[] => m.flatMap((i) => [i, ...(i.subItems ? flat(i.subItems) : [])]);

describe("association staff can look at clubs, members and players", () => {
  it.each(OVERSIGHT)("%s opens the lists and detail pages", (role) => {
    for (const p of ["/admin/clubs", "/admin/clubs/some-club", "/admin/clubs/some-club/edit", "/admin/members", "/admin/members/MEM-1", "/admin/players", "/admin/players/PL-1"]) {
      expect(can(role, p), `${role} ${p}`).toBe(true);
    }
  });

  it.each(OVERSIGHT)("%s still can't open create or edit pages (a club's page opens locked)", (role) => {
    for (const p of [
      "/admin/clubs/new",
      "/admin/clubs/some-club/fees",
      "/admin/members/create",
      "/admin/members/MEM-1/edit",
      "/admin/players/new",
      "/admin/players/PL-1/edit",
    ]) {
      expect(can(role, p), `${role} ${p}`).toBe(false);
    }
  });

  it("media/marketing and ordinary members stay out", () => {
    for (const role of ["media-marketing", "player", "member", "parent", "volunteer"]) {
      for (const p of ["/admin/clubs", "/admin/members", "/admin/players"]) expect(can(role, p), `${role} ${p}`).toBe(false);
    }
  });

  it("the menu lists them for oversight roles", () => {
    for (const role of OVERSIGHT) {
      const labels = flat(filterMenuForRole(role, [role])).map((i) => i.label);
      expect(labels, role).toEqual(expect.arrayContaining(["Clubs", "Members", "Players"]));
      expect(labels, role).not.toContain("Add Member");
      expect(labels, role).not.toContain("Add Club");
      expect(labels, role).not.toContain("Add Player");
    }
  });
});
