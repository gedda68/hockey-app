/**
 * __tests__/api/umpire/assign.test.ts
 *
 * Tests for W3 umpire assignment close-out:
 *   A1  — GET /api/admin/umpires/available: missing params → 400
 *   A2  — GET /api/admin/umpires/available: fixture not found → 404
 *   A3  — GET /api/admin/umpires/available: empty register → empty lists
 *   A4  — GET /api/admin/umpires/available: single official, no blocking → available[]
 *   A5  — POST /api/admin/umpires/assign: fixture not found → 404
 *   A6  — POST /api/admin/umpires/assign: COI blocking, no override → 409
 *   A7  — POST /api/admin/umpires/assign: COI blocking + valid override → 201
 *   A8  — POST /api/admin/umpires/assign: clean official, skipCoiCheck → 201, email sent
 *   A9  — POST /api/admin/umpires/assign: slotIndex provided, updates existing slot
 *   R1  — GET /api/umpire/respond: missing token → 200 html (invalid)
 *   R2  — GET /api/umpire/respond: token not found in DB → 200 html (not found)
 *   R3  — GET /api/umpire/respond: expired token → 200 html (expired)
 *   R4  — GET /api/umpire/respond: already in same state → 200 html (idempotent)
 *   R5  — GET /api/umpire/respond: accept → updates assignment + fixture slot
 *   R6  — GET /api/umpire/respond: decline → updates assignment + fixture slot
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock handles ────────────────────────────────────────────────────

const {
  mockFindOne,
  mockInsertOne,
  mockUpdateOne,
  mockReplaceOne,
  mockFind,
} = vi.hoisted(() => ({
  mockFindOne:   vi.fn() as Mock,
  mockInsertOne: vi.fn() as Mock,
  mockUpdateOne: vi.fn() as Mock,
  mockReplaceOne: vi.fn() as Mock,
  mockFind:      vi.fn() as Mock,
}));

// ── Module mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/mongodb", () => ({
  default: Promise.resolve({
    db: () => ({
      collection: () => ({
        findOne:    mockFindOne,
        insertOne:  mockInsertOne,
        updateOne:  mockUpdateOne,
        replaceOne: mockReplaceOne,
        find:       mockFind,
      }),
    }),
  }),
}));

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...actual,
    getSession: vi.fn().mockResolvedValue({
      userId: "user-admin-1",
      name: "Admin User",
      role: "association-admin",
      memberId: null,
    }),
  };
});

vi.mock("@/lib/auth/middleware", () => ({
  requireAnyPermission: vi.fn().mockResolvedValue({
    response: null,
    user: { userId: "user-admin-1", email: "admin@test.com" },
  }),
  requireResourceAccess: vi.fn().mockResolvedValue({ response: null }),
}));

vi.mock("@/lib/email/client", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  APP_URL: "http://localhost:3000",
}));

vi.mock("@/lib/email/templates/umpireAssignment", () => ({
  buildUmpireAssignmentEmail: vi.fn().mockReturnValue({
    subject: "Umpire assignment",
    html: "<p>Test email</p>",
    text: "Test email",
  }),
}));

// Mock evaluateFixtureUmpireAssignments — default: no blocking issues
const mockEvaluate = vi.fn().mockResolvedValue({ slots: [{ index: 0, umpireId: "mem-u1", blockingIssues: [], warnings: [] }] });

vi.mock("@/lib/officiating/umpireCoiAndAvailability", () => ({
  evaluateFixtureUmpireAssignments: (...args: unknown[]) => mockEvaluate(...args),
  slotHasValidCoiOverride: vi.fn().mockReturnValue(false),
}));

// ── Import route handlers (after mocks) ────────────────────────────────────

import { GET as availableGET } from "@/app/api/admin/umpires/available/route";
import { POST as assignPOST } from "@/app/api/admin/umpires/assign/route";
import { GET as respondGET } from "@/app/api/umpire/respond/route";

// ── Fixtures ────────────────────────────────────────────────────────────────

const FIXTURE_DOC = {
  fixtureId: "fix-001",
  seasonCompetitionId: "sc-2026",
  owningAssociationId: "assoc-1",
  homeTeamId: "team-home",
  awayTeamId: "team-away",
  round: 3,
  scheduledStart: "2026-06-01T10:00:00Z",
  venueName: "Main Oval",
  umpires: [],
};

const OFFICIAL_DOC = {
  officialRecordId: "or-1",
  displayName: "Jane Smith",
  memberId: "mem-u1",
  umpireNumber: "U001",
  primaryClubId: "club-other",
  qualificationCodes: ["level_2"],
  levelLabel: "Level 2",
  allocationAvailability: "available",
  associationId: "assoc-1",
  isActive: true,
};

const MEMBER_DOC = {
  memberId: "mem-u1",
  contact: { email: "jane@example.com" },
};

const VALID_TOKEN = "a".repeat(64);

const ASSIGNMENT_DOC = {
  assignmentId: "ua-abc",
  fixtureId: "fix-001",
  seasonCompetitionId: "sc-2026",
  associationId: "assoc-1",
  slotIndex: 0,
  umpireId: "mem-u1",
  umpireType: "Match Umpire 1",
  allocationStatus: "assigned",
  responseToken: VALID_TOKEN,
  tokenExpiresAt: new Date(Date.now() + 14 * 86400_000).toISOString(),
  umpireDisplayName: "Jane Smith",
  round: 3,
};

function makeReq(url: string, method = "GET", body?: unknown): NextRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const init: any = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "content-type": "application/json" };
  }
  return new NextRequest(url, init);
}

// ── Reset mocks before each test ────────────────────────────────────────────

beforeEach(() => {
  mockFindOne.mockReset();
  mockInsertOne.mockReset();
  mockUpdateOne.mockReset();
  mockReplaceOne.mockReset();
  mockFind.mockReset();
  mockFind.mockReturnValue({
    sort:    vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
  });
  mockEvaluate.mockResolvedValue({
    slots: [{ index: 0, umpireId: "mem-u1", blockingIssues: [], warnings: [] }],
  });
});

// ── GET /api/admin/umpires/available ────────────────────────────────────────

describe("GET /api/admin/umpires/available", () => {
  it("A1 — missing params returns 400", async () => {
    const req = makeReq("http://localhost/api/admin/umpires/available");
    const res = await availableGET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/required/i);
  });

  it("A2 — fixture not found returns 404", async () => {
    mockFindOne.mockResolvedValueOnce(null); // fixture lookup
    const req = makeReq(
      "http://localhost/api/admin/umpires/available?fixtureId=fix-001&seasonCompetitionId=sc-2026",
    );
    const res = await availableGET(req);
    expect(res.status).toBe(404);
  });

  it("A3 — empty register returns empty lists", async () => {
    mockFindOne.mockResolvedValueOnce(FIXTURE_DOC);
    // register find returns empty
    mockFind.mockReturnValue({
      sort:    vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    });
    const req = makeReq(
      "http://localhost/api/admin/umpires/available?fixtureId=fix-001&seasonCompetitionId=sc-2026",
    );
    const res = await availableGET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.available).toHaveLength(0);
    expect(body.hasWarnings).toHaveLength(0);
    expect(body.blocked).toHaveLength(0);
  });

  it("A4 — clean official lands in available[]", async () => {
    mockFindOne.mockResolvedValueOnce(FIXTURE_DOC);
    mockFind.mockReturnValue({
      sort:    vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([OFFICIAL_DOC]),
    });
    // evaluateFixtureUmpireAssignments returns no issues (default mock)
    const req = makeReq(
      "http://localhost/api/admin/umpires/available?fixtureId=fix-001&seasonCompetitionId=sc-2026",
    );
    const res = await availableGET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.available).toHaveLength(1);
    expect(body.available[0].displayName).toBe("Jane Smith");
    expect(body.available[0].umpireId).toBe("mem-u1");
    expect(body.blocked).toHaveLength(0);
  });
});

// ── POST /api/admin/umpires/assign ──────────────────────────────────────────

describe("POST /api/admin/umpires/assign", () => {
  it("A5 — fixture not found returns 404", async () => {
    mockFindOne.mockResolvedValueOnce(null);
    const req = makeReq("http://localhost/api/admin/umpires/assign", "POST", {
      fixtureId: "fix-missing",
      seasonCompetitionId: "sc-2026",
      umpireId: "mem-u1",
      umpireType: "Match Umpire 1",
    });
    const res = await assignPOST(req);
    expect(res.status).toBe(404);
  });

  it("A6 — COI blocking without override returns 409", async () => {
    mockFindOne.mockResolvedValueOnce(FIXTURE_DOC);
    mockEvaluate.mockResolvedValueOnce({
      slots: [{
        index: 0,
        umpireId: "mem-u1",
        blockingIssues: [{ code: "own_club", severity: "block", message: "Club match" }],
        warnings: [],
      }],
    });
    const req = makeReq("http://localhost/api/admin/umpires/assign", "POST", {
      fixtureId: "fix-001",
      seasonCompetitionId: "sc-2026",
      umpireId: "mem-u1",
      umpireType: "Match Umpire 1",
    });
    const res = await assignPOST(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.blockingIssues).toHaveLength(1);
  });

  it("A7 — COI block + valid override → 201", async () => {
    const { slotHasValidCoiOverride } = await import(
      "@/lib/officiating/umpireCoiAndAvailability"
    );
    (slotHasValidCoiOverride as Mock).mockReturnValueOnce(true);

    mockFindOne
      .mockResolvedValueOnce(FIXTURE_DOC)       // fixture
      .mockResolvedValueOnce(OFFICIAL_DOC)      // register for contact
      .mockResolvedValueOnce(MEMBER_DOC);       // member doc

    mockEvaluate.mockResolvedValueOnce({
      slots: [{
        index: 0,
        umpireId: "mem-u1",
        blockingIssues: [{ code: "own_club", severity: "block", message: "Club match" }],
        warnings: [],
      }],
    });

    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    mockReplaceOne.mockResolvedValue({ upsertedCount: 1 });

    const req = makeReq("http://localhost/api/admin/umpires/assign", "POST", {
      fixtureId: "fix-001",
      seasonCompetitionId: "sc-2026",
      umpireId: "mem-u1",
      umpireType: "Match Umpire 1",
      coiOverride: true,
      coiOverrideReason: "No other official available for this round",
    });
    const res = await assignPOST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.allocationStatus).toBe("assigned");
    expect(body.assignmentId).toMatch(/^ua-/);
  });

  it("A8 — clean assign with skipCoiCheck, email sent → 201", async () => {
    mockFindOne
      .mockResolvedValueOnce(FIXTURE_DOC)   // fixture
      .mockResolvedValueOnce(OFFICIAL_DOC)  // register
      .mockResolvedValueOnce(MEMBER_DOC);   // member

    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    mockReplaceOne.mockResolvedValue({ upsertedCount: 1 });

    const req = makeReq("http://localhost/api/admin/umpires/assign", "POST", {
      fixtureId: "fix-001",
      seasonCompetitionId: "sc-2026",
      umpireId: "mem-u1",
      umpireType: "Match Umpire 1",
      skipCoiCheck: true,
    });
    const res = await assignPOST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.emailSent).toBe(true);
    expect(body.officialEmail).toBe("jane@example.com");
  });

  it("A9 — explicit slotIndex updates existing slot in-place", async () => {
    const fixtureWithSlot = {
      ...FIXTURE_DOC,
      umpires: [
        { umpireType: "Match Umpire 1", umpireId: "old-u", allocationStatus: "assigned" },
      ],
    };
    mockFindOne
      .mockResolvedValueOnce(fixtureWithSlot)
      .mockResolvedValueOnce(OFFICIAL_DOC)
      .mockResolvedValueOnce(MEMBER_DOC);

    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    mockReplaceOne.mockResolvedValue({ upsertedCount: 1 });

    const req = makeReq("http://localhost/api/admin/umpires/assign", "POST", {
      fixtureId: "fix-001",
      seasonCompetitionId: "sc-2026",
      umpireId: "mem-u1",
      umpireType: "Match Umpire 1",
      slotIndex: 0,
      skipCoiCheck: true,
    });
    const res = await assignPOST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.slotIndex).toBe(0); // updated in-place, not appended
  });
});

// ── GET /api/umpire/respond ─────────────────────────────────────────────────

describe("GET /api/umpire/respond", () => {
  it("R1 — missing/short token returns 200 with invalid-link HTML", async () => {
    const req = makeReq("http://localhost/api/umpire/respond?token=short&action=accept");
    const res = await respondGET(req);
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toMatch(/invalid/i);
  });

  it("R2 — token not in DB returns 200 with not-found HTML", async () => {
    mockFindOne.mockResolvedValueOnce(null);
    const req = makeReq(
      `http://localhost/api/umpire/respond?token=${VALID_TOKEN}&action=accept`,
    );
    const res = await respondGET(req);
    expect(res.status).toBe(404);
    const text = await res.text();
    expect(text).toMatch(/not found|couldn't find/i);
  });

  it("R3 — expired token returns 410 with expired HTML", async () => {
    const expired = {
      ...ASSIGNMENT_DOC,
      tokenExpiresAt: new Date(Date.now() - 1000).toISOString(), // already past
    };
    mockFindOne.mockResolvedValueOnce(expired);
    const req = makeReq(
      `http://localhost/api/umpire/respond?token=${VALID_TOKEN}&action=accept`,
    );
    const res = await respondGET(req);
    expect(res.status).toBe(410);
    const text = await res.text();
    expect(text).toMatch(/expir/i);
  });

  it("R4 — already accepted + accept action → idempotent 200", async () => {
    mockFindOne.mockResolvedValueOnce({
      ...ASSIGNMENT_DOC,
      allocationStatus: "accepted",
    });
    const req = makeReq(
      `http://localhost/api/umpire/respond?token=${VALID_TOKEN}&action=accept`,
    );
    const res = await respondGET(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/already/i);
    // No DB writes for idempotent response
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it("R5 — accept: updates assignment + fixture slot, returns 200", async () => {
    mockFindOne
      .mockResolvedValueOnce(ASSIGNMENT_DOC)   // assignment lookup
      .mockResolvedValueOnce({                  // fixture lookup for slot mirror
        ...FIXTURE_DOC,
        umpires: [{ umpireType: "Match Umpire 1", umpireId: "mem-u1", allocationStatus: "assigned" }],
      });
    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });

    const req = makeReq(
      `http://localhost/api/umpire/respond?token=${VALID_TOKEN}&action=accept`,
    );
    const res = await respondGET(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/accept/i);
    // Should have called updateOne twice: once for assignment, once for fixture
    expect(mockUpdateOne).toHaveBeenCalledTimes(2);
    const firstCall = mockUpdateOne.mock.calls[0][1] as { $set: Record<string, unknown> };
    expect(firstCall.$set.allocationStatus).toBe("accepted");
  });

  it("R6 — decline: updates assignment + fixture slot, returns 200", async () => {
    mockFindOne
      .mockResolvedValueOnce(ASSIGNMENT_DOC)
      .mockResolvedValueOnce({
        ...FIXTURE_DOC,
        umpires: [{ umpireType: "Match Umpire 1", umpireId: "mem-u1", allocationStatus: "assigned" }],
      });
    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });

    const req = makeReq(
      `http://localhost/api/umpire/respond?token=${VALID_TOKEN}&action=decline`,
    );
    const res = await respondGET(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/declin/i);
    expect(mockUpdateOne).toHaveBeenCalledTimes(2);
    const firstCall = mockUpdateOne.mock.calls[0][1] as { $set: Record<string, unknown> };
    expect(firstCall.$set.allocationStatus).toBe("declined");
  });
});
