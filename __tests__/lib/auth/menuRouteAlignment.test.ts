import { describe, expect, it } from "vitest";
import { filterMenuForRole, menuConfig, type MenuItem } from "@/app/(admin)/admin/global-config/menuConfig";
import { canOpenAdminPath, evaluateAdminRouteAccess, pathOrgIds } from "@/lib/auth/adminRouteAccess";
import { getRoleDashboard } from "@/lib/auth/roleRedirects";

const ROLES = [
  "association-admin", "assoc-committee", "assoc-coach", "assoc-selector", "assoc-registrar", "assoc-competition",
  "media-marketing", "club-admin", "club-committee", "registrar", "coach", "manager", "team-selector",
  "umpire", "technical-official", "volunteer", "player", "member", "parent",
];
const ASSOC = new Set(["association-admin", "assoc-committee", "assoc-coach", "assoc-selector", "assoc-registrar", "assoc-competition", "media-marketing"]);
const flat = (m: MenuItem[]): MenuItem[] => m.flatMap((i) => [i, ...(i.subItems ? flat(i.subItems) : [])]);
const sessionFor = (role: string) => {
  const assoc = ASSOC.has(role);
  return {
    role,
    associationId: "assoc-x",
    clubId: "club-x",
    clubSlug: "club-x",
    scopedRoles: [{ role, scopeType: (assoc ? "association" : "club") as "association" | "club", scopeId: assoc ? "assoc-x" : "club-x" }],
  };
};

describe("the menu never offers a page the route rules refuse", () => {
  it.each(ROLES)("%s", (role) => {
    const blocked = flat(filterMenuForRole(role, [role]))
      .filter((i) => i.href && i.href !== "#" && !/^https?:/.test(i.href))
      .filter((i) => evaluateAdminRouteAccess(i.href.split("?")[0], sessionFor(role)) === "deny")
      .map((i) => `${i.label} -> ${i.href}`);
    expect(blocked).toEqual([]);
  });

  it("super-admin sees every entry", () => {
    expect(filterMenuForRole("super-admin")).toBe(menuConfig);
  });

  it("a group whose own page is closed links to its first open page", () => {
    const clubs = filterMenuForRole("assoc-committee", ["assoc-committee"]).find((i) => i.label === "Clubs");
    if (clubs) expect(canOpenAdminPath(clubs.href, ["assoc-committee"])).toBe(true);
  });
});

describe("Appoint Roles / Role Holders", () => {
  const has = (role: string, label: string) => flat(filterMenuForRole(role, [role])).some((i) => i.label === label);
  it("are offered to roles that manage people", () => {
    for (const r of ["association-admin", "club-admin", "club-committee", "registrar", "assoc-registrar"]) {
      expect(has(r, "Appoint Roles"), r).toBe(true);
      expect(has(r, "Role Holders"), r).toBe(true);
    }
  });
  it("are hidden from roles that cannot use them", () => {
    for (const r of ["coach", "manager", "team-selector", "umpire", "technical-official", "volunteer", "media-marketing", "assoc-coach", "assoc-selector"]) {
      expect(has(r, "Appoint Roles"), r).toBe(false);
      expect(has(r, "Role Holders"), r).toBe(false);
    }
  });
});

describe("organisation id in the path", () => {
  it("ignores fixed pages", () => {
    expect(pathOrgIds("/admin/associations/fees")).toEqual({ clubId: null, assocId: null });
    expect(pathOrgIds("/admin/associations/positions")).toEqual({ clubId: null, assocId: null });
    expect(pathOrgIds("/admin/associations/hierarchy")).toEqual({ clubId: null, assocId: null });
    expect(pathOrgIds("/admin/associations/new")).toEqual({ clubId: null, assocId: null });
    expect(pathOrgIds("/admin/clubs/selection-policy")).toEqual({ clubId: null, assocId: null });
  });
  it("reads real ids", () => {
    expect(pathOrgIds("/admin/associations/bha/venues")).toEqual({ clubId: null, assocId: "bha" });
    expect(pathOrgIds("/admin/clubs/club-x/edit")).toEqual({ clubId: "club-x", assocId: null });
  });
});

describe("association pages", () => {
  const s = sessionFor("association-admin");
  it("an association admin opens fee configuration, positions and hierarchy", () => {
    for (const p of ["/admin/associations/fees", "/admin/associations/positions", "/admin/associations/hierarchy"]) {
      expect(evaluateAdminRouteAccess(p, s), p).toBe("allow");
    }
  });
  it("still cannot open another association's pages", () => {
    expect(evaluateAdminRouteAccess("/admin/associations/assoc-x/venues", s)).toBe("allow");
    expect(evaluateAdminRouteAccess("/admin/associations/other/venues", { ...s, scopedRoles: [] })).toBe("deny");
  });
  it("a club role cannot open association pages", () => {
    expect(evaluateAdminRouteAccess("/admin/associations/assoc-x", sessionFor("club-admin"))).toBe("deny");
  });
});

describe("match rosters", () => {
  it("coach, manager and team selector open their own club's match rosters, not another club's", () => {
    for (const r of ["coach", "manager", "team-selector"]) {
      expect(evaluateAdminRouteAccess("/admin/clubs/club-x/match-rosters", sessionFor(r)), r).toBe("allow");
      expect(evaluateAdminRouteAccess("/admin/clubs/club-y/match-rosters", { ...sessionFor(r), scopedRoles: [] }), r).toBe("deny");
    }
  });
  it("coaches still cannot open the club editor", () => {
    expect(evaluateAdminRouteAccess("/admin/clubs/club-x/edit", sessionFor("coach"))).toBe("deny");
  });
});

describe("landing pages", () => {
  it("media and marketing land on News, registrars on their registrations", () => {
    expect(getRoleDashboard("media-marketing")).toBe("/admin/news");
    expect(getRoleDashboard("registrar", "club-x")).toBe("/admin/club-registrations");
    expect(getRoleDashboard("assoc-registrar", null, "assoc-x")).toBe("/admin/association-registrations");
    expect(getRoleDashboard("assoc-selector", null, "assoc-x")).toBe("/admin/nominations");
  });
  it.each(ROLES)("%s lands on a page they can open", (role) => {
    const target = getRoleDashboard(role, "club-x", "assoc-x");
    expect(evaluateAdminRouteAccess(target, sessionFor(role)), `${role} -> ${target}`).toBe("allow");
  });
});
