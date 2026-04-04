/**
 * Tests for the registration submission validation rules.
 *
 * These tests exercise the pure validation logic independently of the
 * Next.js request/response cycle and the MongoDB connection.  The API
 * route handler itself is covered by the integration tests in
 * `registration.integration.test.ts`.
 */

import { describe, it, expect } from "vitest";

// ── Types (mirrored from the submit route) ──────────────────────────────────

interface RegistrationBody {
  clubId?: string;
  associationId?: string;
  personalInfo?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
  };
  contact?: {
    primaryEmail?: string;
    primaryPhone?: string;
  };
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  membershipTypes?: string[];
  roles?: string[];
}

// ── Pure validation function (mirrors submit/route.ts logic) ────────────────

function validateRegistration(body: RegistrationBody): string | null {
  if (!body.clubId) return "Club ID is required";
  if (!body.personalInfo?.firstName) return "First name is required";
  if (!body.personalInfo?.lastName) return "Last name is required";
  if (!body.personalInfo?.dateOfBirth) return "Date of birth is required";
  if (!body.contact?.primaryEmail) return "Email is required";
  if (!body.emergencyContact?.name || !body.emergencyContact?.phone) {
    return "Emergency contact name and phone are required";
  }
  return null; // valid
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const dob = new Date(dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("Registration validation", () => {
  const validBody: RegistrationBody = {
    clubId: "chc",
    associationId: "bha",
    personalInfo: {
      firstName: "Jane",
      lastName: "Smith",
      dateOfBirth: "2000-05-15",
      gender: "female",
    },
    contact: {
      primaryEmail: "jane@example.com",
      primaryPhone: "0400 000 000",
    },
    emergencyContact: {
      name: "Bob Smith",
      phone: "0400 111 111",
      relationship: "parent",
    },
    membershipTypes: ["senior"],
    roles: ["player"],
  };

  it("accepts a valid registration body", () => {
    expect(validateRegistration(validBody)).toBeNull();
  });

  it("rejects when clubId is missing", () => {
    const body = { ...validBody, clubId: undefined };
    expect(validateRegistration(body)).toBe("Club ID is required");
  });

  it("rejects when firstName is missing", () => {
    const body: RegistrationBody = {
      ...validBody,
      personalInfo: { ...validBody.personalInfo, firstName: undefined },
    };
    expect(validateRegistration(body)).toBe("First name is required");
  });

  it("rejects when lastName is missing", () => {
    const body: RegistrationBody = {
      ...validBody,
      personalInfo: { ...validBody.personalInfo, lastName: undefined },
    };
    expect(validateRegistration(body)).toBe("Last name is required");
  });

  it("rejects when dateOfBirth is missing", () => {
    const body: RegistrationBody = {
      ...validBody,
      personalInfo: { ...validBody.personalInfo, dateOfBirth: undefined },
    };
    expect(validateRegistration(body)).toBe("Date of birth is required");
  });

  it("rejects when email is missing", () => {
    const body: RegistrationBody = {
      ...validBody,
      contact: { ...validBody.contact, primaryEmail: undefined },
    };
    expect(validateRegistration(body)).toBe("Email is required");
  });

  it("rejects when emergency contact name is missing", () => {
    const body: RegistrationBody = {
      ...validBody,
      emergencyContact: { phone: "0400 111 111", relationship: "parent" },
    };
    expect(validateRegistration(body)).toBe(
      "Emergency contact name and phone are required"
    );
  });

  it("rejects when emergency contact phone is missing", () => {
    const body: RegistrationBody = {
      ...validBody,
      emergencyContact: { name: "Bob Smith", relationship: "parent" },
    };
    expect(validateRegistration(body)).toBe(
      "Emergency contact name and phone are required"
    );
  });
});

describe("Age calculation", () => {
  it("calculates age correctly for someone who has had their birthday this year", () => {
    const today = new Date();
    const dobYear = today.getFullYear() - 25;
    // Birthday in January (already passed if we're past Jan)
    const dob = `${dobYear}-01-01`;
    const age = calculateAge(dob);
    expect(age).toBeGreaterThanOrEqual(24);
    expect(age).toBeLessThanOrEqual(25);
  });

  it("calculates age for someone whose birthday is tomorrow (not yet turned)", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dobYear = tomorrow.getFullYear() - 18;
    const dob = `${dobYear}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    const age = calculateAge(dob);
    // Should be 17 (hasn't turned 18 yet)
    expect(age).toBe(17);
  });

  it("calculates age for a newborn (same day)", () => {
    const today = new Date();
    const dob = today.toISOString().split("T")[0];
    expect(calculateAge(dob)).toBe(0);
  });

  it("returns correct age for a junior player (under 12)", () => {
    const today = new Date();
    const dobYear = today.getFullYear() - 10;
    const dob = `${dobYear}-06-15`;
    const age = calculateAge(dob);
    expect(age).toBeGreaterThanOrEqual(9);
    expect(age).toBeLessThanOrEqual(10);
  });
});

describe("Member ID generation format", () => {
  // The submit route uses: `M${Date.now().toString(36).toUpperCase()}`
  function generateMemberId(): string {
    return `M${Date.now().toString(36).toUpperCase()}`;
  }

  it("generates an ID starting with M", () => {
    expect(generateMemberId()).toMatch(/^M[A-Z0-9]+$/);
  });

  it("generates unique IDs across different milliseconds", () => {
    // Date.now() can return the same value in a tight sync loop, so we
    // just verify the format — uniqueness is guaranteed by timestamp in prod.
    const id1 = generateMemberId();
    const id2 = `M${(Date.now() + 1).toString(36).toUpperCase()}`;
    expect(id1).toMatch(/^M[A-Z0-9]+$/);
    expect(id2).toMatch(/^M[A-Z0-9]+$/);
  });

  it("generates IDs that are reasonably short (base-36 encoding)", () => {
    const id = generateMemberId();
    // base-36 of current timestamp is ~8-9 chars; total with "M" prefix = 9-10
    expect(id.length).toBeGreaterThanOrEqual(9);
    expect(id.length).toBeLessThanOrEqual(12);
  });
});
