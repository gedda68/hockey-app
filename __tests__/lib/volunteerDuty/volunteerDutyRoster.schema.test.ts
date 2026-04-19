import { describe, expect, it } from "vitest";
import {
  PublicVolunteerDutyInterestSchema,
  AdminVolunteerDutyLeadCreateSchema,
} from "@/lib/db/schemas/volunteerDutyRoster.schema";

describe("PublicVolunteerDutyInterestSchema", () => {
  it("accepts minimal valid payload", () => {
    const r = PublicVolunteerDutyInterestSchema.parse({
      displayName: "Alex Example",
      email: "alex@example.com",
      dutyKinds: ["goal_judge"],
    });
    expect(r.displayName).toBe("Alex Example");
    expect(r.dutyKinds).toEqual(["goal_judge"]);
  });

  it("rejects empty dutyKinds", () => {
    expect(() =>
      PublicVolunteerDutyInterestSchema.parse({
        displayName: "A",
        email: "a@b.co",
        dutyKinds: [],
      }),
    ).toThrow();
  });
});

describe("AdminVolunteerDutyLeadCreateSchema", () => {
  it("accepts admin create body", () => {
    const r = AdminVolunteerDutyLeadCreateSchema.parse({
      displayName: "Pat",
      email: "pat@example.com",
      dutyKinds: ["canteen", "setup_packup"],
      notes: "Called — keen for Saturdays",
    });
    expect(r.dutyKinds).toHaveLength(2);
  });
});
