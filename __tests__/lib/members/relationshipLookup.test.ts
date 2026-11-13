import { describe, expect, it } from "vitest";
import { normaliseRelationship } from "@/lib/members/relationshipLookup";

describe("normaliseRelationship", () => {
  it("handles the common field spellings", () => {
    expect(normaliseRelationship({ id: "rel-1", name: "Parent" })).toMatchObject({ id: "rel-1", name: "Parent", isActive: true });
    expect(normaliseRelationship({ relationshipTypeId: "r2", label: "Sibling", active: false })).toMatchObject({ id: "r2", name: "Sibling", isActive: false });
    expect(normaliseRelationship({ _id: "abc", name: "Friend" })?.id).toBe("abc");
    expect(normaliseRelationship({ id: "x" })).toBeNull();
  });
});

describe("normaliseRelationship — unusual shapes", () => {
  it("finds the name under other field names", () => {
    expect(normaliseRelationship({ relationshipType: "Uncle", id: "u" })?.name).toBe("Uncle");
    expect(normaliseRelationship({ _id: "1", code: "AUNT", description: "Aunt" })?.name).toBe("Aunt");
    expect(normaliseRelationship({ _id: "1", foo: "Cousin", createdAt: "2026-01-01" })?.name).toBe("Cousin");
  });
  it("only treats explicit false/inactive as inactive", () => {
    expect(normaliseRelationship({ name: "A" })?.isActive).toBe(true);
    expect(normaliseRelationship({ name: "A", status: "inactive" })?.isActive).toBe(false);
  });
});
