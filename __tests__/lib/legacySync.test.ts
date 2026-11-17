import { describe, expect, it, vi } from "vitest";
import { syncMatrixHoldingsForGrant } from "@/lib/access/legacySync";

function fakeDb(member: Record<string, unknown> | null, teams: { teamId: string; clubId: string }[] = []) {
  const updateOne = vi.fn(async () => ({ matchedCount: 1 }));
  const db = {
    collection: (n: string) => ({
      findOne: async () => member,
      find: () => ({ toArray: async () => (n === "teams" ? teams : []) }),
      updateOne,
    }),
  };
  return { db: db as never, updateOne };
}

describe("syncMatrixHoldingsForGrant", () => {
  it("adds the matching holding when a registrar role is approved", async () => {
    const { db, updateOne } = fakeDb({ roleHoldings: [] });
    const n = await syncMatrixHoldingsForGrant(db, "m1", [{ role: "registrar", scopeType: "club", scopeId: "c1" }]);
    expect(n).toBe(1);
    const push = (updateOne.mock.calls[0] as unknown as [unknown, { $push: { roleHoldings: { $each: { roleKey: string }[] } } }])[1];
    expect(push.$push.roleHoldings.$each[0].roleKey).toBe("club:registrar-membership-secretary");
  });

  it("does nothing when the member already holds it", async () => {
    const { db, updateOne } = fakeDb({ roleHoldings: [{ roleKey: "club:registrar-membership-secretary", orgType: "club", orgId: "c1" }] });
    expect(await syncMatrixHoldingsForGrant(db, "m1", [{ role: "registrar", scopeType: "club", scopeId: "c1" }])).toBe(0);
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("uses the team's club for a team coach", async () => {
    const { db, updateOne } = fakeDb({}, [{ teamId: "t1", clubId: "club-9" }]);
    expect(await syncMatrixHoldingsForGrant(db, "m1", [{ role: "coach", scopeType: "team", scopeId: "t1" }])).toBe(1);
    const push = (updateOne.mock.calls[0] as unknown as [unknown, { $push: { roleHoldings: { $each: { orgId: string; teamIds: string[] }[] } } }])[1];
    expect(push.$push.roleHoldings.$each[0]).toMatchObject({ orgId: "club-9", teamIds: ["t1"] });
  });

  it("leaves a club-wide coach alone and writes nothing", async () => {
    const { db, updateOne } = fakeDb({ roleHoldings: [] });
    expect(await syncMatrixHoldingsForGrant(db, "m1", [{ role: "coach", scopeType: "club", scopeId: "c1" }])).toBe(0);
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("returns 0 when the member does not exist", async () => {
    const { db } = fakeDb(null);
    expect(await syncMatrixHoldingsForGrant(db, "nope", [{ role: "registrar", scopeType: "club", scopeId: "c1" }])).toBe(0);
  });
});
