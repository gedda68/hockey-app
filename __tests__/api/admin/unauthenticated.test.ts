/**
 * __tests__/api/admin/unauthenticated.test.ts
 *
 * S8(a) — Every /api/admin/** route handler returns 401 when no session exists.
 *
 * Strategy
 * ────────
 * Rather than firing real HTTP requests, we import the actual Next.js route
 * handler functions and call them directly.  This is valid because:
 *   1. Every admin handler calls an auth guard as its very first `await`.
 *   2. Each guard calls `getSession()` and returns a 401 Response immediately
 *      when the result is `null`.
 *   3. No database code is ever reached before the 401, so the MongoDB mock
 *      only needs to exist to satisfy the module-level `clientPromise` import.
 *
 * Routes covered (representative sample across all auth-guard variants):
 *   ┌─ requireRole ─────────────────────────────────────────────────────────┐
 *   │  GET  /api/admin/news                                                 │
 *   │  POST /api/admin/news                                                 │
 *   │  GET  /api/admin/events                                               │
 *   └───────────────────────────────────────────────────────────────────────┘
 *   ┌─ requirePermission ───────────────────────────────────────────────────┐
 *   │  GET  /api/admin/members                                              │
 *   │  POST /api/admin/members                                              │
 *   │  GET  /api/admin/clubs                                                │
 *   │  GET  /api/admin/associations                                         │
 *   │  POST /api/admin/associations                                         │
 *   │  GET  /api/admin/role-requests                                        │
 *   └───────────────────────────────────────────────────────────────────────┘
 *   ┌─ requireAnyPermission ────────────────────────────────────────────────┐
 *   │  GET   /api/admin/associations/[associationId]/communications         │
 *   │  PATCH /api/admin/associations/[associationId]/communications         │
 *   └───────────────────────────────────────────────────────────────────────┘
 *
 * Adding new routes
 * ─────────────────
 * 1. Import the handler at the top of the matching `describe` block.
 * 2. Add an `it("returns 401 …")` call — the body is identical to every
 *    other test in this file.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

// ── Mock getSession BEFORE importing any route handler ────────────────────────
// We do NOT use importOriginal here because lib/auth/session.ts throws at
// module-load time when JWT_SECRET is absent.  We only need getSession() in
// this file, so a minimal stub is sufficient.
vi.mock("@/lib/auth/session", () => ({
  getSession:             vi.fn(),
  createSession:          vi.fn(),
  deleteSession:          vi.fn(),
  attachSessionCookie:    vi.fn(),
  attachSessionCookieHostOnly: vi.fn(),
}));

// ── Mock MongoDB so module-level clientPromise imports don't attempt a real
//    connection when this file loads.  Auth returns 401 before any DB call is
//    made, so the mock implementation is never actually invoked. ────────────────
vi.mock("@/lib/mongodb", () => ({
  default: Promise.resolve({
    db: () => ({
      collection: () => ({
        findOne:    vi.fn().mockResolvedValue(null),
        find:       vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
        insertOne:  vi.fn().mockResolvedValue({ insertedId: "mock-id" }),
        updateOne:  vi.fn().mockResolvedValue({ modifiedCount: 1 }),
        deleteOne:  vi.fn().mockResolvedValue({ deletedCount: 1 }),
        countDocuments: vi.fn().mockResolvedValue(0),
      }),
    }),
  }),
  getDatabaseName: vi.fn().mockReturnValue("hockey-app-test"),
  getDatabase:     vi.fn().mockResolvedValue({
    collection: () => ({
      findOne:    vi.fn().mockResolvedValue(null),
      find:       vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
      insertOne:  vi.fn().mockResolvedValue({ insertedId: "mock-id" }),
      updateOne:  vi.fn().mockResolvedValue({ modifiedCount: 1 }),
      deleteOne:  vi.fn().mockResolvedValue({ deletedCount: 1 }),
      countDocuments: vi.fn().mockResolvedValue(0),
    }),
  }),
}));

// ── Additional mocks for libraries with side-effects on import ────────────────
vi.mock("@/lib/audit/platformAuditLog", () => ({
  logPlatformAudit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/observability/adminTelemetry", () => ({
  adminTelemetryFromRequestLike: vi.fn().mockReturnValue({}),
  logAdminTelemetry:             vi.fn(),
}));
vi.mock("@/lib/auth/resourceAccessDb", () => ({
  userCanAccessClubResource:        vi.fn().mockResolvedValue(false),
  userCanAccessAssociationResource: vi.fn().mockResolvedValue(false),
}));

// ── Imports (after mocks are registered) ─────────────────────────────────────
import { getSession } from "@/lib/auth/session";
import { makeRequest, routeParams } from "@/__tests__/helpers/request";

const mockGetSession = vi.mocked(getSession);

// Reset to null before every test to guarantee the unauthenticated path.
beforeEach(() => {
  mockGetSession.mockReset();
  mockGetSession.mockResolvedValue(null);
});

// ─────────────────────────────────────────────────────────────────────────────
// requireRole routes — /api/admin/news, /api/admin/events
// ─────────────────────────────────────────────────────────────────────────────

describe("requireRole routes — unauthenticated → 401", () => {
  it("GET /api/admin/news returns 401", async () => {
    const { GET } = await import("@/app/api/admin/news/route");
    const res = await GET(makeRequest("/api/admin/news"));
    expect(res.status).toBe(401);
  });

  it("POST /api/admin/news returns 401", async () => {
    const { POST } = await import("@/app/api/admin/news/route");
    const res = await POST(makeRequest("/api/admin/news", { method: "POST", body: {} }));
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/events returns 401", async () => {
    const { GET } = await import("@/app/api/admin/events/route");
    const res = await GET(makeRequest("/api/admin/events"));
    expect(res.status).toBe(401);
  });

  it("POST /api/admin/events returns 401", async () => {
    const { POST } = await import("@/app/api/admin/events/route");
    const res = await POST(makeRequest("/api/admin/events", { method: "POST", body: {} }));
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requirePermission routes — members, clubs, associations, role-requests
// ─────────────────────────────────────────────────────────────────────────────

describe("requirePermission routes — unauthenticated → 401", () => {
  it("GET /api/admin/members returns 401", async () => {
    const { GET } = await import("@/app/api/admin/members/route");
    const res = await GET(makeRequest("/api/admin/members"));
    expect(res.status).toBe(401);
  });

  it("POST /api/admin/members returns 401", async () => {
    const { POST } = await import("@/app/api/admin/members/route");
    const res = await POST(makeRequest("/api/admin/members", { method: "POST", body: {} }));
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/clubs returns 401", async () => {
    const { GET } = await import("@/app/api/admin/clubs/route");
    const res = await GET(makeRequest("/api/admin/clubs"));
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/associations returns 401", async () => {
    const { GET } = await import("@/app/api/admin/associations/route");
    const res = await GET(makeRequest("/api/admin/associations"));
    expect(res.status).toBe(401);
  });

  it("POST /api/admin/associations returns 401", async () => {
    const { POST } = await import("@/app/api/admin/associations/route");
    const res = await POST(makeRequest("/api/admin/associations", { method: "POST", body: {} }));
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/role-requests returns 401", async () => {
    const { GET } = await import("@/app/api/admin/role-requests/route");
    const res = await GET(makeRequest("/api/admin/role-requests"));
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireAnyPermission routes — associations/[id]/communications
// ─────────────────────────────────────────────────────────────────────────────

describe("requireAnyPermission routes — unauthenticated → 401", () => {
  const commsParams = routeParams({ associationId: "assoc-test" });

  it("GET /api/admin/associations/[associationId]/communications returns 401", async () => {
    const { GET } = await import(
      "@/app/api/admin/associations/[associationId]/communications/route"
    );
    const res = await GET(
      makeRequest("/api/admin/associations/assoc-test/communications"),
      commsParams,
    );
    expect(res.status).toBe(401);
  });

  it("PATCH /api/admin/associations/[associationId]/communications returns 401", async () => {
    const { PATCH } = await import(
      "@/app/api/admin/associations/[associationId]/communications/route"
    );
    const res = await PATCH(
      makeRequest("/api/admin/associations/assoc-test/communications", {
        method: "PATCH",
        body:   { weeklyDigestEnabled: true },
      }),
      commsParams,
    );
    expect(res.status).toBe(401);
  });
});
