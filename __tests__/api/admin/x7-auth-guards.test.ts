/**
 * __tests__/api/admin/x7-auth-guards.test.ts
 *
 * X7 — Comprehensive API auth-guard sweep
 *
 * Closes the remaining coverage gap left by S8 (unauthenticated.test.ts), which
 * tested only ~12 routes.  This suite extends coverage to the full admin surface.
 *
 * Two assertion tiers
 * ───────────────────
 * 1. 401 sweep — every route family returns 401 when getSession() → null.
 *    Organised by the guard variant each route uses:
 *      requireRole | requirePermission | requireAnyPermission |
 *      requireAuth | requirePermission+requireResourceAccess (club/assoc)
 *
 * 2. 403 representative tests — authenticated but wrong scope or missing permission:
 *    a) Wrong permission  — sessions.player() has no admin permissions
 *    b) Wrong resource    — valid session, resource access mock returns false
 *
 * Implementation note
 * ───────────────────
 * Route handlers call the auth guard as their *first* await.  When
 * getSession() returns null every guard short-circuits and returns a 401
 * Response *before* any database or business-logic code is reached.
 * The MongoDB and service-layer mocks below therefore only need to exist at
 * the module level — they are never actually invoked during the 401 tests.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ── Session mock — MUST come before any route import ─────────────────────────
vi.mock("@/lib/auth/session", () => ({
  getSession:                      vi.fn(),
  createSession:                   vi.fn(),
  deleteSession:                   vi.fn(),
  attachSessionCookie:             vi.fn(),
  attachSessionCookieHostOnly:     vi.fn(),
}));

// ── MongoDB — minimal stubs so clientPromise + getDatabase imports resolve ───
vi.mock("@/lib/mongodb", () => ({
  default: Promise.resolve({
    db: () => ({
      collection: () => ({
        findOne:        vi.fn().mockResolvedValue(null),
        find:           vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }), toArray: vi.fn().mockResolvedValue([]) }),
        insertOne:      vi.fn().mockResolvedValue({ insertedId: "mock-id" }),
        updateOne:      vi.fn().mockResolvedValue({ modifiedCount: 1 }),
        replaceOne:     vi.fn().mockResolvedValue({ upsertedCount: 1 }),
        deleteOne:      vi.fn().mockResolvedValue({ deletedCount: 1 }),
        countDocuments: vi.fn().mockResolvedValue(0),
        aggregate:      vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
      }),
    }),
  }),
  getDatabaseName: vi.fn().mockReturnValue("hockey-app-test"),
  getDatabase:     vi.fn().mockResolvedValue({
    collection: () => ({
      findOne:        vi.fn().mockResolvedValue(null),
      find:           vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }), toArray: vi.fn().mockResolvedValue([]) }),
      insertOne:      vi.fn().mockResolvedValue({ insertedId: "mock-id" }),
      updateOne:      vi.fn().mockResolvedValue({ modifiedCount: 1 }),
      replaceOne:     vi.fn().mockResolvedValue({ upsertedCount: 1 }),
      deleteOne:      vi.fn().mockResolvedValue({ deletedCount: 1 }),
      countDocuments: vi.fn().mockResolvedValue(0),
      aggregate:      vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
    }),
  }),
}));

// ── Side-effect libraries ─────────────────────────────────────────────────────
vi.mock("@/lib/audit/platformAuditLog", () => ({
  logPlatformAudit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/observability/adminTelemetry", () => ({
  adminTelemetryFromRequestLike: vi.fn().mockReturnValue({}),
  logAdminTelemetry:             vi.fn(),
}));

// ── Resource access DB — always deny so scope-guard tests get 403 ─────────────
vi.mock("@/lib/auth/resourceAccessDb", () => ({
  userCanAccessClubResource:        vi.fn().mockResolvedValue(false),
  userCanAccessAssociationResource: vi.fn().mockResolvedValue(false),
}));

// ── Email ─────────────────────────────────────────────────────────────────────
vi.mock("@/lib/email/client", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  resend:    null,
}));

// ── Officiating / COI ─────────────────────────────────────────────────────────
vi.mock("@/lib/officiating/umpireCoiAndAvailability", () => ({
  evaluateFixtureUmpireAssignments: vi.fn().mockResolvedValue({ slots: [] }),
}));
vi.mock("@/lib/officiating/umpireMatchPayment", () => ({
  previewUmpirePaymentsForFixture: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/officiating/resolveUmpireDisplay", () => ({
  resolveUmpireDisplayMap: vi.fn().mockResolvedValue(new Map()),
}));
vi.mock("@/lib/officiating/umpirePaymentLineStatus", () => ({
  isAllowedUmpirePaymentTransition: vi.fn().mockReturnValue(true),
}));
vi.mock("@/lib/member/umpireSelfService", () => ({
  mergeUmpireSlotAllocationStatus:  vi.fn().mockReturnValue({}),
  slotHasValidCoiOverride:          vi.fn().mockReturnValue(false),
}));
vi.mock("@/lib/auth/umpirePaymentAccess", () => ({
  canPreviewUmpirePayments: vi.fn().mockReturnValue(true),
  canMutateUmpirePayments:  vi.fn().mockReturnValue(true),
}));

// ── Bulk import ───────────────────────────────────────────────────────────────
vi.mock("@/lib/bulk-import/runBulkImport", () => ({
  runBulkImport:      vi.fn().mockResolvedValue({ imported: 0, updated: 0, skipped: 0, errors: [] }),
  isBulkImportEntity: vi.fn().mockReturnValue(true),
}));
vi.mock("@/lib/bulk-import/bulkImportAccess", () => ({
  authorizeBulkImport:         vi.fn().mockResolvedValue({ ok: true }),
  buildImportRuntimeContext:   vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/bulk-import/helpers", () => ({
  applyRowScope: vi.fn().mockReturnValue([]),
}));

// ── Ballots ───────────────────────────────────────────────────────────────────
vi.mock("@/lib/ballots/sendBallotInvites", () => ({
  sendBallotInvites: vi.fn().mockResolvedValue(undefined),
}));

// ── Email templates (avoid Resend SDK at import) ─────────────────────────────
vi.mock("@/lib/email/templates/umpireAssignment", () => ({
  buildUmpireAssignmentEmail: vi.fn().mockReturnValue({ subject: "s", html: "h", text: "t" }),
}));

// ── Imports (after all mocks) ─────────────────────────────────────────────────
import { getSession }                  from "@/lib/auth/session";
import { sessions }                    from "@/__tests__/helpers/session";
import { makeRequest, routeParams }    from "@/__tests__/helpers/request";

const mockGetSession = vi.mocked(getSession);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal JSON body for POST/PATCH requests that need one to pass parse. */
const emptyBody = {};

// ─────────────────────────────────────────────────────────────────────────────
// PART 1 — 401 sweep (unauthenticated)
// ─────────────────────────────────────────────────────────────────────────────

describe("X7 — 401 when unauthenticated", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue(null);
  });

  // ── requireRole routes ───────────────────────────────────────────────────────

  describe("requireRole — media/admin-only routes", () => {
    it("GET  /api/admin/home-gallery returns 401", async () => {
      const { GET } = await import("@/app/api/admin/home-gallery/route");
      expect((await GET(makeRequest("/api/admin/home-gallery"))).status).toBe(401);
    });

    it("DELETE /api/admin/home-gallery returns 401", async () => {
      const { DELETE } = await import("@/app/api/admin/home-gallery/route");
      expect((await DELETE(makeRequest("/api/admin/home-gallery", { method: "DELETE" }))).status).toBe(401);
    });

    it("POST /api/admin/roles/expire returns 401", async () => {
      const { POST } = await import("@/app/api/admin/roles/expire/route");
      expect((await POST(makeRequest("/api/admin/roles/expire", { method: "POST", body: emptyBody }))).status).toBe(401);
    });

    it("GET  /api/admin/roles/expiring returns 401", async () => {
      const { GET } = await import("@/app/api/admin/roles/expiring/route");
      expect((await GET(makeRequest("/api/admin/roles/expiring"))).status).toBe(401);
    });
  });

  // ── requirePermission — global scope ─────────────────────────────────────────

  describe("requirePermission — global-scope routes", () => {
    it("GET  /api/admin/players returns 401", async () => {
      const { GET } = await import("@/app/api/admin/players/route");
      expect((await GET(makeRequest("/api/admin/players"))).status).toBe(401);
    });

    it("POST /api/admin/players returns 401", async () => {
      const { POST } = await import("@/app/api/admin/players/route");
      expect((await POST(makeRequest("/api/admin/players", { method: "POST", body: emptyBody }))).status).toBe(401);
    });

    it("GET  /api/admin/users returns 401", async () => {
      const { GET } = await import("@/app/api/admin/users/route");
      expect((await GET(makeRequest("/api/admin/users"))).status).toBe(401);
    });

    it("POST /api/admin/stats returns 401", async () => {
      const { POST } = await import("@/app/api/admin/stats/route");
      expect((await POST(makeRequest("/api/admin/stats", { method: "POST", body: emptyBody }))).status).toBe(401);
    });

    it("GET  /api/admin/metadata returns 401", async () => {
      const { GET } = await import("@/app/api/admin/metadata/route");
      expect((await GET(makeRequest("/api/admin/metadata"))).status).toBe(401);
    });

    it("GET  /api/admin/migrate returns 401", async () => {
      const { GET } = await import("@/app/api/admin/migrate/route");
      expect((await GET(makeRequest("/api/admin/migrate"))).status).toBe(401);
    });

    it("GET  /api/admin/fees returns 401", async () => {
      const { GET } = await import("@/app/api/admin/fees/route");
      expect((await GET(makeRequest("/api/admin/fees"))).status).toBe(401);
    });

    it("GET  /api/admin/rep-fees returns 401", async () => {
      const { GET } = await import("@/app/api/admin/rep-fees/route");
      expect((await GET(makeRequest("/api/admin/rep-fees"))).status).toBe(401);
    });

    it("GET  /api/admin/divisions returns 401", async () => {
      const { GET } = await import("@/app/api/admin/divisions/route");
      expect((await GET(makeRequest("/api/admin/divisions"))).status).toBe(401);
    });

    it("GET  /api/admin/rosters returns 401", async () => {
      const { GET } = await import("@/app/api/admin/rosters/route");
      expect((await GET(makeRequest("/api/admin/rosters"))).status).toBe(401);
    });

    it("GET  /api/admin/ballots returns 401", async () => {
      const { GET } = await import("@/app/api/admin/ballots/route");
      expect((await GET(makeRequest("/api/admin/ballots"))).status).toBe(401);
    });

    it("POST /api/admin/ballots returns 401", async () => {
      const { POST } = await import("@/app/api/admin/ballots/route");
      expect((await POST(makeRequest("/api/admin/ballots", { method: "POST", body: emptyBody }))).status).toBe(401);
    });

    it("GET  /api/admin/nomination-windows returns 401", async () => {
      const { GET } = await import("@/app/api/admin/nomination-windows/route");
      expect((await GET(makeRequest("/api/admin/nomination-windows"))).status).toBe(401);
    });

    it("POST /api/admin/nomination-windows returns 401", async () => {
      const { POST } = await import("@/app/api/admin/nomination-windows/route");
      expect((await POST(makeRequest("/api/admin/nomination-windows", { method: "POST", body: emptyBody }))).status).toBe(401);
    });

    it("GET  /api/admin/nominations returns 401", async () => {
      const { GET } = await import("@/app/api/admin/nominations/route");
      expect((await GET(makeRequest("/api/admin/nominations"))).status).toBe(401);
    });

    it("POST /api/admin/nominations returns 401", async () => {
      const { POST } = await import("@/app/api/admin/nominations/route");
      expect((await POST(makeRequest("/api/admin/nominations", { method: "POST", body: emptyBody }))).status).toBe(401);
    });

    it("GET  /api/admin/nominations/available returns 401", async () => {
      const { GET } = await import("@/app/api/admin/nominations/available/route");
      expect((await GET(makeRequest("/api/admin/nominations/available"))).status).toBe(401);
    });

    it("GET  /api/admin/nominations/eligible returns 401", async () => {
      const { GET } = await import("@/app/api/admin/nominations/eligible/route");
      expect((await GET(makeRequest("/api/admin/nominations/eligible"))).status).toBe(401);
    });

    it("GET  /api/admin/club-membership-types returns 401", async () => {
      const { GET } = await import("@/app/api/admin/club-membership-types/route");
      expect((await GET(makeRequest("/api/admin/club-membership-types"))).status).toBe(401);
    });

    it("GET  /api/admin/club-roles returns 401", async () => {
      const { GET } = await import("@/app/api/admin/club-roles/route");
      expect((await GET(makeRequest("/api/admin/club-roles"))).status).toBe(401);
    });

    it("GET  /api/admin/relationship-types returns 401", async () => {
      const { GET } = await import("@/app/api/admin/relationship-types/route");
      expect((await GET(makeRequest("/api/admin/relationship-types"))).status).toBe(401);
    });

    it("GET  /api/admin/private-health-providers returns 401", async () => {
      const { GET } = await import("@/app/api/admin/private-health-providers/route");
      expect((await GET(makeRequest("/api/admin/private-health-providers"))).status).toBe(401);
    });

    it("GET  /api/admin/global-config/salutations returns 401", async () => {
      const { GET } = await import("@/app/api/admin/global-config/salutations/route");
      expect((await GET(makeRequest("/api/admin/global-config/salutations"))).status).toBe(401);
    });

    it("GET  /api/admin/config returns 401", async () => {
      const { GET } = await import("@/app/api/admin/config/route");
      expect((await GET(makeRequest("/api/admin/config"))).status).toBe(401);
    });

    it("GET  /api/admin/competitions returns 401", async () => {
      const { GET } = await import("@/app/api/admin/competitions/route");
      expect((await GET(makeRequest("/api/admin/competitions"))).status).toBe(401);
    });

    it("GET  /api/admin/teams/rosters returns 401", async () => {
      const { GET } = await import("@/app/api/admin/teams/rosters/route");
      expect((await GET(makeRequest("/api/admin/teams/rosters"))).status).toBe(401);
    });

    it("GET  /api/admin/tournaments returns 401", async () => {
      const { GET } = await import("@/app/api/admin/tournaments/route");
      expect((await GET(makeRequest("/api/admin/tournaments"))).status).toBe(401);
    });

    it("POST /api/admin/tournaments returns 401", async () => {
      const { POST } = await import("@/app/api/admin/tournaments/route");
      expect((await POST(makeRequest("/api/admin/tournaments", { method: "POST", body: emptyBody }))).status).toBe(401);
    });
  });

  // ── requireAnyPermission routes ───────────────────────────────────────────────

  describe("requireAnyPermission — multi-permission routes", () => {
    it("GET  /api/admin/umpires/available returns 401", async () => {
      const { GET } = await import("@/app/api/admin/umpires/available/route");
      expect((await GET(makeRequest("/api/admin/umpires/available"))).status).toBe(401);
    });

    it("POST /api/admin/umpires/assign returns 401", async () => {
      const { POST } = await import("@/app/api/admin/umpires/assign/route");
      expect((await POST(makeRequest("/api/admin/umpires/assign", { method: "POST", body: emptyBody }))).status).toBe(401);
    });

    it("GET  /api/admin/season-competitions/[id]/fixtures returns 401", async () => {
      const { GET } = await import("@/app/api/admin/season-competitions/[seasonCompetitionId]/fixtures/route");
      const res = await GET(
        makeRequest("/api/admin/season-competitions/sc-1/fixtures"),
        routeParams({ seasonCompetitionId: "sc-1" }),
      );
      expect(res.status).toBe(401);
    });

    it("GET  /api/admin/season-competitions/[id] returns 401", async () => {
      const { GET } = await import("@/app/api/admin/season-competitions/[seasonCompetitionId]/route");
      const res = await GET(
        makeRequest("/api/admin/season-competitions/sc-1"),
        routeParams({ seasonCompetitionId: "sc-1" }),
      );
      expect(res.status).toBe(401);
    });

    it("GET  /api/admin/season-competitions/[id]/standings returns 401", async () => {
      const { GET } = await import("@/app/api/admin/season-competitions/[seasonCompetitionId]/standings/route");
      const res = await GET(
        makeRequest("/api/admin/season-competitions/sc-1/standings"),
        routeParams({ seasonCompetitionId: "sc-1" }),
      );
      expect(res.status).toBe(401);
    });

    it("POST /api/admin/season-competitions/[id]/fixtures/generate returns 401", async () => {
      const { POST } = await import("@/app/api/admin/season-competitions/[seasonCompetitionId]/fixtures/generate/route");
      const res = await POST(
        makeRequest("/api/admin/season-competitions/sc-1/fixtures/generate", { method: "POST", body: emptyBody }),
        routeParams({ seasonCompetitionId: "sc-1" }),
      );
      expect(res.status).toBe(401);
    });

    it("POST /api/admin/season-competitions/[id]/fixtures/[fid]/umpire-assignment-check returns 401", async () => {
      const { POST } = await import("@/app/api/admin/season-competitions/[seasonCompetitionId]/fixtures/[fixtureId]/umpire-assignment-check/route");
      const res = await POST(
        makeRequest("/api/admin/season-competitions/sc-1/fixtures/fx-1/umpire-assignment-check", { method: "POST", body: emptyBody }),
        routeParams({ seasonCompetitionId: "sc-1", fixtureId: "fx-1" }),
      );
      expect(res.status).toBe(401);
    });

    it("GET  /api/admin/analytics returns 401", async () => {
      const { GET } = await import("@/app/api/admin/analytics/route");
      expect((await GET(makeRequest("/api/admin/analytics"))).status).toBe(401);
    });
  });

  // ── requireAuth routes ────────────────────────────────────────────────────────

  describe("requireAuth — session-only routes", () => {
    it("POST /api/admin/bulk-import/[entity] returns 401", async () => {
      const { POST } = await import("@/app/api/admin/bulk-import/[entity]/route");
      const res = await POST(
        makeRequest("/api/admin/bulk-import/members", { method: "POST", body: emptyBody }),
        routeParams({ entity: "members" }),
      );
      expect(res.status).toBe(401);
    });

    it("GET  /api/admin/season-competitions/[id]/fixtures/[fid]/umpire-payments/preview returns 401", async () => {
      const { GET } = await import("@/app/api/admin/season-competitions/[seasonCompetitionId]/fixtures/[fixtureId]/umpire-payments/preview/route");
      const res = await GET(
        makeRequest("/api/admin/season-competitions/sc-1/fixtures/fx-1/umpire-payments/preview"),
        routeParams({ seasonCompetitionId: "sc-1", fixtureId: "fx-1" }),
      );
      expect(res.status).toBe(401);
    });

    it("POST /api/admin/season-competitions/[id]/fixtures/[fid]/umpire-payments/lines returns 401", async () => {
      const { POST } = await import("@/app/api/admin/season-competitions/[seasonCompetitionId]/fixtures/[fixtureId]/umpire-payments/lines/route");
      const res = await POST(
        makeRequest("/api/admin/season-competitions/sc-1/fixtures/fx-1/umpire-payments/lines", { method: "POST", body: emptyBody }),
        routeParams({ seasonCompetitionId: "sc-1", fixtureId: "fx-1" }),
      );
      expect(res.status).toBe(401);
    });
  });

  // ── requirePermission + requireResourceAccess — club-scoped ───────────────────

  describe("requirePermission + requireResourceAccess — club-scoped routes", () => {
    const clubParams = routeParams({ id: "club-x" });
    const clubPath   = (suffix = "") => `/api/admin/clubs/club-x${suffix}`;

    it("GET  /api/admin/clubs/[id] returns 401", async () => {
      const { GET } = await import("@/app/api/admin/clubs/[id]/route");
      expect((await GET(makeRequest(clubPath()), clubParams)).status).toBe(401);
    });

    it("GET  /api/admin/clubs/[id]/members returns 401", async () => {
      const { GET } = await import("@/app/api/admin/clubs/[id]/members/route");
      expect((await GET(makeRequest(clubPath("/members")), clubParams)).status).toBe(401);
    });

    it("GET  /api/admin/clubs/[id]/fees returns 401", async () => {
      const { GET } = await import("@/app/api/admin/clubs/[id]/fees/route");
      expect((await GET(makeRequest(clubPath("/fees")), clubParams)).status).toBe(401);
    });

    it("GET  /api/admin/clubs/[id]/invites returns 401", async () => {
      const { GET } = await import("@/app/api/admin/clubs/[id]/invites/route");
      expect((await GET(makeRequest(clubPath("/invites")), clubParams)).status).toBe(401);
    });

    it("GET  /api/admin/clubs/[id]/selection-policy returns 401", async () => {
      const { GET } = await import("@/app/api/admin/clubs/[id]/selection-policy/route");
      expect((await GET(makeRequest(clubPath("/selection-policy")), clubParams)).status).toBe(401);
    });

    it("GET  /api/admin/clubs/[id]/volunteer-duty-roster returns 401", async () => {
      const { GET } = await import("@/app/api/admin/clubs/[id]/volunteer-duty-roster/route");
      expect((await GET(makeRequest(clubPath("/volunteer-duty-roster")), clubParams)).status).toBe(401);
    });
  });

  // ── requirePermission + requireResourceAccess — association-scoped ────────────

  describe("requirePermission + requireResourceAccess — association-scoped routes", () => {
    const assocId     = "assoc-x";
    const assocParams = routeParams({ associationId: assocId });
    const assocPath   = (suffix = "") => `/api/admin/associations/${assocId}${suffix}`;

    it("GET  /api/admin/associations/[id] returns 401", async () => {
      const { GET } = await import("@/app/api/admin/associations/[associationId]/route");
      expect((await GET(makeRequest(assocPath()), assocParams)).status).toBe(401);
    });

    it("PUT  /api/admin/associations/[id]/colors returns 401", async () => {
      const { PUT } = await import("@/app/api/admin/associations/[associationId]/colors/route");
      expect((await PUT(makeRequest(assocPath("/colors"), { method: "PUT", body: emptyBody }), assocParams)).status).toBe(401);
    });

    it("GET  /api/admin/associations/[id]/fees returns 401", async () => {
      const { GET } = await import("@/app/api/admin/associations/[associationId]/fees/route");
      expect((await GET(makeRequest(assocPath("/fees")), assocParams)).status).toBe(401);
    });

    it("GET  /api/admin/associations/[id]/venues returns 401", async () => {
      const { GET } = await import("@/app/api/admin/associations/[associationId]/venues/route");
      expect((await GET(makeRequest(assocPath("/venues")), assocParams)).status).toBe(401);
    });

    it("GET  /api/admin/associations/[id]/selection-policy returns 401", async () => {
      const { GET } = await import("@/app/api/admin/associations/[associationId]/selection-policy/route");
      expect((await GET(makeRequest(assocPath("/selection-policy")), assocParams)).status).toBe(401);
    });

    it("GET  /api/admin/associations/[id]/official-register returns 401", async () => {
      const { GET } = await import("@/app/api/admin/associations/[associationId]/official-register/route");
      expect((await GET(makeRequest(assocPath("/official-register")), assocParams)).status).toBe(401);
    });

    it("GET  /api/admin/associations/[id]/officiating-report returns 401", async () => {
      const { GET } = await import("@/app/api/admin/associations/[associationId]/officiating-report/route");
      expect((await GET(makeRequest(assocPath("/officiating-report")), assocParams)).status).toBe(401);
    });

    it("GET  /api/admin/associations/[id]/umpire-payment-lines returns 401", async () => {
      const { GET } = await import("@/app/api/admin/associations/[associationId]/umpire-payment-lines/route");
      expect((await GET(makeRequest(assocPath("/umpire-payment-lines")), assocParams)).status).toBe(401);
    });

    it("GET  /api/admin/associations/[id]/umpire-payment-schedule returns 401", async () => {
      const { GET } = await import("@/app/api/admin/associations/[associationId]/umpire-payment-schedule/route");
      expect((await GET(makeRequest(assocPath("/umpire-payment-schedule")), assocParams)).status).toBe(401);
    });

    it("GET  /api/admin/associations/[id]/finance/accounts returns 401", async () => {
      const { GET } = await import("@/app/api/admin/associations/[associationId]/finance/accounts/route");
      expect((await GET(makeRequest(assocPath("/finance/accounts")), assocParams)).status).toBe(401);
    });

    it("GET  /api/admin/associations/[id]/finance/cost-centres returns 401", async () => {
      const { GET } = await import("@/app/api/admin/associations/[associationId]/finance/cost-centres/route");
      expect((await GET(makeRequest(assocPath("/finance/cost-centres")), assocParams)).status).toBe(401);
    });

    it("GET  /api/admin/associations/[id]/finance/income-ledger returns 401", async () => {
      const { GET } = await import("@/app/api/admin/associations/[associationId]/finance/income-ledger/route");
      expect((await GET(makeRequest(assocPath("/finance/income-ledger")), assocParams)).status).toBe(401);
    });

    it("GET  /api/admin/associations/[id]/finance/expense-ledger returns 401", async () => {
      const { GET } = await import("@/app/api/admin/associations/[associationId]/finance/expense-ledger/route");
      expect((await GET(makeRequest(assocPath("/finance/expense-ledger")), assocParams)).status).toBe(401);
    });

    it("GET  /api/admin/associations/[id]/season-competitions returns 401", async () => {
      const { GET } = await import("@/app/api/admin/associations/[associationId]/season-competitions/route");
      expect((await GET(makeRequest(assocPath("/season-competitions")), assocParams)).status).toBe(401);
    });

    it("GET  /api/admin/associations/[id]/roster-divisions returns 401", async () => {
      const { GET } = await import("@/app/api/admin/associations/[associationId]/roster-divisions/route");
      expect((await GET(makeRequest(assocPath("/roster-divisions")), assocParams)).status).toBe(401);
    });

    it("GET  /api/admin/associations/[id]/league-builder-teams returns 401", async () => {
      const { GET } = await import("@/app/api/admin/associations/[associationId]/league-builder-teams/route");
      expect((await GET(makeRequest(assocPath("/league-builder-teams")), assocParams)).status).toBe(401);
    });

    it("POST /api/admin/associations/[id]/season-rollover returns 401", async () => {
      const { POST } = await import("@/app/api/admin/associations/[associationId]/season-rollover/route");
      expect((await POST(makeRequest(assocPath("/season-rollover"), { method: "POST", body: emptyBody }), assocParams)).status).toBe(401);
    });

    it("GET  /api/admin/associations/[id]/division-team-overview returns 401", async () => {
      const { GET } = await import("@/app/api/admin/associations/[associationId]/division-team-overview/route");
      expect((await GET(makeRequest(assocPath("/division-team-overview")), assocParams)).status).toBe(401);
    });

    it("GET  /api/admin/associations/[id]/pitch-calendar-entries returns 401", async () => {
      const { GET } = await import("@/app/api/admin/associations/[associationId]/pitch-calendar-entries/route");
      expect((await GET(makeRequest(assocPath("/pitch-calendar-entries")), assocParams)).status).toBe(401);
    });

    it("GET  /api/admin/associations/[id]/roster-divisions returns 401 (alias check)", async () => {
      const { GET } = await import("@/app/api/admin/associations/[associationId]/roster-divisions/route");
      expect((await GET(makeRequest(assocPath("/roster-divisions")), assocParams)).status).toBe(401);
    });
  });

  // ── Fixture sub-routes ────────────────────────────────────────────────────────

  describe("fixture sub-routes", () => {
    const scId = "sc-1";
    const fxId = "fx-1";
    const fxParams = routeParams({ seasonCompetitionId: scId, fixtureId: fxId });
    const fxBase   = `/api/admin/season-competitions/${scId}/fixtures/${fxId}`;

    it("PATCH /api/admin/.../fixtures/[fid]/result returns 401", async () => {
      const { PATCH } = await import("@/app/api/admin/season-competitions/[seasonCompetitionId]/fixtures/[fixtureId]/result/route");
      expect((await PATCH(makeRequest(`${fxBase}/result`, { method: "PATCH", body: emptyBody }), fxParams)).status).toBe(401);
    });

    it("PATCH /api/admin/.../fixtures/[fid]/match-events returns 401", async () => {
      const { PATCH } = await import("@/app/api/admin/season-competitions/[seasonCompetitionId]/fixtures/[fixtureId]/match-events/route");
      expect((await PATCH(makeRequest(`${fxBase}/match-events`, { method: "PATCH", body: emptyBody }), fxParams)).status).toBe(401);
    });
  });

  // ── Members sub-routes ────────────────────────────────────────────────────────

  describe("members/[id] sub-routes", () => {
    const memberId = "mem-1";
    const mParams  = routeParams({ id: memberId });
    const mBase    = `/api/admin/members/${memberId}`;

    it("GET  /api/admin/members/[id] returns 401", async () => {
      const { GET } = await import("@/app/api/admin/members/[id]/route");
      expect((await GET(makeRequest(mBase), mParams)).status).toBe(401);
    });

    it("GET  /api/admin/members/[id]/history returns 401", async () => {
      const { GET } = await import("@/app/api/admin/members/[id]/history/route");
      expect((await GET(makeRequest(`${mBase}/history`), mParams)).status).toBe(401);
    });

    it("POST /api/admin/members/[id]/playing-history returns 401", async () => {
      const { POST } = await import("@/app/api/admin/members/[id]/playing-history/route");
      expect((await POST(makeRequest(`${mBase}/playing-history`, { method: "POST", body: emptyBody }), mParams)).status).toBe(401);
    });

    it("POST /api/admin/members/[id]/notify-fee-due returns 401", async () => {
      const { POST } = await import("@/app/api/admin/members/[id]/notify-fee-due/route");
      expect((await POST(makeRequest(`${mBase}/notify-fee-due`, { method: "POST", body: emptyBody }), mParams)).status).toBe(401);
    });

    it("GET  /api/admin/members/[id]/data-export returns 401", async () => {
      const { GET } = await import("@/app/api/admin/members/[id]/data-export/route");
      expect((await GET(makeRequest(`${mBase}/data-export`), mParams)).status).toBe(401);
    });
  });

  // ── Players sub-routes ────────────────────────────────────────────────────────

  describe("players/[playerId] sub-routes", () => {
    const playerId = "player-1";
    const pParams  = routeParams({ playerId });
    const pBase    = `/api/admin/players/${playerId}`;

    it("GET  /api/admin/players/[playerId] returns 401", async () => {
      const { GET } = await import("@/app/api/admin/players/[playerId]/route");
      expect((await GET(makeRequest(pBase), pParams)).status).toBe(401);
    });

    it("PUT  /api/admin/players/[playerId]/status returns 401", async () => {
      const { PUT } = await import("@/app/api/admin/players/[playerId]/status/route");
      expect((await PUT(makeRequest(`${pBase}/status`, { method: "PUT", body: emptyBody }), pParams)).status).toBe(401);
    });

    it("GET  /api/admin/players/[playerId]/notes returns 401", async () => {
      const { GET } = await import("@/app/api/admin/players/[playerId]/notes/route");
      expect((await GET(makeRequest(`${pBase}/notes`), pParams)).status).toBe(401);
    });

    it("PUT  /api/admin/players/[playerId]/consent returns 401", async () => {
      const { PUT } = await import("@/app/api/admin/players/[playerId]/consent/route");
      expect((await PUT(makeRequest(`${pBase}/consent`, { method: "PUT", body: emptyBody }), pParams)).status).toBe(401);
    });
  });

  // ── Tournament routes ─────────────────────────────────────────────────────────

  describe("tournament routes", () => {
    const tId     = "tour-1";
    const tParams = routeParams({ id: tId });
    const tBase   = `/api/admin/tournaments/${tId}`;

    it("GET  /api/admin/tournaments/[id] returns 401", async () => {
      const { GET } = await import("@/app/api/admin/tournaments/[id]/route");
      expect((await GET(makeRequest(tBase), tParams)).status).toBe(401);
    });

    it("GET  /api/admin/tournaments/[id]/fixtures returns 401", async () => {
      const { GET } = await import("@/app/api/admin/tournaments/[id]/fixtures/route");
      expect((await GET(makeRequest(`${tBase}/fixtures`), tParams)).status).toBe(401);
    });

    it("GET  /api/admin/tournaments/[id]/draw returns 401", async () => {
      const { GET } = await import("@/app/api/admin/tournaments/[id]/draw/route");
      expect((await GET(makeRequest(`${tBase}/draw`), tParams)).status).toBe(401);
    });

    it("GET  /api/admin/tournaments/[id]/awards returns 401", async () => {
      const { GET } = await import("@/app/api/admin/tournaments/[id]/awards/route");
      expect((await GET(makeRequest(`${tBase}/awards`), tParams)).status).toBe(401);
    });
  });

  // ── Ballot + nomination-window sub-routes ─────────────────────────────────────

  describe("ballot sub-routes", () => {
    const ballotId = "ballot-1";
    const bParams  = routeParams({ ballotId });

    it("GET  /api/admin/ballots/[ballotId] returns 401", async () => {
      const { GET } = await import("@/app/api/admin/ballots/[ballotId]/route");
      expect((await GET(makeRequest(`/api/admin/ballots/${ballotId}`), bParams)).status).toBe(401);
    });

    it("POST /api/admin/ballots/[ballotId]/vote returns 401", async () => {
      const { POST } = await import("@/app/api/admin/ballots/[ballotId]/vote/route");
      expect((await POST(makeRequest(`/api/admin/ballots/${ballotId}/vote`, { method: "POST", body: emptyBody }), bParams)).status).toBe(401);
    });
  });

  describe("nomination-window/[windowId] sub-routes", () => {
    const windowId = "win-1";
    const wParams  = routeParams({ windowId });

    it("GET  /api/admin/nomination-windows/[windowId] returns 401", async () => {
      const { GET } = await import("@/app/api/admin/nomination-windows/[windowId]/route");
      expect((await GET(makeRequest(`/api/admin/nomination-windows/${windowId}`), wParams)).status).toBe(401);
    });
  });

  // ── Role-request sub-routes ───────────────────────────────────────────────────

  describe("role-requests/[requestId] sub-routes", () => {
    const requestId = "req-1";
    const rParams   = routeParams({ requestId });

    it("GET  /api/admin/role-requests/[requestId] returns 401", async () => {
      const { GET } = await import("@/app/api/admin/role-requests/[requestId]/route");
      expect((await GET(makeRequest(`/api/admin/role-requests/${requestId}`), rParams)).status).toBe(401);
    });
  });

  // ── Season-competition awards ─────────────────────────────────────────────────

  describe("season-competition award routes", () => {
    const scId     = "sc-1";
    const scParams = routeParams({ seasonCompetitionId: scId });

    it("GET  /api/admin/season-competitions/[id]/awards returns 401", async () => {
      const { GET } = await import("@/app/api/admin/season-competitions/[seasonCompetitionId]/awards/route");
      expect((await GET(makeRequest(`/api/admin/season-competitions/${scId}/awards`), scParams)).status).toBe(401);
    });
  });

  // ── Users sub-routes ──────────────────────────────────────────────────────────

  describe("users/[userId] sub-routes", () => {
    const userId  = "user-1";
    const uParams = routeParams({ userId });

    it("GET  /api/admin/users/[userId] returns 401", async () => {
      const { GET } = await import("@/app/api/admin/users/[userId]/route");
      expect((await GET(makeRequest(`/api/admin/users/${userId}`), uParams)).status).toBe(401);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 2 — 403 wrong-permission (authenticated, insufficient role)
// ─────────────────────────────────────────────────────────────────────────────

describe("X7 — 403 when authenticated but missing permission (sessions.player)", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue(sessions.player());
  });

  it("GET  /api/admin/members returns 403 for player session", async () => {
    const { GET } = await import("@/app/api/admin/members/route");
    expect((await GET(makeRequest("/api/admin/members"))).status).toBe(403);
  });

  it("GET  /api/admin/clubs returns 403 for player session", async () => {
    const { GET } = await import("@/app/api/admin/clubs/route");
    expect((await GET(makeRequest("/api/admin/clubs"))).status).toBe(403);
  });

  it("GET  /api/admin/associations returns 403 for player session", async () => {
    const { GET } = await import("@/app/api/admin/associations/route");
    expect((await GET(makeRequest("/api/admin/associations"))).status).toBe(403);
  });

  it("GET  /api/admin/players returns 403 for player session", async () => {
    const { GET } = await import("@/app/api/admin/players/route");
    expect((await GET(makeRequest("/api/admin/players"))).status).toBe(403);
  });

  it("GET  /api/admin/tournaments returns 403 for player session", async () => {
    const { GET } = await import("@/app/api/admin/tournaments/route");
    expect((await GET(makeRequest("/api/admin/tournaments"))).status).toBe(403);
  });

  it("GET  /api/admin/umpires/available returns 403 for player session", async () => {
    const { GET } = await import("@/app/api/admin/umpires/available/route");
    expect((await GET(makeRequest("/api/admin/umpires/available"))).status).toBe(403);
  });

  it("POST /api/admin/umpires/assign returns 403 for player session", async () => {
    const { POST } = await import("@/app/api/admin/umpires/assign/route");
    expect((await POST(makeRequest("/api/admin/umpires/assign", { method: "POST", body: emptyBody }))).status).toBe(403);
  });

  it("GET  /api/admin/home-gallery returns 403 for player session (requireRole)", async () => {
    const { GET } = await import("@/app/api/admin/home-gallery/route");
    expect((await GET(makeRequest("/api/admin/home-gallery"))).status).toBe(403);
  });

  it("GET  /api/admin/analytics returns 403 for player session", async () => {
    const { GET } = await import("@/app/api/admin/analytics/route");
    expect((await GET(makeRequest("/api/admin/analytics"))).status).toBe(403);
  });

  it("GET  /api/admin/migrate returns 403 for player session", async () => {
    const { GET } = await import("@/app/api/admin/migrate/route");
    expect((await GET(makeRequest("/api/admin/migrate"))).status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 3 — 403 wrong resource scope (authenticated with valid permission,
//          resource access check returns false)
// ─────────────────────────────────────────────────────────────────────────────

describe("X7 — 403 when resource scope does not match", () => {
  /**
   * sessions.associationAdmin has competitions.manage, association.view, etc.
   * The resourceAccessDb mock always returns false, so any association-scoped
   * request receives 403 at the resource-access guard regardless of which
   * association is requested.
   */
  beforeEach(() => {
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue(sessions.associationAdmin("assoc-correct"));
  });

  it("GET  /api/admin/clubs/[id] returns 403 for wrong club scope", async () => {
    const { GET } = await import("@/app/api/admin/clubs/[id]/route");
    const res = await GET(
      makeRequest("/api/admin/clubs/club-wrong"),
      routeParams({ id: "club-wrong" }),
    );
    expect(res.status).toBe(403);
  });

  it("GET  /api/admin/associations/[id]/fees returns 403 for wrong association", async () => {
    const { GET } = await import("@/app/api/admin/associations/[associationId]/fees/route");
    const res = await GET(
      makeRequest("/api/admin/associations/assoc-wrong/fees"),
      routeParams({ associationId: "assoc-wrong" }),
    );
    expect(res.status).toBe(403);
  });

  it("GET  /api/admin/associations/[id]/official-register returns 403 for wrong association", async () => {
    const { GET } = await import("@/app/api/admin/associations/[associationId]/official-register/route");
    const res = await GET(
      makeRequest("/api/admin/associations/assoc-wrong/official-register"),
      routeParams({ associationId: "assoc-wrong" }),
    );
    expect(res.status).toBe(403);
  });

  it("GET  /api/admin/associations/[id]/umpire-payment-lines returns 403 for wrong association", async () => {
    const { GET } = await import("@/app/api/admin/associations/[associationId]/umpire-payment-lines/route");
    const res = await GET(
      makeRequest("/api/admin/associations/assoc-wrong/umpire-payment-lines"),
      routeParams({ associationId: "assoc-wrong" }),
    );
    expect(res.status).toBe(403);
  });

  it("GET  /api/admin/associations/[id]/finance/accounts returns 403 for wrong association", async () => {
    const { GET } = await import("@/app/api/admin/associations/[associationId]/finance/accounts/route");
    const res = await GET(
      makeRequest("/api/admin/associations/assoc-wrong/finance/accounts"),
      routeParams({ associationId: "assoc-wrong" }),
    );
    expect(res.status).toBe(403);
  });

  it("GET  /api/admin/clubs/[id]/members returns 403 for wrong club scope", async () => {
    // Switch to club-admin session for club-scoped resource test
    mockGetSession.mockResolvedValue(sessions.clubAdmin("club-correct"));
    const { GET } = await import("@/app/api/admin/clubs/[id]/members/route");
    const res = await GET(
      makeRequest("/api/admin/clubs/club-wrong/members"),
      routeParams({ id: "club-wrong" }),
    );
    expect(res.status).toBe(403);
  });
});
