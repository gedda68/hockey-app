import { describe, expect, it, vi } from "vitest";
import type { Db } from "mongodb";
import { deriveAssociationLevelAndHierarchy } from "@/lib/domain/associationHierarchy";

function mockDb(parentMap: Record<string, { parentAssociationId?: string }>): Db {
  return {
    collection: () => ({
      findOne: vi.fn().mockImplementation(async (q: Record<string, unknown>) => {
        const id = String(q?.associationId ?? "");
        const hit = parentMap[id];
        return hit ? { associationId: id, ...hit } : null;
      }),
    }),
  } as unknown as Db;
}

describe("deriveAssociationLevelAndHierarchy", () => {
  it("returns root defaults when no parent", async () => {
    const db = mockDb({});
    await expect(deriveAssociationLevelAndHierarchy(db, undefined)).resolves.toEqual({
      level: 0,
      hierarchy: [],
    });
    await expect(deriveAssociationLevelAndHierarchy(db, "")).resolves.toEqual({
      level: 0,
      hierarchy: [],
    });
  });

  it("derives level+hierarchy by walking the chain", async () => {
    const db = mockDb({
      HQ: { parentAssociationId: "HA" },
      BHA: { parentAssociationId: "HQ" },
      HA: {}, // root
    });
    await expect(
      deriveAssociationLevelAndHierarchy(db, "BHA"),
    ).resolves.toEqual({
      level: 3,
      hierarchy: ["HA", "HQ", "BHA"],
    });
  });

  it("rejects when child would become its own ancestor", async () => {
    const db = mockDb({
      BHA: { parentAssociationId: "HQ" },
      HQ: { parentAssociationId: "HA" },
      HA: {},
    });
    await expect(
      deriveAssociationLevelAndHierarchy(db, "BHA", { childAssociationId: "BHA" }),
    ).rejects.toThrow(/own ancestor/i);
  });

  it("rejects cycles in the parent chain", async () => {
    const db = mockDb({
      A: { parentAssociationId: "B" },
      B: { parentAssociationId: "A" },
    });
    await expect(deriveAssociationLevelAndHierarchy(db, "A")).rejects.toThrow(
      /cycle detected/i,
    );
  });

  it("throws when parent association does not exist", async () => {
    const db = mockDb({
      HQ: { parentAssociationId: "HA" },
      // HA missing
    });
    await expect(deriveAssociationLevelAndHierarchy(db, "HQ")).rejects.toThrow(
      /Parent association not found/i,
    );
  });
});

