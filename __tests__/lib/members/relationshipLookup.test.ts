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
