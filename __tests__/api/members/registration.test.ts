/**
 * __tests__/api/members/registration.test.ts
 *
 * Integration tests for member creation routes and category validation.
 *
 * Covered scenarios:
 *
 *   validateMembershipCategories (pure-function unit tests — no DB)
 *     V1  — empty list                          → valid
 *     V2  — single playing-age category         → valid
 *     V3  — junior + senior player              → error (mutual exclusion)
 *     V4  — junior + masters player             → error
 *     V5  — senior + umpire + volunteer         → valid (non-playing cats are fine)
 *     V6  — three playing-age cats              → error (one error, not two)
 *     V7  — all non-playing cats                → valid
 *
 *   POST /api/admin/members
 *     M1  — valid body                          → 201, correct memberId format, member fields
 *     M2  — missing clubId                      → 400
 *     M3  — missing firstName                   → 400
 *     M4  — missing dateOfBirth                 → 400
 *     M5  — missing email                       → 400
 *     M6  — missing emergencyContact.name       → 400
 *     M7  — club not found                      → 404
 *     M8  — displayName auto-generated          → 201, displayName = "Jane Doe"
 *
 *   POST /api/clubs/[clubId]/members
 *     C1  — valid body                          → 200, memberId assigned
 *     C2  — club not found (by slug)            → 404
 *     C3  — duplicate ID polling: first taken   → increments and uses next available ID
 *     C4  — family relationships: reverse link written via updateOne
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

// ── Hoisted DB mock handles ───────────────────────────────────────────────────
// Created via vi.hoisted() so they are available inside the vi.mock() factory
// closures even though vi.mock() itself is hoisted above all imports.

const { mockFindOne, mockFindOneAndUpdate, mockInsertOne, mockUpdateOne } =
  vi.hoisted(() => ({
    mockFindOne:          vi.fn() as Mock,
    mockFindOneAndUpdate: vi.fn() as Mock,
    mockInsertOne:        vi.fn() as Mock,
    mockUpdateOne:        vi.fn() as Mock,
  }));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/mongodb", () => ({
  default: Promise.resolve({
    db: () => ({
      collection: () => ({
        findOne:          mockFindOne,
        findOneAndUpdate: mockFindOneAndUpdate,
        insertOne:        mockInsertOne,
        updateOne:        mockUpdateOne,
        find: vi.fn().mockReturnValue({
          sort:    vi.fn().mockReturnThis(),
          skip:    vi.fn().mockReturnThis(),
          limit:   vi.fn().mockReturnThis(),
          project: vi.fn().mockReturnThis(),
          toArray: vi.fn().mockResolvedValue([]),
        }),
        countDocuments: vi.fn().mockResolvedValue(0),
      }),
    }),
  }),
  getDatabaseName: vi.fn().mockReturnValue("hockey-app-test"),
}));

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return { ...actual, getSession: vi.fn() };
});

// All auth/middleware guards pass in these tests.
// Auth-guard correctness is covered by authMiddleware.test.ts.
vi.mock("@/lib/auth/middleware", () => ({
  requirePermission:    vi.fn().mockResolvedValue({ response: null, user: { role: "club-admin", clubId: "chc" } }),
  requireAnyPermission: vi.fn().mockResolvedValue({ response: null }),
  requireRole:          vi.fn().mockResolvedValue({ response: null }),
  requireResourceAccess: vi.fn().mockResolvedValue({ response: null }),
}));

// resourceAccessDb — not exercised by these tests; stub out to silence imports.
vi.mock("@/lib/auth/resourceAccessDb", () => ({
  userCanAccessClubResource: vi.fn().mockResolvedValue(true),
}));

// ── Imports (after all mocks are registered) ──────────────────────────────────

import { getSession }                  from "@/lib/auth/session";
import { validateMembershipCategories } from "@/lib/types/roles";
import { makeRequest, routeParams }    from "@/__tests__/helpers/request";
import { sessions }                    from "@/__tests__/helpers/session";

const mockGetSession = vi.mocked(getSession);

// ── Shared fixtures ───────────────────────────────────────────────────────────

/** Minimal club document returned by findOne for "chc". */
const mockClub = {
  id:                  "chc",
  slug:                "chc",
  shortName:           "CHC",
  parentAssociationId: "assoc-1",
};

/** The smallest valid body for POST /api/admin/members. */
const validAdminBody = {
  clubId: "chc",
  personalInfo: {
    firstName:   "Jane",
    lastName:    "Doe",
    dateOfBirth: "1990-06-15",
    gender:      "female",
  },
  contact: {
    email: "jane@example.com",
    emergencyContact: {
      name:         "John Doe",
      relationship: "Spouse",
      phone:        "0411111111",
    },
  },
};

/** The smallest valid body for POST /api/clubs/[clubId]/members. */
const validClubBody = {
  personalInfo: {
    firstName:   "Sam",
    lastName:    "Smith",
    dateOfBirth: "2005-03-20",
  },
  contact: {
    email: "sam@example.com",
    emergencyContact: { name: "Pat Smith", phone: "0422222222" },
  },
  address:              {},
  membership:           { membershipTypes: ["junior-player"] },
  roles:                [],
  familyRelationships:  [],
};

// ─────────────────────────────────────────────────────────────────────────────
// validateMembershipCategories — pure-function unit tests (no mocks needed)
// ─────────────────────────────────────────────────────────────────────────────

describe("validateMembershipCategories", () => {
  it("V1 — empty list → valid", () => {
    expect(validateMembershipCategories([])).toEqual([]);
  });

  it("V2 — single playing-age category → valid", () => {
    expect(validateMembershipCategories(["senior-player"])).toEqual([]);
  });

  it("V3 — junior-player + senior-player → one mutual-exclusion error", () => {
    const errors = validateMembershipCategories(["junior-player", "senior-player"]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/junior-player/);
    expect(errors[0]).toMatch(/senior-player/);
  });

  it("V4 — junior-player + masters-player → error", () => {
    const errors = validateMembershipCategories(["junior-player", "masters-player"]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/masters-player/);
  });

  it("V5 — senior-player + umpire + volunteer → valid (non-playing categories allowed)", () => {
    expect(
      validateMembershipCategories(["senior-player", "umpire", "volunteer"]),
    ).toEqual([]);
  });

  it("V6 — all three playing-age categories → exactly one error", () => {
    const errors = validateMembershipCategories([
      "junior-player",
      "senior-player",
      "masters-player",
    ]);
    // Should flag one violation, not one per pair
    expect(errors).toHaveLength(1);
  });

  it("V7 — all non-playing categories → valid", () => {
    expect(
      validateMembershipCategories(["social", "life", "supporter", "volunteer"]),
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/members
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/admin/members", () => {
  beforeEach(() => {
    // Reset only hoisted DB mocks; factory-level middleware mocks are preserved.
    mockFindOne.mockReset();
    mockFindOneAndUpdate.mockReset();
    mockInsertOne.mockReset();
    mockUpdateOne.mockReset();

    mockGetSession.mockResolvedValue(sessions.clubAdmin("chc", "chc"));
    mockInsertOne.mockResolvedValue({ insertedId: "mongo-new-id" });
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it("M1 — valid body → 201 with correct memberId format and key member fields", async () => {
    // Call 1: POST clubs.findOne($or slug/id) — club lookup
    // Call 2: generateMemberId clubs.findOne({id}) — sequence fetch
    mockFindOne
      .mockResolvedValueOnce(mockClub)
      .mockResolvedValueOnce(mockClub);

    // generateMemberId increments sequence to 7 via findOneAndUpdate
    mockFindOneAndUpdate.mockResolvedValue({ value: { memberSequence: 7 } });

    const { POST } = await import("@/app/api/admin/members/route");

    const res = await POST(
      makeRequest("/api/admin/members", { method: "POST", body: validAdminBody }),
    );

    const json = await res.json() as {
      message: string;
      member: {
        memberId: string;
        clubId: string;
        personalInfo: { firstName: string; lastName: string };
        contact: { email: string };
        createdBy: string;
      };
    };

    expect(res.status).toBe(201);
    expect(json.message).toMatch(/created successfully/i);

    // memberId must follow the CHC-NNNNNNN pattern
    expect(json.member.memberId).toBe("CHC-0000007");
    expect(json.member.clubId).toBe("chc");
    expect(json.member.personalInfo.firstName).toBe("Jane");
    expect(json.member.personalInfo.lastName).toBe("Doe");
    // email normalised to lowercase
    expect(json.member.contact.email).toBe("jane@example.com");

    expect(mockInsertOne).toHaveBeenCalledOnce();
  });

  it("M8 — displayName auto-generated from first + last when not supplied", async () => {
    mockFindOne
      .mockResolvedValueOnce(mockClub)
      .mockResolvedValueOnce(mockClub);
    mockFindOneAndUpdate.mockResolvedValue({ value: { memberSequence: 1 } });

    const { POST } = await import("@/app/api/admin/members/route");

    const res = await POST(
      makeRequest("/api/admin/members", { method: "POST", body: validAdminBody }),
    );

    const json = await res.json() as { member: { personalInfo: { displayName: string } } };
    expect(res.status).toBe(201);
    expect(json.member.personalInfo.displayName).toBe("Jane Doe");
  });

  // ── Validation guards ──────────────────────────────────────────────────────

  it("M2 — missing clubId → 400", async () => {
    const { POST } = await import("@/app/api/admin/members/route");

    const res = await POST(
      makeRequest("/api/admin/members", {
        method: "POST",
        body: { ...validAdminBody, clubId: undefined },
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/club id/i);
    expect(mockInsertOne).not.toHaveBeenCalled();
  });

  it("M3 — missing firstName → 400", async () => {
    const { POST } = await import("@/app/api/admin/members/route");

    const res = await POST(
      makeRequest("/api/admin/members", {
        method: "POST",
        body: {
          ...validAdminBody,
          personalInfo: { ...validAdminBody.personalInfo, firstName: "" },
        },
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/first name/i);
  });

  it("M4 — missing dateOfBirth → 400", async () => {
    const { POST } = await import("@/app/api/admin/members/route");

    const res = await POST(
      makeRequest("/api/admin/members", {
        method: "POST",
        body: {
          ...validAdminBody,
          personalInfo: { ...validAdminBody.personalInfo, dateOfBirth: undefined },
        },
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/date of birth/i);
  });

  it("M5 — missing email → 400", async () => {
    const { POST } = await import("@/app/api/admin/members/route");

    const res = await POST(
      makeRequest("/api/admin/members", {
        method: "POST",
        body: {
          ...validAdminBody,
          contact: { ...validAdminBody.contact, email: undefined },
        },
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/email/i);
  });

  it("M6 — missing emergencyContact.name → 400", async () => {
    const { POST } = await import("@/app/api/admin/members/route");

    const res = await POST(
      makeRequest("/api/admin/members", {
        method: "POST",
        body: {
          ...validAdminBody,
          contact: {
            ...validAdminBody.contact,
            emergencyContact: { ...validAdminBody.contact.emergencyContact, name: undefined },
          },
        },
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/emergency contact/i);
  });

  it("M7 — club not found → 404", async () => {
    // requireResourceAccess passes (mocked), then club lookup returns null
    mockFindOne.mockResolvedValueOnce(null);

    const { POST } = await import("@/app/api/admin/members/route");

    const res = await POST(
      makeRequest("/api/admin/members", { method: "POST", body: validAdminBody }),
    );

    expect(res.status).toBe(404);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/club not found/i);
    expect(mockInsertOne).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/clubs/[clubId]/members
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/clubs/[clubId]/members", () => {
  beforeEach(() => {
    mockFindOne.mockReset();
    mockFindOneAndUpdate.mockReset();
    mockInsertOne.mockReset();
    mockUpdateOne.mockReset();

    mockInsertOne.mockResolvedValue({ insertedId: "mongo-club-id" });
    mockUpdateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it("C1 — valid body → 200 with memberId assigned from club shortName", async () => {
    // Call 1: clubs.findOne({ slug: "chc" }) → club found
    // Call 2: members.findOne({ memberId: "CHC-0000001" }) → null (ID available)
    mockFindOne
      .mockResolvedValueOnce(mockClub)
      .mockResolvedValueOnce(null);

    const { POST } = await import("@/app/api/clubs/[clubId]/members/route");

    const res = await POST(
      makeRequest("/api/clubs/chc/members", { method: "POST", body: validClubBody }),
      routeParams({ clubId: "chc" }),
    );

    const json = await res.json() as { memberId: string; clubId: string };
    expect(res.status).toBe(200);
    expect(json.memberId).toBe("CHC-0000001");
    expect(json.clubId).toBe("chc");
    expect(mockInsertOne).toHaveBeenCalledOnce();
  });

  it("C2 — club not found (slug not in DB) → 404", async () => {
    mockFindOne.mockResolvedValueOnce(null); // clubs.findOne returns null

    const { POST } = await import("@/app/api/clubs/[clubId]/members/route");

    const res = await POST(
      makeRequest("/api/clubs/unknown-club/members", { method: "POST", body: validClubBody }),
      routeParams({ clubId: "unknown-club" }),
    );

    expect(res.status).toBe(404);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/club not found/i);
    expect(mockInsertOne).not.toHaveBeenCalled();
  });

  // ── Duplicate memberId guard ───────────────────────────────────────────────

  it("C3 — first ID taken: getNextAvailableMemberId polls until a free slot is found", async () => {
    // clubs.findOne({ slug: "chc" }) → club
    // members.findOne("CHC-0000001") → existing doc (taken)
    // members.findOne("CHC-0000002") → null (available)
    mockFindOne
      .mockResolvedValueOnce(mockClub)              // club lookup
      .mockResolvedValueOnce({ memberId: "CHC-0000001" }) // sequence 1 taken
      .mockResolvedValueOnce(null);                  // sequence 2 available

    const { POST } = await import("@/app/api/clubs/[clubId]/members/route");

    const res = await POST(
      makeRequest("/api/clubs/chc/members", { method: "POST", body: validClubBody }),
      routeParams({ clubId: "chc" }),
    );

    const json = await res.json() as { memberId: string };
    expect(res.status).toBe(200);
    // Must have skipped CHC-0000001 and assigned CHC-0000002
    expect(json.memberId).toBe("CHC-0000002");
    // findOne called 3 times: 1 club + 2 ID checks
    expect(mockFindOne).toHaveBeenCalledTimes(3);
  });

  it("C3 extended — multiple collisions resolved in order (3 IDs taken)", async () => {
    mockFindOne
      .mockResolvedValueOnce(mockClub)                      // club
      .mockResolvedValueOnce({ memberId: "CHC-0000001" })   // taken
      .mockResolvedValueOnce({ memberId: "CHC-0000002" })   // taken
      .mockResolvedValueOnce({ memberId: "CHC-0000003" })   // taken
      .mockResolvedValueOnce(null);                          // CHC-0000004 free

    const { POST } = await import("@/app/api/clubs/[clubId]/members/route");

    const res = await POST(
      makeRequest("/api/clubs/chc/members", { method: "POST", body: validClubBody }),
      routeParams({ clubId: "chc" }),
    );

    const json = await res.json() as { memberId: string };
    expect(res.status).toBe(200);
    expect(json.memberId).toBe("CHC-0000004");
  });

  // ── Family relationship reverse-link ──────────────────────────────────────

  it("C4 — family relationship in body causes reverse updateOne on the related member", async () => {
    mockFindOne
      .mockResolvedValueOnce(mockClub) // club lookup
      .mockResolvedValueOnce(null);    // ID available

    const bodyWithFamily = {
      ...validClubBody,
      familyRelationships: [
        {
          relatedMemberId:  "CHC-0000099",
          relationshipType: "parent-child",
          forwardRelation:  "parent",
          reverseRelation:  "child",
        },
      ],
    };

    const { POST } = await import("@/app/api/clubs/[clubId]/members/route");

    const res = await POST(
      makeRequest("/api/clubs/chc/members", { method: "POST", body: bodyWithFamily }),
      routeParams({ clubId: "chc" }),
    );

    expect(res.status).toBe(200);

    // A reverse relationship must be written to the related member document
    expect(mockUpdateOne).toHaveBeenCalledOnce();
    const [filter, update] = mockUpdateOne.mock.calls[0] as [
      Record<string, unknown>,
      { $push: { familyRelationships: Record<string, unknown> } },
    ];
    expect(filter).toMatchObject({ memberId: "CHC-0000099" });
    // The route swaps forwardRelation ↔ reverseRelation for the reverse link
    // (the related member's perspective: they are the "child" looking at the new member)
    expect(update.$push.familyRelationships).toMatchObject({
      relatedMemberId: "CHC-0000001", // newly created member
      forwardRelation: "child",       // = original reverseRelation, swapped
      reverseRelation: "parent",      // = original forwardRelation, swapped
    });
  });

  it("C4 — no family relationships → updateOne never called", async () => {
    mockFindOne
      .mockResolvedValueOnce(mockClub)
      .mockResolvedValueOnce(null);

    const { POST } = await import("@/app/api/clubs/[clubId]/members/route");

    await POST(
      makeRequest("/api/clubs/chc/members", { method: "POST", body: validClubBody }),
      routeParams({ clubId: "chc" }),
    );

    expect(mockUpdateOne).not.toHaveBeenCalled();
  });
});
