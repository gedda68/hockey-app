import { describe, expect, it } from "vitest";
import { classifyRoles } from "@/lib/members/roleClassification";

describe("classifyRoles", () => {
  it("understands imported role- ids and plain ids", () => {
    expect(classifyRoles(["role-player", "role-coach"])).toMatchObject({ isPlayer: true, isCoach: true, isUmpire: false });
    expect(classifyRoles(["role-umpire"]).isUmpire).toBe(true);
    expect(classifyRoles(["umpire", "technical-official"])).toMatchObject({ isUmpire: true, isTechnicalOfficial: true });
    expect(classifyRoles(["role-team-manager"])).toMatchObject({ isPlayer: false, isCoach: false });
  });
});
