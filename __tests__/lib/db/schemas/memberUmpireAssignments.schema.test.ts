import { describe, it, expect } from "vitest";
import { PatchMyUmpireAssignmentBodySchema } from "@/lib/db/schemas/memberUmpireAssignments.schema";

describe("PatchMyUmpireAssignmentBodySchema", () => {
  it("parses a valid body", () => {
    const b = PatchMyUmpireAssignmentBodySchema.parse({
      fixtureId: "fx-1",
      seasonCompetitionId: "sc-2026",
      slotIndex: 0,
      allocationStatus: "accepted",
    });
    expect(b.allocationStatus).toBe("accepted");
  });

  it("rejects negative slotIndex", () => {
    expect(() =>
      PatchMyUmpireAssignmentBodySchema.parse({
        fixtureId: "f",
        seasonCompetitionId: "s",
        slotIndex: -1,
        allocationStatus: "declined",
      }),
    ).toThrow();
  });

  it("rejects extra properties (strict)", () => {
    expect(() =>
      PatchMyUmpireAssignmentBodySchema.parse({
        fixtureId: "f",
        seasonCompetitionId: "s",
        slotIndex: 0,
        allocationStatus: "accepted",
        extra: true,
      }),
    ).toThrow();
  });
});
