/**
 * __tests__/api/admin/authMiddleware.test.ts
 *
 * Unit tests for every auth guard exported from lib/auth/middleware.ts.
 *
 * S8(a) — Every guard returns 401 when no session exists.
 * S8(b) — requireResourceAccess("club") returns 403 when club-A admin calls
 *          with club-B's ID.
 * S8(c) — requireResourceAccess("association") returns 403 when assoc-A admin
 *          calls with assoc-B's ID.
 *
 * These tests are fast pure-logic tests (no network, no DB).
 * `getSession` is mocked at the module level so the cookie layer is bypassed.
 *
 * ── Why test the middleware directly? ────────────────────────────────────────
 * All /api/admin/** route handlers call one of:
 *   requireRole | requirePermission | requireAnyPermission | requireResourceAccess
 * Proving each guard enforces the invariants here guarantees that ANY route
 * using these guards is protected.  The companion unauthenticated.test.ts
 * verifies that a representative sample of routes actually CALL the guards.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock getSession BEFORE importing middleware ───────────────────────────────
// vi.mock is hoisted by Vitest, so the mock is in place when middleware is imported.
vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return { ...actual, getSession: vi.fn() };
});

// Mock MongoDB so module-level imports that touch clientPromise don't attempt a
// real connection when this test file is loaded.
vi.mock("@/lib/mongodb", () => ({
  default: Promise.resolve({
    db: () => ({ collection: () => ({ findOne: vi.fn().mockResolvedValue(null) }) }),
  }),
  getDatabaseName: vi.fn().mockReturnValue("hockey-app-test"),
  getDatabase:     vi.fn().mockResolvedValue({
    collection: () => ({ findOne: vi.fn().mockResolvedValue(null) }),
  }),
}));

// ── Imports (after mocks are registered) ─────────────────────────────────────
import { getSession } from "@/lib/auth/session";
import {
  requireAuth,
  requireRole,
  requirePermission,
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { makeRequest } from "@/__tests__/helpers/request";
import { sessions }    from "@/__tests__/helpers/session";

// Convenient typed mock reference
const mockGetSession = vi.mocked(getSession);

// ── Helper ────────────────────────────────────────────────────────────────────

function req(path = "/api/admin/test"): NextRequest {
  return makeRequest(path);
}

// ─────────────────────────────────────────────────────────────────────────────
// requireAuth
// ─────────────────────────────────────────────────────────────────────────────

describe("requireAuth", () => {
  beforeEach(() => mockGetSession.mockReset());

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValue(null);
    const { response } = await requireAuth(req());
    expect(response?.status).toBe(401);
  });

  it("returns no response (passes) when a valid session exists", async () => {
    mockGetSession.mockResolvedValue(sessions.superAdmin());
    const { response, user } = await requireAuth(req());
    expect(response).toBeUndefined();
    expect(user?.userId).toBe("user-super");
  });

  it("returns no response for any authenticated role", async () => {
    for (const sess of [
      sessions.clubAdmin("club-1"),
      sessions.associationAdmin("assoc-1"),
      sessions.player(),
      sessions.coach("club-1"),
    ]) {
      mockGetSession.mockResolvedValue(sess);
      const { response } = await requireAuth(req());
      expect(response, `role ${sess.role} should pass requireAuth`).toBeUndefined();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireRole
// ─────────────────────────────────────────────────────────────────────────────

describe("requireRole", () => {
  const CONTENT_ROLES = ["super-admin", "association-admin", "media-marketing", "club-admin"];

  beforeEach(() => mockGetSession.mockReset());

  it("returns 401 with no session", async () => {
    mockGetSession.mockResolvedValue(null);
    const { response } = await requireRole(req(), CONTENT_ROLES);
    expect(response?.status).toBe(401);
  });

  it("returns 403 when the user's role is not in the allowed list", async () => {
    mockGetSession.mockResolvedValue(sessions.player());
    const { response } = await requireRole(req(), CONTENT_ROLES);
    expect(response?.status).toBe(403);
  });

  it("returns 403 for coach when only admin roles are allowed", async () => {
    mockGetSession.mockResolvedValue(sessions.coach("club-1"));
    const { response } = await requireRole(req(), ["super-admin", "association-admin"]);
    expect(response?.status).toBe(403);
  });

  it("passes (no response) when the user's role is in the allowed list", async () => {
    mockGetSession.mockResolvedValue(sessions.superAdmin());
    const { response } = await requireRole(req(), CONTENT_ROLES);
    expect(response).toBeUndefined();
  });

  it("passes for each role in the allowed list", async () => {
    for (const role of ["association-admin", "media-marketing", "club-admin"]) {
      const sess = role === "club-admin"
        ? sessions.clubAdmin("club-1")
        : role === "media-marketing"
          ? sessions.mediaMarketing("assoc-1")
          : sessions.associationAdmin("assoc-1");
      mockGetSession.mockResolvedValue(sess);
      const { response } = await requireRole(req(), CONTENT_ROLES);
      expect(response, `role ${role} should pass`).toBeUndefined();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requirePermission
// ─────────────────────────────────────────────────────────────────────────────

describe("requirePermission", () => {
  beforeEach(() => mockGetSession.mockReset());

  it("returns 401 with no session", async () => {
    mockGetSession.mockResolvedValue(null);
    const { response } = await requirePermission(req(), "club.view");
    expect(response?.status).toBe(401);
  });

  it("returns 403 when the user lacks the required permission", async () => {
    // player has no admin permissions
    mockGetSession.mockResolvedValue(sessions.player());
    const { response } = await requirePermission(req(), "club.view");
    expect(response?.status).toBe(403);
  });

  it("returns 403 when coach lacks a privileged permission", async () => {
    mockGetSession.mockResolvedValue(sessions.coach("club-1"));
    const { response } = await requirePermission(req(), "system.manage");
    expect(response?.status).toBe(403);
  });

  it("passes for super-admin (holds all permissions)", async () => {
    mockGetSession.mockResolvedValue(sessions.superAdmin());
    const { response } = await requirePermission(req(), "club.view");
    expect(response).toBeUndefined();
  });

  it("passes for club-admin with club.view permission", async () => {
    mockGetSession.mockResolvedValue(sessions.clubAdmin("club-1"));
    const { response } = await requirePermission(req(), "club.view");
    expect(response).toBeUndefined();
  });

  it("passes for club registrar with registration.manage permission", async () => {
    mockGetSession.mockResolvedValue(sessions.clubRegistrar("club-1"));
    const { response } = await requirePermission(req(), "registration.manage");
    expect(response).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireAnyPermission
// ─────────────────────────────────────────────────────────────────────────────

describe("requireAnyPermission", () => {
  const PERMS = ["system.manage", "association.settings", "association.edit"] as const;

  beforeEach(() => mockGetSession.mockReset());

  it("returns 401 with no session", async () => {
    mockGetSession.mockResolvedValue(null);
    const { response } = await requireAnyPermission(req(), [...PERMS]);
    expect(response?.status).toBe(401);
  });

  it("returns 403 when the user holds none of the permissions", async () => {
    mockGetSession.mockResolvedValue(sessions.player());
    const { response } = await requireAnyPermission(req(), [...PERMS]);
    expect(response?.status).toBe(403);
  });

  it("returns 403 for club-admin (club-only perms, not association.settings)", async () => {
    mockGetSession.mockResolvedValue(sessions.clubAdmin("club-1"));
    const { response } = await requireAnyPermission(req(), ["system.manage", "association.settings"]);
    expect(response?.status).toBe(403);
  });

  it("passes when the user holds at least one of the listed permissions", async () => {
    mockGetSession.mockResolvedValue(sessions.superAdmin());
    const { response } = await requireAnyPermission(req(), [...PERMS]);
    expect(response).toBeUndefined();
  });

  it("passes for association-admin with association.settings", async () => {
    mockGetSession.mockResolvedValue(sessions.associationAdmin("assoc-1"));
    const { response } = await requireAnyPermission(req(), [...PERMS]);
    expect(response).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireResourceAccess — CLUB isolation (S8 b)
// ─────────────────────────────────────────────────────────────────────────────

describe("requireResourceAccess (club) — S8(b) cross-club isolation", () => {
  beforeEach(() => mockGetSession.mockReset());

  it("returns 401 with no session", async () => {
    mockGetSession.mockResolvedValue(null);
    const { response } = await requireResourceAccess(req(), "club", "club-alpha");
    expect(response?.status).toBe(401);
  });

  it("returns 403: club-admin for club-alpha CANNOT access club-beta", async () => {
    mockGetSession.mockResolvedValue(sessions.clubAdmin("club-alpha"));
    const { response } = await requireResourceAccess(req(), "club", "club-beta");
    expect(response?.status).toBe(403);
  });

  it("passes: club-admin for club-alpha CAN access club-alpha (by ID)", async () => {
    mockGetSession.mockResolvedValue(sessions.clubAdmin("club-alpha"));
    const { response } = await requireResourceAccess(req(), "club", "club-alpha");
    expect(response).toBeUndefined();
  });

  it("passes: club-admin for club-alpha CAN access club-alpha (by slug)", async () => {
    mockGetSession.mockResolvedValue(sessions.clubAdmin("club-alpha", "alpha-hc"));
    const { response } = await requireResourceAccess(req(), "club", "alpha-hc");
    expect(response).toBeUndefined();
  });

  it("returns 403: registrar for club-alpha CANNOT access club-beta", async () => {
    mockGetSession.mockResolvedValue(sessions.clubRegistrar("club-alpha"));
    const { response } = await requireResourceAccess(req(), "club", "club-beta");
    expect(response?.status).toBe(403);
  });

  it("returns 403: coach for club-alpha CANNOT access club-beta", async () => {
    mockGetSession.mockResolvedValue(sessions.coach("club-alpha"));
    const { response } = await requireResourceAccess(req(), "club", "club-beta");
    expect(response?.status).toBe(403);
  });

  it("passes: super-admin CAN access any club", async () => {
    mockGetSession.mockResolvedValue(sessions.superAdmin());
    const { response } = await requireResourceAccess(req(), "club", "any-club-id");
    expect(response).toBeUndefined();
  });

  it("returns 403: assoc-admin CANNOT access a club in a different association (DB returns null)", async () => {
    // MongoDB mock returns null (club not found) → parentAssociationId check fails
    mockGetSession.mockResolvedValue(sessions.associationAdmin("assoc-alpha"));
    const { response } = await requireResourceAccess(req(), "club", "club-from-other-assoc");
    expect(response?.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireResourceAccess — ASSOCIATION isolation (S8 c)
// ─────────────────────────────────────────────────────────────────────────────

describe("requireResourceAccess (association) — S8(c) cross-association isolation", () => {
  beforeEach(() => mockGetSession.mockReset());

  it("returns 401 with no session", async () => {
    mockGetSession.mockResolvedValue(null);
    const { response } = await requireResourceAccess(req(), "association", "assoc-alpha");
    expect(response?.status).toBe(401);
  });

  it("returns 403: assoc-admin for assoc-alpha CANNOT access assoc-beta", async () => {
    mockGetSession.mockResolvedValue(sessions.associationAdmin("assoc-alpha"));
    const { response } = await requireResourceAccess(req(), "association", "assoc-beta");
    expect(response?.status).toBe(403);
  });

  it("passes: assoc-admin for assoc-alpha CAN access assoc-alpha", async () => {
    mockGetSession.mockResolvedValue(sessions.associationAdmin("assoc-alpha"));
    const { response } = await requireResourceAccess(req(), "association", "assoc-alpha");
    expect(response).toBeUndefined();
  });

  it("returns 403: assoc-registrar for assoc-alpha CANNOT access assoc-beta", async () => {
    mockGetSession.mockResolvedValue(sessions.assocRegistrar("assoc-alpha"));
    const { response } = await requireResourceAccess(req(), "association", "assoc-beta");
    expect(response?.status).toBe(403);
  });

  it("passes: assoc-registrar for assoc-alpha CAN access assoc-alpha", async () => {
    mockGetSession.mockResolvedValue(sessions.assocRegistrar("assoc-alpha"));
    const { response } = await requireResourceAccess(req(), "association", "assoc-alpha");
    expect(response).toBeUndefined();
  });

  it("returns 403: club-admin CANNOT access any association (no assoc scope)", async () => {
    mockGetSession.mockResolvedValue(sessions.clubAdmin("club-1"));
    const { response } = await requireResourceAccess(req(), "association", "assoc-alpha");
    expect(response?.status).toBe(403);
  });

  it("passes: super-admin CAN access any association", async () => {
    mockGetSession.mockResolvedValue(sessions.superAdmin());
    const { response } = await requireResourceAccess(req(), "association", "any-assoc-id");
    expect(response).toBeUndefined();
  });
});
