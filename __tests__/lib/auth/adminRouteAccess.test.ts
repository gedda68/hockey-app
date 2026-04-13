import { describe, it, expect } from "vitest";
import { evaluateAdminRouteAccess } from "@/lib/auth/adminRouteAccess";

function session(partial: {
  role: string;
  clubId?: string | null;
  clubSlug?: string | null;
  associationId?: string | null;
  scopedRoles?: {
    role: string;
    scopeType: "global" | "association" | "club" | "team";
    scopeId?: string;
  }[];
}) {
  return {
    role: partial.role,
    clubId: partial.clubId ?? null,
    clubSlug: partial.clubSlug ?? null,
    associationId: partial.associationId ?? null,
    scopedRoles: partial.scopedRoles,
  };
}

describe("evaluateAdminRouteAccess", () => {
  it("denies club registrar access to super-admin-only /admin/users", () => {
    expect(
      evaluateAdminRouteAccess("/admin/users", session({ role: "registrar" })),
    ).toBe("deny");
  });

  it("allows super-admin to /admin/users", () => {
    expect(
      evaluateAdminRouteAccess("/admin/users", session({ role: "super-admin" })),
    ).toBe("allow");
  });

  it("allows coach to /admin/dashboard", () => {
    expect(
      evaluateAdminRouteAccess("/admin/dashboard", session({ role: "coach" })),
    ).toBe("allow");
  });

  it("allows player to /admin/profile", () => {
    expect(
      evaluateAdminRouteAccess("/admin/profile", session({ role: "player" })),
    ).toBe("allow");
  });

  it("denies registrar from /admin/clubs/* (clubs route is CLUB_AND_ABOVE only)", () => {
    expect(
      evaluateAdminRouteAccess(
        "/admin/clubs/other-club/edit",
        session({ role: "registrar", clubId: "my-club" }),
      ),
    ).toBe("deny");
  });

  it("allows club-admin to their own club subtree", () => {
    expect(
      evaluateAdminRouteAccess(
        "/admin/clubs/my-club/edit",
        session({ role: "club-admin", clubId: "my-club" }),
      ),
    ).toBe("allow");
  });

  it("allows club-admin when path uses slug and session has matching clubSlug", () => {
    expect(
      evaluateAdminRouteAccess(
        "/admin/clubs/chc/edit",
        session({ role: "club-admin", clubId: "club-1", clubSlug: "chc" }),
      ),
    ).toBe("allow");
  });

  it("denies club-admin from another club's subtree", () => {
    expect(
      evaluateAdminRouteAccess(
        "/admin/clubs/other-club/edit",
        session({ role: "club-admin", clubId: "my-club" }),
      ),
    ).toBe("deny");
  });

  it("denies association staff from another association's associations subtree", () => {
    expect(
      evaluateAdminRouteAccess(
        "/admin/associations/other-assoc",
        session({
          role: "assoc-registrar",
          associationId: "my-assoc",
        }),
      ),
    ).toBe("deny");
  });

  it("allows association-admin to their association subtree", () => {
    expect(
      evaluateAdminRouteAccess(
        "/admin/associations/my-assoc",
        session({
          role: "association-admin",
          associationId: "my-assoc",
        }),
      ),
    ).toBe("allow");
  });

  it("allows assoc-competition to their association subtree (B5)", () => {
    expect(
      evaluateAdminRouteAccess(
        "/admin/associations/my-assoc",
        session({
          role: "assoc-competition",
          associationId: "my-assoc",
        }),
      ),
    ).toBe("allow");
  });

  it("denies assoc-competition from another association subtree", () => {
    expect(
      evaluateAdminRouteAccess(
        "/admin/associations/other-assoc",
        session({
          role: "assoc-competition",
          associationId: "my-assoc",
        }),
      ),
    ).toBe("deny");
  });

  it("denies club-only role from association subtree without scoped association role", () => {
    expect(
      evaluateAdminRouteAccess(
        "/admin/associations/bha/fees",
        session({ role: "registrar", clubId: "chc" }),
      ),
    ).toBe("deny");
  });

  it("allows assoc-registrar on representative subtree for their association scope", () => {
    expect(
      evaluateAdminRouteAccess(
        "/admin/representative",
        session({
          role: "assoc-registrar",
          associationId: "bha",
        }),
      ),
    ).toBe("allow");
  });

  it("allows scoped association role when path matches scope even if primary is club role", () => {
    expect(
      evaluateAdminRouteAccess(
        "/admin/associations/bha",
        session({
          role: "club-admin",
          clubId: "chc",
          scopedRoles: [
            { role: "association-admin", scopeType: "association", scopeId: "bha" },
          ],
        }),
      ),
    ).toBe("allow");
  });

  it("allows non-matching paths to fall through (no admin rule prefix)", () => {
    expect(
      evaluateAdminRouteAccess("/some-future-page", session({ role: "coach" })),
    ).toBe("allow");
  });

  it("allows portal paths for player role", () => {
    expect(
      evaluateAdminRouteAccess("/portal", session({ role: "player" })),
    ).toBe("allow");
  });

  it("denies player role from /api/admin/* (B4)", () => {
    expect(
      evaluateAdminRouteAccess(
        "/api/admin/events",
        session({ role: "player" }),
      ),
    ).toBe("deny");
  });

  it("allows coach to /api/admin/ analytics-style paths", () => {
    expect(
      evaluateAdminRouteAccess(
        "/api/admin/analytics",
        session({ role: "coach" }),
      ),
    ).toBe("allow");
  });

  it("allows assoc-selector to association selection-policy hub (not ASSOCIATION_TREE_ROLES)", () => {
    expect(
      evaluateAdminRouteAccess(
        "/admin/associations/selection-policy",
        session({ role: "assoc-selector", associationId: "bha" }),
      ),
    ).toBe("allow");
  });

  it("denies assoc-selector from another association selection-policy page", () => {
    expect(
      evaluateAdminRouteAccess(
        "/admin/associations/other-assoc/selection-policy",
        session({ role: "assoc-selector", associationId: "bha" }),
      ),
    ).toBe("deny");
  });

  it("allows club-admin to clubs selection-policy hub", () => {
    expect(
      evaluateAdminRouteAccess(
        "/admin/clubs/selection-policy",
        session({ role: "club-admin", clubId: "chc" }),
      ),
    ).toBe("allow");
  });
});
