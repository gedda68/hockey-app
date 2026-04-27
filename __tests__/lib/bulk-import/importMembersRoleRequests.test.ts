import { describe, it, expect, vi } from "vitest";
import { importMembers } from "@/lib/bulk-import/importers/people";

function makeDb() {
  const collections: Record<string, any> = {};

  const db = {
    collection: (name: string) => {
      if (!collections[name]) {
        collections[name] = {
          findOne: vi.fn(async () => null),
          updateOne: vi.fn(async () => ({ matchedCount: 0, modifiedCount: 0 })),
          updateMany: vi.fn(async () => ({ matchedCount: 0, modifiedCount: 0 })),
          insertOne: vi.fn(async () => ({ insertedId: "x" })),
        };
      }
      return collections[name];
    },
    __collections: collections,
  };

  return db as any;
}

describe("importMembers (W4 role-request creation)", () => {
  it("creates a role_request when requestedRole is provided", async () => {
    const db = makeDb();

    await importMembers(db as any, [
      {
        firstName: "Alex",
        lastName: "Member",
        primaryEmail: "alex.member@example.com",
        clubId: "club-demo-1",
        requestedRole: "player",
        seasonYear: "2026",
      },
    ]);

    const roleReqs = db.__collections["role_requests"];
    expect(roleReqs).toBeTruthy();
    expect(roleReqs.insertOne).toHaveBeenCalledTimes(1);
    const doc = roleReqs.insertOne.mock.calls[0][0];
    expect(doc.requestedRole).toBe("player");
    expect(doc.scopeType).toBe("club");
    expect(doc.scopeId).toBe("club-demo-1");
    expect(doc.seasonYear).toBe("2026");
  });

  it("does not create a role_request when requestedRole is blank", async () => {
    const db = makeDb();

    await importMembers(db as any, [
      { firstName: "Alex", lastName: "Member", clubId: "club-demo-1" },
    ]);

    const roleReqs = db.__collections["role_requests"];
    expect(roleReqs?.insertOne?.mock?.calls?.length ?? 0).toBe(0);
  });
});

