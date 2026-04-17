import { describe, expect, it } from "vitest";
import {
  publicNewsMongoFilter,
  publicNewsMongoFilterForAssociationHub,
  publicNewsMongoFilterForClubHub,
  parseNewsScope,
} from "@/lib/portal/newsScope";
import type { PublicTenantPayload } from "@/lib/tenant/portalHost";

describe("publicNewsMongoFilter", () => {
  it("apex shows platform + legacy missing scopeType", () => {
    const f = publicNewsMongoFilter(null);
    expect(f).toMatchObject({
      $or: expect.arrayContaining([{ scopeType: "platform" }]),
    });
  });

  it("association tenant filters by id", () => {
    const t: PublicTenantPayload = {
      kind: "association",
      id: "bha",
      portalSlug: "bha",
      displayName: "BHA",
      primaryColor: "#000",
      secondaryColor: "#111",
      tertiaryColor: "#222",
      accentColor: "#333",
    };
    expect(publicNewsMongoFilter(t)).toEqual({
      scopeType: "association",
      scopeId: "bha",
    });
  });

  it("association hub filter matches association tenant filter", () => {
    expect(publicNewsMongoFilterForAssociationHub("bha")).toEqual({
      scopeType: "association",
      scopeId: "bha",
    });
  });

  it("club hub filter scopes to club id", () => {
    expect(publicNewsMongoFilterForClubHub("club-1")).toEqual({
      scopeType: "club",
      scopeId: "club-1",
    });
  });
});

describe("parseNewsScope", () => {
  it("defaults missing to platform", () => {
    expect(parseNewsScope({})).toEqual({
      scopeType: "platform",
      scopeId: null,
    });
  });
});
