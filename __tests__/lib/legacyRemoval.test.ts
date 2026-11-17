import { describe, expect, it, vi } from "vitest";
import { planHoldingEnds, type LegacyAssignment } from "@/lib/access/legacyMapping";
import { syncMatrixHoldingsForRemoval } from "@/lib/access/legacySync";

const reg: LegacyAssignment = { role: "registrar", scopeType: "club", scopeId: "c1" };
const mig = { roleKey: "club:registrar-membership-secretary", orgType: "club", orgId: "c1", status: "active", source: "legacy-migration", legacyRole: "registrar" } as const;
const appointed = { roleKey: "club:registrar-membership-secretary", orgType: "club", orgId: "c1", status: "active" } as const;
const none = () => ({});

describe("planHoldingEnds", () => {
  it("ends the migrated holding when its legacy role is removed", () => {
    expect(planHoldingEnds([reg], [], [{ ...mig }], none).indexes).toEqual([0]);
  });

  it("ends it when the legacy role is deactivated", () => {
    expect(planHoldingEnds([reg], [{ ...reg, active: false }], [{ ...mig }], none).indexes).toEqual([0]);
  });

  it("ends it when the legacy role has expired", () => {
    const old = { ...reg, expiresAt: "2020-01-01T00:00:00Z" };
    expect(planHoldingEnds([old], [old], [{ ...mig }], none).indexes).toEqual([0]);
  });

  it("keeps it while the role is still held", () => {
    expect(planHoldingEnds([reg], [reg], [{ ...mig }], none).indexes).toEqual([]);
  });

  it("never ends an appointment made through the matrix flow", () => {
    expect(planHoldingEnds([reg], [], [{ ...appointed }], none).indexes).toEqual([]);
  });

  it("leaves already-ended holdings and unrelated ones alone", () => {
    const other = { ...mig, orgId: "c2" };
    expect(planHoldingEnds([reg], [], [{ ...mig, status: "ended" }, other], none).indexes).toEqual([]);
  });

  it("matches team coaches by team", () => {
    const coach: LegacyAssignment = { role: "coach", scopeType: "team", scopeId: "t1" };
    const h = { roleKey: "club:assistant-coach", orgType: "club", orgId: "c9", teamIds: ["t1"], status: "active", source: "legacy-migration" } satisfies Record<string, unknown>;
    expect(planHoldingEnds([coach], [], [h as never], () => ({ teamClubId: "c9" })).indexes).toEqual([0]);
  });
});

describe("syncMatrixHoldingsForRemoval", () => {
  const dbWith = (roleHoldings: unknown[]) => {
    const updateOne = vi.fn(async () => ({}));
    const db = { collection: () => ({ findOne: async () => ({ roleHoldings }), find: () => ({ toArray: async () => [] }), updateOne }) };
    return { db: db as never, updateOne };
  };

  it("marks the holding ended and bumps the session version", async () => {
    const { db, updateOne } = dbWith([{ ...appointed, roleKey: "club:x" }, { ...mig }]);
    expect(await syncMatrixHoldingsForRemoval(db, "m1", [reg], [], "admin1")).toBe(1);
    const upd = (updateOne.mock.calls[0] as unknown as [unknown, { $set: Record<string, unknown>; $inc: Record<string, number> }])[1];
    expect(upd.$set["roleHoldings.1.status"]).toBe("ended");
    expect(upd.$set["roleHoldings.1.endedBy"]).toBe("admin1");
    expect(upd.$set["roleHoldings.0.status"]).toBeUndefined();
    expect(upd.$inc.roleVersion).toBe(1);
  });

  it("writes nothing when there is nothing to end", async () => {
    const { db, updateOne } = dbWith([{ ...mig }]);
    expect(await syncMatrixHoldingsForRemoval(db, "m1", [reg], [reg], "a")).toBe(0);
    expect(updateOne).not.toHaveBeenCalled();
  });
});
