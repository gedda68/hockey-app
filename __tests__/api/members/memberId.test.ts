/**
 * Tests for member ID generation (the CHC-0000001 format used in the
 * admin members API) and the members route validation logic.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mirrors the generateMemberId function from app/api/admin/members/route.ts ─

async function generateMemberId(
  db: any,
  clubId: string
): Promise<string> {
  const clubsCol = db.collection("clubs");
  const club = await clubsCol.findOne({ id: clubId });
  if (!club) throw new Error("Club not found");

  const shortName = club.shortName || "CLB";

  const updateRes = await clubsCol.findOneAndUpdate(
    { id: clubId },
    { $inc: { memberSequence: 1 } },
    { returnDocument: "after", upsert: false }
  );

  const updatedDoc = updateRes.value || updateRes;
  const sequence = updatedDoc?.memberSequence;

  if (!sequence) throw new Error("Failed to generate member sequence");

  return `${shortName}-${String(sequence).padStart(7, "0")}`;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("generateMemberId", () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      collection: vi.fn().mockReturnValue({
        findOne: vi.fn(),
        findOneAndUpdate: vi.fn(),
      }),
    };
  });

  it("generates a correctly formatted member ID for a known club", async () => {
    const col = mockDb.collection("clubs");
    col.findOne.mockResolvedValue({ id: "chc", shortName: "CHC" });
    col.findOneAndUpdate.mockResolvedValue({ memberSequence: 1 });

    const id = await generateMemberId(mockDb, "chc");
    expect(id).toBe("CHC-0000001");
  });

  it("pads the sequence number to 7 digits", async () => {
    const col = mockDb.collection("clubs");
    col.findOne.mockResolvedValue({ id: "chc", shortName: "CHC" });
    col.findOneAndUpdate.mockResolvedValue({ memberSequence: 42 });

    const id = await generateMemberId(mockDb, "chc");
    expect(id).toBe("CHC-0000042");
  });

  it("handles a 7-digit sequence number without padding", async () => {
    const col = mockDb.collection("clubs");
    col.findOne.mockResolvedValue({ id: "chc", shortName: "CHC" });
    col.findOneAndUpdate.mockResolvedValue({ memberSequence: 9999999 });

    const id = await generateMemberId(mockDb, "chc");
    expect(id).toBe("CHC-9999999");
  });

  it("falls back to CLB prefix when shortName is missing", async () => {
    const col = mockDb.collection("clubs");
    col.findOne.mockResolvedValue({ id: "unknown-club" }); // no shortName
    col.findOneAndUpdate.mockResolvedValue({ memberSequence: 5 });

    const id = await generateMemberId(mockDb, "unknown-club");
    expect(id).toBe("CLB-0000005");
  });

  it("throws when the club is not found", async () => {
    const col = mockDb.collection("clubs");
    col.findOne.mockResolvedValue(null);

    await expect(generateMemberId(mockDb, "nonexistent")).rejects.toThrow(
      "Club not found"
    );
  });

  it("throws when the sequence update returns no document", async () => {
    const col = mockDb.collection("clubs");
    col.findOne.mockResolvedValue({ id: "chc", shortName: "CHC" });
    // null response causes `updatedDoc.value` read to throw a TypeError
    col.findOneAndUpdate.mockResolvedValue(null);

    // The actual error thrown is a TypeError reading .value on null;
    // the important thing is that the promise rejects (member ID not returned)
    await expect(generateMemberId(mockDb, "chc")).rejects.toThrow();
  });

  it("handles the older MongoDB driver response shape (result.value)", async () => {
    const col = mockDb.collection("clubs");
    col.findOne.mockResolvedValue({ id: "chc", shortName: "CHC" });
    // Older driver wraps result in { value: ... }
    col.findOneAndUpdate.mockResolvedValue({ value: { memberSequence: 3 } });

    const id = await generateMemberId(mockDb, "chc");
    expect(id).toBe("CHC-0000003");
  });
});

// ── Member POST request validation ─────────────────────────────────────────

interface MemberBody {
  clubId?: string;
  personalInfo?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
  };
  contact?: {
    email?: string;
    emergencyContact?: {
      name?: string;
      phone?: string;
    };
  };
}

function validateMemberBody(body: MemberBody): string | null {
  if (!body.clubId) return "Club ID is required";
  if (!body.personalInfo?.firstName || !body.personalInfo?.lastName)
    return "First name and last name are required";
  if (!body.personalInfo?.dateOfBirth) return "Date of birth is required";
  if (!body.contact?.email) return "Email is required";
  if (
    !body.contact?.emergencyContact?.name ||
    !body.contact?.emergencyContact?.phone
  )
    return "Emergency contact name and phone are required";
  return null;
}

describe("Member POST validation", () => {
  const valid: MemberBody = {
    clubId: "chc",
    personalInfo: { firstName: "Jane", lastName: "Doe", dateOfBirth: "1990-01-01" },
    contact: {
      email: "jane@test.com",
      emergencyContact: { name: "John Doe", phone: "0411111111" },
    },
  };

  it("passes a valid body", () => {
    expect(validateMemberBody(valid)).toBeNull();
  });

  it("rejects missing clubId", () => {
    expect(validateMemberBody({ ...valid, clubId: undefined })).toBe(
      "Club ID is required"
    );
  });

  it("rejects missing firstName", () => {
    expect(
      validateMemberBody({
        ...valid,
        personalInfo: { ...valid.personalInfo, firstName: "" },
      })
    ).toBe("First name and last name are required");
  });

  it("rejects missing email", () => {
    expect(
      validateMemberBody({
        ...valid,
        contact: { ...valid.contact, email: undefined },
      })
    ).toBe("Email is required");
  });
});
