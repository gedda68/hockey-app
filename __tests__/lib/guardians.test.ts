import { describe, it, expect } from "vitest";
import { isMinor, guardianIdsFromRelated, guardianIdsFor } from "@/lib/access/guardians";

const now = new Date("2026-11-16");
describe("isMinor", () => {
  it("is true under 18, false on the 18th birthday", () => {
    expect(isMinor("2010-05-01", now)).toBe(true);
    expect(isMinor("2008-11-17", now)).toBe(true);
    expect(isMinor("2008-11-16", now)).toBe(false);
    expect(isMinor("1990-01-01", now)).toBe(false);
  });
  it("is false for missing or invalid dates", () => {
    expect(isMinor(undefined, now)).toBe(false);
    expect(isMinor("nope", now)).toBe(false);
  });
});

describe("guardians", () => {
  it("takes linked parents/guardians from related people", () => {
    const ids = guardianIdsFromRelated([
      { memberId: "A", relationshipType: "Mother" },
      { memberId: "B", relationshipType: "Legal Guardian" },
      { memberId: "C", relationshipType: "Sibling" },
      { name: "Unlinked", relationshipType: "Father" },
    ]);
    expect(ids).toEqual(["A", "B"]);
  });
  it("adds adult family primary contacts, never the child or a minor", async () => {
    const db: any = { collection: () => ({ find: () => ({ toArray: async () => [
      { memberId: "KID", personalInfo: { dateOfBirth: "2012-01-01" } },
      { memberId: "TEEN", personalInfo: { dateOfBirth: "2011-01-01" } },
      { memberId: "DAD", personalInfo: { dateOfBirth: "1980-01-01" } },
    ] }) }) };
    const ids = await guardianIdsFor(db, { memberId: "KID", family: { familyId: "f1" }, personalInfo: { relatedMembers: [{ memberId: "MUM", relationshipType: "Parent" }] } });
    expect(ids.sort()).toEqual(["DAD", "MUM"]);
  });
});
