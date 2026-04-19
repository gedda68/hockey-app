import { describe, expect, it } from "vitest";
import type { SessionData } from "@/lib/auth/session";
import {
  getClubListScope,
  shouldDefaultClubListToAssociation,
} from "@/lib/auth/clubListScope";

function baseSession(overrides: Partial<SessionData> = {}): SessionData {
  return {
    userId: "u1",
    email: "a@b.c",
    name: "Test",
    role: "association-admin",
    associationId: "assoc-rha",
    ...overrides,
  } as SessionData;
}

describe("getClubListScope", () => {
  it("returns all for super-admin", () => {
    expect(getClubListScope(baseSession({ role: "super-admin" }))).toEqual({
      kind: "all",
    });
  });

  it("scopes association-admin to session association", () => {
    expect(getClubListScope(baseSession())).toEqual({
      kind: "associations",
      associationIds: ["assoc-rha"],
    });
  });

  it("scopes club-admin to club refs when no association assignment", () => {
    expect(
      getClubListScope(
        baseSession({
          role: "club-admin",
          associationId: "assoc-bha",
          clubId: "club-chc",
          clubSlug: "commercial-hockey-club",
        }),
      ),
    ).toEqual({
      kind: "clubs",
      clubRefs: ["club-chc", "commercial-hockey-club"],
    });
  });

  it("collects multiple association scopes from scopedRoles", () => {
    expect(
      getClubListScope(
        baseSession({
          role: "assoc-committee",
          associationId: null,
          scopedRoles: [
            { role: "assoc-committee", scopeType: "association", scopeId: "a1" },
            { role: "assoc-committee", scopeType: "association", scopeId: "a2" },
          ],
        }),
      )
    ).toEqual({
      kind: "associations",
      associationIds: ["a1", "a2"],
    });
  });
});

describe("shouldDefaultClubListToAssociation", () => {
  it("is true for association staff with associationId", () => {
    expect(
      shouldDefaultClubListToAssociation({
        role: "association-admin",
        associationId: "x",
      }),
    ).toBe(true);
  });

  it("is false for super-admin", () => {
    expect(
      shouldDefaultClubListToAssociation({
        role: "super-admin",
        associationId: "x",
      }),
    ).toBe(false);
  });

  it("is false for club-admin", () => {
    expect(
      shouldDefaultClubListToAssociation({
        role: "club-admin",
        associationId: "x",
      }),
    ).toBe(false);
  });
});
