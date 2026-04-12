import { describe, expect, it, vi } from "vitest";
import { seasonCompetitionVisibleForPortalTenant } from "@/lib/tenant/seasonCompetitionTenantGate";
import type { Db } from "mongodb";
import type { PublicTenantPayload } from "@/lib/tenant/portalHost";

function mockDb(clubDoc: Record<string, unknown> | null): Db {
  return {
    collection: () => ({
      findOne: vi.fn().mockResolvedValue(clubDoc),
    }),
  } as unknown as Db;
}

describe("seasonCompetitionVisibleForPortalTenant", () => {
  it("allows when no tenant", async () => {
    const ok = await seasonCompetitionVisibleForPortalTenant(
      mockDb(null),
      "assoc-1",
      null,
    );
    expect(ok).toBe(true);
  });

  it("association tenant must match owner", async () => {
    const t: PublicTenantPayload = {
      kind: "association",
      id: "assoc-1",
      portalSlug: "a",
      displayName: "A",
      primaryColor: "#000",
      secondaryColor: "#111",
      tertiaryColor: "#222",
      accentColor: "#333",
    };
    expect(
      await seasonCompetitionVisibleForPortalTenant(mockDb(null), "assoc-1", t),
    ).toBe(true);
    expect(
      await seasonCompetitionVisibleForPortalTenant(mockDb(null), "other", t),
    ).toBe(false);
  });

  it("club tenant uses parent association", async () => {
    const t: PublicTenantPayload = {
      kind: "club",
      id: "club-x",
      portalSlug: "x",
      pathSlug: "club-x",
      displayName: "X",
      primaryColor: "#000",
      secondaryColor: "#111",
      tertiaryColor: "#222",
      accentColor: "#333",
    };
    const db = mockDb({ associationId: "assoc-1" });
    expect(
      await seasonCompetitionVisibleForPortalTenant(db, "assoc-1", t),
    ).toBe(true);
    expect(
      await seasonCompetitionVisibleForPortalTenant(db, "other", t),
    ).toBe(false);
  });
});
