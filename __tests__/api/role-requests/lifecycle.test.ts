/**
 * __tests__/api/role-requests/lifecycle.test.ts
 *
 * Integration-style tests for the role-request approval lifecycle.
 * Route handlers are imported directly and exercised with mocked DB + session.
 *
 * Covered scenarios:
 *   L1 — POST submit: fee-required role (player)    → status "pending_payment"
 *   L2 — POST submit: no-fee role (coach)           → status "awaiting_approval"
 *   L3 — POST duplicate detection                   → 409 with existingRequestId
 *   L4 — PATCH record_payment                       → advances to "awaiting_approval"
 *   L5 — PATCH approve with fee waiver              → 200 + full FeeWaiver audit trail
 *   L6 — PATCH reject: missing reviewNotes          → 400
 *   L7 — PATCH reject: with reviewNotes             → 200, status "rejected"
 *   L8 — PATCH withdraw: by the requester (self)    → 200
 *   L9 — PATCH withdraw: by an admin                → 200
 *
 * MongoDB is fully mocked — no real connection is attempted.
 * Session is mocked via vi.mocked(getSession).
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

// ── Hoisted mock handles ───────────────────────────────────────────────────────
// vi.hoisted() runs before vi.mock() factories, so these refs are available
// inside the factory closures even though vi.mock() is hoisted itself.

const { mockFindOne, mockInsertOne, mockUpdateOne } = vi.hoisted(() => ({
  mockFindOne:   vi.fn() as Mock,
  mockInsertOne: vi.fn() as Mock,
  mockUpdateOne: vi.fn() as Mock,
}));

// ── Module mocks (must appear before imports) ─────────────────────────────────

// MongoDB — return the same mock collection object for every db.collection() call.
// Individual tests configure findOne / updateOne return values via mockResolvedValueOnce.
vi.mock("@/lib/mongodb", () => ({
  default: Promise.resolve({
    db: () => ({
      collection: () => ({
        findOne:   mockFindOne,
        insertOne: mockInsertOne,
        updateOne: mockUpdateOne,
        find: vi.fn().mockReturnValue({
          sort:    vi.fn().mockReturnThis(),
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  }),
  getDatabaseName: vi.fn().mockReturnValue("hockey-app-test"),
}));

// Session — replaced with a controllable mock.
vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return { ...actual, getSession: vi.fn() };
});

// Auth middleware — always passes the permission check in these lifecycle tests.
// Auth-guard behaviour is tested separately in authMiddleware.test.ts.
vi.mock("@/lib/auth/middleware", () => ({
  requirePermission:    vi.fn().mockResolvedValue({ response: null }),
  requireRole:          vi.fn().mockResolvedValue({ response: null }),
  requireAnyPermission: vi.fn().mockResolvedValue({ response: null }),
  requireResourceAccess: vi.fn().mockResolvedValue({ response: null }),
}));

// Domain privilege helpers — mocked so tests don't depend on DB-backed role
// resolution; privilege rules are exercised in dedicated domain unit tests.
vi.mock("@/lib/domain/roleGrantWorkflow", () => ({
  canApproveRoleRequestPrivilege:       vi.fn().mockReturnValue(true),
  collectGrantorRolesForRoleRequest:    vi.fn().mockResolvedValue(["club-admin"]),
}));

// Email — fire-and-forget; mocked to prevent real sends and silence console errors.
vi.mock("@/lib/email/client", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/email/templates/roleRequestDecision", () => ({
  buildRoleRequestDecisionEmail: vi.fn().mockReturnValue({
    subject: "Test subject",
    html:    "<p>Test</p>",
    text:    "Test",
  }),
}));

// ── Imports (after all mocks are registered) ──────────────────────────────────

import { getSession }      from "@/lib/auth/session";
import { makeRequest, routeParams } from "@/__tests__/helpers/request";
import { sessions }        from "@/__tests__/helpers/session";
import type { RoleRequest } from "@/types/roleRequests";

const mockGetSession = vi.mocked(getSession);

// ── Shared fixture data ───────────────────────────────────────────────────────

/** A minimal member document returned by the account lookup in POST. */
const mockMemberAccount = {
  memberId:     "member-jane",
  personalInfo: { firstName: "Jane", lastName: "Doe" },
};

/** A role request in pending_payment — used as the starting state for L4 & L5. */
const pendingPaymentRequest: RoleRequest = {
  requestId:       "rreq-test-001",
  memberId:        "member-jane",
  accountType:     "member",
  memberName:      "Jane Doe",
  requestedRole:   "player",
  scopeType:       "club",
  scopeId:         "club-chc",
  scopeName:       "Commercial Hockey Club",
  seasonYear:      "2025",
  requestedBy:     "user-jane",
  requestedByName: "Jane Doe",
  requestedAt:     "2025-01-01T00:00:00.000Z",
  requiresFee:     true,
  feeAmountCents:  15000,
  feePaid:         false,
  status:          "pending_payment",
  createdAt:       "2025-01-01T00:00:00.000Z",
  updatedAt:       "2025-01-01T00:00:00.000Z",
};

/** The same request but after payment has been recorded — used for L7 reject tests. */
const awaitingApprovalRequest: RoleRequest = {
  ...pendingPaymentRequest,
  feePaid:   true,
  paymentId: "pay-001",
  status:    "awaiting_approval",
};

// ── L1–L3: POST /api/role-requests ───────────────────────────────────────────

describe("POST /api/role-requests", () => {
  beforeEach(() => {
    // Reset only the hoisted DB mocks so vi.mock() factory implementations
    // (requirePermission, sendEmail, etc.) are preserved across tests.
    mockFindOne.mockReset();
    mockInsertOne.mockReset();
    mockUpdateOne.mockReset();
    mockInsertOne.mockResolvedValue({ insertedId: "mongo-id-1" });
    mockUpdateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
  });

  // L1 ─────────────────────────────────────────────────────────────────────────
  it("L1 — player role (requiresFee) → responds 201 with status pending_payment", async () => {
    mockGetSession.mockResolvedValue(sessions.clubAdmin("club-chc"));

    // Call 1: member account lookup → found
    // Call 2: duplicate role_request check → none found
    mockFindOne
      .mockResolvedValueOnce(mockMemberAccount)
      .mockResolvedValueOnce(null);

    const { POST } = await import("@/app/api/role-requests/route");

    const res = await POST(
      makeRequest("/api/role-requests", {
        method: "POST",
        body: {
          memberId:      "member-jane",
          accountType:   "member",
          requestedRole: "player",
          scopeType:     "club",
          // scopeId intentionally omitted → fee resolution code path skipped;
          // requiresFee is driven by ROLE_DEFINITIONS["player"].requiresFee = true
        },
      }),
    );

    const json = await res.json() as { status: string; requiresFee: boolean; requestId: string };
    expect(res.status).toBe(201);
    expect(json.status).toBe("pending_payment");
    expect(json.requiresFee).toBe(true);
    expect(json.requestId).toMatch(/^rreq-/);
    expect(mockInsertOne).toHaveBeenCalledOnce();
  });

  // L2 ─────────────────────────────────────────────────────────────────────────
  it("L2 — coach role (no fee) → responds 201 with status awaiting_approval", async () => {
    mockGetSession.mockResolvedValue(sessions.clubAdmin("club-chc"));

    mockFindOne
      .mockResolvedValueOnce(mockMemberAccount) // account found
      .mockResolvedValueOnce(null);             // no duplicate

    const { POST } = await import("@/app/api/role-requests/route");

    const res = await POST(
      makeRequest("/api/role-requests", {
        method: "POST",
        body: {
          memberId:      "member-jane",
          accountType:   "member",
          requestedRole: "coach",
          scopeType:     "club",
          // coach.requiresFee = false → status becomes awaiting_approval
        },
      }),
    );

    const json = await res.json() as { status: string; requiresFee: boolean };
    expect(res.status).toBe(201);
    expect(json.status).toBe("awaiting_approval");
    expect(json.requiresFee).toBe(false);
    expect(mockInsertOne).toHaveBeenCalledOnce();
  });

  // L3 ─────────────────────────────────────────────────────────────────────────
  it("L3 — duplicate in-flight request → 409 with existingRequestId", async () => {
    mockGetSession.mockResolvedValue(sessions.clubAdmin("club-chc"));

    mockFindOne
      .mockResolvedValueOnce(mockMemberAccount)          // account lookup
      .mockResolvedValueOnce({ requestId: "rreq-existing-42" }); // ← duplicate found

    const { POST } = await import("@/app/api/role-requests/route");

    const res = await POST(
      makeRequest("/api/role-requests", {
        method: "POST",
        body: {
          memberId:      "member-jane",
          accountType:   "member",
          requestedRole: "player",
          scopeType:     "club",
        },
      }),
    );

    const json = await res.json() as { error: string; existingRequestId: string };
    expect(res.status).toBe(409);
    expect(json.existingRequestId).toBe("rreq-existing-42");
    expect(json.error).toMatch(/open request/i);
    // No insert should occur when a duplicate is detected
    expect(mockInsertOne).not.toHaveBeenCalled();
  });

  // Guard: unauthenticated ─────────────────────────────────────────────────────
  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValue(null);

    const { POST } = await import("@/app/api/role-requests/route");

    const res = await POST(
      makeRequest("/api/role-requests", {
        method: "POST",
        body: { memberId: "m1", accountType: "member", requestedRole: "player", scopeType: "club" },
      }),
    );

    expect(res.status).toBe(401);
  });

  // Guard: unknown role ────────────────────────────────────────────────────────
  it("returns 400 for an unknown role", async () => {
    mockGetSession.mockResolvedValue(sessions.superAdmin());

    const { POST } = await import("@/app/api/role-requests/route");

    const res = await POST(
      makeRequest("/api/role-requests", {
        method: "POST",
        body: { memberId: "m1", accountType: "member", requestedRole: "not-a-real-role", scopeType: "club" },
      }),
    );

    expect(res.status).toBe(400);
  });
});

// ── L4–L9: PATCH /api/admin/role-requests/[requestId] ────────────────────────

describe("PATCH /api/admin/role-requests/[requestId]", () => {
  beforeEach(() => {
    // Reset only the hoisted DB mocks — preserves requirePermission and other
    // vi.mock() factory implementations that must not be cleared between tests.
    mockFindOne.mockReset();
    mockInsertOne.mockReset();
    mockUpdateOne.mockReset();
    mockUpdateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    // Default catch-all: getRecipientInfo fire-and-forget returns null gracefully
    mockFindOne.mockResolvedValue(null);
  });

  // L4 ─────────────────────────────────────────────────────────────────────────
  it("L4 — record_payment advances pending_payment → awaiting_approval", async () => {
    mockGetSession.mockResolvedValue(sessions.superAdmin());

    // Route fetches the request document first
    mockFindOne.mockResolvedValueOnce(pendingPaymentRequest);

    const { PATCH } = await import(
      "@/app/api/admin/role-requests/[requestId]/route"
    );

    const res = await PATCH(
      makeRequest("/api/admin/role-requests/rreq-test-001", {
        method: "PATCH",
        body: {
          action:      "record_payment",
          paymentId:   "pay-stripe-abc123",
          amountCents: 15000,
          paymentDate: "2025-03-15",
        },
      }),
      routeParams({ requestId: "rreq-test-001" }),
    );

    const json = await res.json() as { status: string; message: string };
    expect(res.status).toBe(200);
    expect(json.status).toBe("awaiting_approval");

    // Verify the DB update set feePaid:true and advanced the status
    expect(mockUpdateOne).toHaveBeenCalledOnce();
    const [filter, update] = mockUpdateOne.mock.calls[0] as [
      Record<string, unknown>,
      { $set: Record<string, unknown> },
    ];
    expect(filter).toMatchObject({ requestId: "rreq-test-001" });
    expect(update.$set.feePaid).toBe(true);
    expect(update.$set.status).toBe("awaiting_approval");
    expect(update.$set.paymentId).toBe("pay-stripe-abc123");
  });

  // L4 guard: wrong status ─────────────────────────────────────────────────────
  it("L4 — record_payment on awaiting_approval request → 409", async () => {
    mockGetSession.mockResolvedValue(sessions.superAdmin());

    mockFindOne.mockResolvedValueOnce(awaitingApprovalRequest);

    const { PATCH } = await import(
      "@/app/api/admin/role-requests/[requestId]/route"
    );

    const res = await PATCH(
      makeRequest("/api/admin/role-requests/rreq-test-001", {
        method: "PATCH",
        body: { action: "record_payment", paymentId: "p1", amountCents: 100, paymentDate: "2025-01-01" },
      }),
      routeParams({ requestId: "rreq-test-001" }),
    );

    expect(res.status).toBe(409);
  });

  // L5 ─────────────────────────────────────────────────────────────────────────
  it("L5 — approve with waiver writes full FeeWaiver audit trail", async () => {
    mockGetSession.mockResolvedValue(sessions.superAdmin());

    // Route fetches the request document; remaining mockFindOne calls (email
    // recipient lookup etc.) fall through to the default null return.
    mockFindOne.mockResolvedValueOnce(pendingPaymentRequest);

    const { PATCH } = await import(
      "@/app/api/admin/role-requests/[requestId]/route"
    );

    const WAIVER_REASON = "Life member — board resolution 2025-03-01 passed unanimously";

    const res = await PATCH(
      makeRequest("/api/admin/role-requests/rreq-test-001", {
        method: "PATCH",
        body: {
          action:       "approve",
          waiveFee:     true,
          waiverReason: WAIVER_REASON,
        },
      }),
      routeParams({ requestId: "rreq-test-001" }),
    );

    const json = await res.json() as { status: string; feeWaived: boolean };
    expect(res.status).toBe(200);
    expect(json.status).toBe("approved");
    expect(json.feeWaived).toBe(true);

    // Two updateOne calls expected:
    //   [0] push RoleAssignment to the member's roles[]
    //   [1] mark the role_request as approved + embed FeeWaiver
    expect(mockUpdateOne).toHaveBeenCalledTimes(2);

    // ── Verify the role assignment was pushed ──────────────────────────────────
    const [memberFilter, memberUpdate] = mockUpdateOne.mock.calls[0] as [
      Record<string, unknown>,
      { $push: { roles: Record<string, unknown> } },
    ];
    expect(memberFilter).toMatchObject({ memberId: "member-jane" });
    expect(memberUpdate.$push.roles).toMatchObject({
      role:      "player",
      scopeType: "club",
      scopeId:   "club-chc",
      active:    true,
    });

    // ── Verify the FeeWaiver audit record ─────────────────────────────────────
    const [reqFilter, reqUpdate] = mockUpdateOne.mock.calls[1] as [
      Record<string, unknown>,
      { $set: Record<string, unknown> & { feeWaiver?: Record<string, unknown> } },
    ];
    expect(reqFilter).toMatchObject({ requestId: "rreq-test-001" });
    expect(reqUpdate.$set.status).toBe("approved");
    expect(reqUpdate.$set.feePaid).toBe(true); // waiver counts as paid
    expect(reqUpdate.$set.feeWaiver).toBeDefined();

    const waiver = reqUpdate.$set.feeWaiver as Record<string, unknown>;
    expect(waiver.reason).toBe(WAIVER_REASON);
    expect(waiver.grantedBy).toBe("user-super");       // superAdmin userId
    expect(waiver.grantedByRole).toBe("super-admin");
    expect(typeof waiver.grantedAt).toBe("string");    // ISO timestamp present
  });

  // L5 guard: waiver without reason ────────────────────────────────────────────
  it("L5 — waiveFee:true with missing waiverReason → 400", async () => {
    mockGetSession.mockResolvedValue(sessions.superAdmin());
    mockFindOne.mockResolvedValueOnce(pendingPaymentRequest);

    const { PATCH } = await import(
      "@/app/api/admin/role-requests/[requestId]/route"
    );

    const res = await PATCH(
      makeRequest("/api/admin/role-requests/rreq-test-001", {
        method: "PATCH",
        body: { action: "approve", waiveFee: true }, // no waiverReason
      }),
      routeParams({ requestId: "rreq-test-001" }),
    );

    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/waiverReason/i);
  });

  // L5 guard: waiver reason too short ──────────────────────────────────────────
  it("L5 — waiveFee:true with short waiverReason (<10 chars) → 400", async () => {
    mockGetSession.mockResolvedValue(sessions.superAdmin());
    mockFindOne.mockResolvedValueOnce(pendingPaymentRequest);

    const { PATCH } = await import(
      "@/app/api/admin/role-requests/[requestId]/route"
    );

    const res = await PATCH(
      makeRequest("/api/admin/role-requests/rreq-test-001", {
        method: "PATCH",
        body: { action: "approve", waiveFee: true, waiverReason: "Short" },
      }),
      routeParams({ requestId: "rreq-test-001" }),
    );

    expect(res.status).toBe(400);
  });

  // L5 guard: fee not paid, no waiver ─────────────────────────────────────────
  it("L5 — approve with unpaid fee and no waiver → 409 fee gate", async () => {
    mockGetSession.mockResolvedValue(sessions.superAdmin());
    mockFindOne.mockResolvedValueOnce(pendingPaymentRequest); // feePaid: false

    const { PATCH } = await import(
      "@/app/api/admin/role-requests/[requestId]/route"
    );

    const res = await PATCH(
      makeRequest("/api/admin/role-requests/rreq-test-001", {
        method: "PATCH",
        body: { action: "approve" }, // no waiveFee
      }),
      routeParams({ requestId: "rreq-test-001" }),
    );

    expect(res.status).toBe(409);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/fee must be paid/i);
  });

  // L6 ─────────────────────────────────────────────────────────────────────────
  it("L6 — reject without reviewNotes → 400", async () => {
    mockGetSession.mockResolvedValue(sessions.superAdmin());
    mockFindOne.mockResolvedValueOnce(awaitingApprovalRequest);

    const { PATCH } = await import(
      "@/app/api/admin/role-requests/[requestId]/route"
    );

    const res = await PATCH(
      makeRequest("/api/admin/role-requests/rreq-test-001", {
        method: "PATCH",
        body: { action: "reject" }, // missing reviewNotes
      }),
      routeParams({ requestId: "rreq-test-001" }),
    );

    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/reviewNotes/i);
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  // L7 ─────────────────────────────────────────────────────────────────────────
  it("L7 — reject with reviewNotes → 200, status rejected, reviewer captured", async () => {
    mockGetSession.mockResolvedValue(sessions.superAdmin());
    mockFindOne.mockResolvedValueOnce(awaitingApprovalRequest);

    const { PATCH } = await import(
      "@/app/api/admin/role-requests/[requestId]/route"
    );

    const NOTES = "Insufficient coaching credentials for this season";

    const res = await PATCH(
      makeRequest("/api/admin/role-requests/rreq-test-001", {
        method: "PATCH",
        body: { action: "reject", reviewNotes: NOTES },
      }),
      routeParams({ requestId: "rreq-test-001" }),
    );

    const json = await res.json() as { status: string };
    expect(res.status).toBe(200);
    expect(json.status).toBe("rejected");

    expect(mockUpdateOne).toHaveBeenCalledOnce();
    const [filter, update] = mockUpdateOne.mock.calls[0] as [
      Record<string, unknown>,
      { $set: Record<string, unknown> },
    ];
    expect(filter).toMatchObject({ requestId: "rreq-test-001" });
    expect(update.$set.status).toBe("rejected");
    expect(update.$set.reviewNotes).toBe(NOTES);
    expect(update.$set.reviewedBy).toBe("user-super");
    expect(update.$set.reviewedByName).toBe("Test User");
    expect(typeof update.$set.reviewedAt).toBe("string");
  });

  // L8 ─────────────────────────────────────────────────────────────────────────
  it("L8 — withdraw by requester (self) → 200", async () => {
    // Session userId matches request's requestedBy / memberId
    const selfSession = sessions.player();
    // Override userId to match the request's memberId so the isSelf check passes
    selfSession.userId = "member-jane";

    mockGetSession.mockResolvedValue(selfSession);
    mockFindOne.mockResolvedValueOnce(pendingPaymentRequest);

    const { PATCH } = await import(
      "@/app/api/admin/role-requests/[requestId]/route"
    );

    const res = await PATCH(
      makeRequest("/api/admin/role-requests/rreq-test-001", {
        method: "PATCH",
        body: { action: "withdraw" },
      }),
      routeParams({ requestId: "rreq-test-001" }),
    );

    expect(res.status).toBe(200);
    const json = await res.json() as { message: string };
    expect(json.message).toMatch(/withdrawn/i);

    expect(mockUpdateOne).toHaveBeenCalledOnce();
    const [, update] = mockUpdateOne.mock.calls[0] as [
      unknown,
      { $set: Record<string, unknown> },
    ];
    expect(update.$set.status).toBe("withdrawn");
  });

  // L9 ─────────────────────────────────────────────────────────────────────────
  it("L9 — withdraw by admin (not the requester) → 200", async () => {
    // super-admin is definitely not the requester (memberId: "member-jane")
    mockGetSession.mockResolvedValue(sessions.superAdmin());
    mockFindOne.mockResolvedValueOnce(pendingPaymentRequest);

    const { PATCH } = await import(
      "@/app/api/admin/role-requests/[requestId]/route"
    );

    const res = await PATCH(
      makeRequest("/api/admin/role-requests/rreq-test-001", {
        method: "PATCH",
        body: { action: "withdraw" },
      }),
      routeParams({ requestId: "rreq-test-001" }),
    );

    expect(res.status).toBe(200);

    expect(mockUpdateOne).toHaveBeenCalledOnce();
    const [, update] = mockUpdateOne.mock.calls[0] as [
      unknown,
      { $set: Record<string, unknown> },
    ];
    expect(update.$set.status).toBe("withdrawn");
  });

  // L9 guard: unrelated user cannot withdraw ───────────────────────────────────
  it("L9 — withdraw by unrelated non-admin user → 403", async () => {
    // A player whose userId does NOT match the request's memberId
    const stranger = sessions.player(); // userId: "user-player"
    mockGetSession.mockResolvedValue(stranger);

    mockFindOne.mockResolvedValueOnce(pendingPaymentRequest); // memberId: "member-jane"

    const { PATCH } = await import(
      "@/app/api/admin/role-requests/[requestId]/route"
    );

    const res = await PATCH(
      makeRequest("/api/admin/role-requests/rreq-test-001", {
        method: "PATCH",
        body: { action: "withdraw" },
      }),
      routeParams({ requestId: "rreq-test-001" }),
    );

    expect(res.status).toBe(403);
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  // Terminal state guard ────────────────────────────────────────────────────────
  it("returns 409 when attempting to act on an already-approved request", async () => {
    mockGetSession.mockResolvedValue(sessions.superAdmin());
    mockFindOne.mockResolvedValueOnce({
      ...awaitingApprovalRequest,
      status: "approved",
    });

    const { PATCH } = await import(
      "@/app/api/admin/role-requests/[requestId]/route"
    );

    const res = await PATCH(
      makeRequest("/api/admin/role-requests/rreq-test-001", {
        method: "PATCH",
        body: { action: "reject", reviewNotes: "Too late" },
      }),
      routeParams({ requestId: "rreq-test-001" }),
    );

    expect(res.status).toBe(409);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/already approved/i);
  });

  // Not-found guard ────────────────────────────────────────────────────────────
  it("returns 404 when the requestId does not exist", async () => {
    mockGetSession.mockResolvedValue(sessions.superAdmin());
    mockFindOne.mockResolvedValueOnce(null); // no document found

    const { PATCH } = await import(
      "@/app/api/admin/role-requests/[requestId]/route"
    );

    const res = await PATCH(
      makeRequest("/api/admin/role-requests/rreq-nonexistent", {
        method: "PATCH",
        body: { action: "reject", reviewNotes: "notes" },
      }),
      routeParams({ requestId: "rreq-nonexistent" }),
    );

    expect(res.status).toBe(404);
  });

  // Invalid action guard ────────────────────────────────────────────────────────
  it("returns 400 for an unrecognised action", async () => {
    mockGetSession.mockResolvedValue(sessions.superAdmin());
    mockFindOne.mockResolvedValueOnce(awaitingApprovalRequest);

    const { PATCH } = await import(
      "@/app/api/admin/role-requests/[requestId]/route"
    );

    const res = await PATCH(
      makeRequest("/api/admin/role-requests/rreq-test-001", {
        method: "PATCH",
        body: { action: "nuke" },
      }),
      routeParams({ requestId: "rreq-test-001" }),
    );

    expect(res.status).toBe(400);
  });
});
