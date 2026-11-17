import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  session: { memberId: "m1", name: "Me" } as Record<string, unknown> | null,
  insertOne: vi.fn(async () => ({})),
  deleteOne: vi.fn(async () => ({ deletedCount: 1 })),
  find: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn(async () => h.session) }));
vi.mock("@/lib/auth/sessionMember", () => ({ resolveSessionMemberId: vi.fn(async (_db: unknown, s: { memberId?: string }) => s.memberId ?? null) }));
vi.mock("@/lib/mongodb", () => ({
  getDatabase: async () => ({
    collection: () => ({
      insertOne: h.insertOne,
      deleteOne: h.deleteOne,
      find: (...a: unknown[]) => { h.find(...a); return { sort: () => ({ limit: () => ({ toArray: async () => [] }) }) }; },
    }),
  }),
}));

import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "@/app/api/member/my-availability/route";

const post = (body: unknown) => POST(new NextRequest("http://x/api/member/my-availability", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));

describe("my-availability", () => {
  beforeEach(() => { vi.clearAllMocks(); h.session = { memberId: "m1", name: "Me" }; });

  it("needs sign-in and a member profile", async () => {
    h.session = null;
    expect((await GET()).status).toBe(401);
    h.session = { name: "Admin" };
    expect((await GET()).status).toBe(400);
  });

  it("saves against the signed-in member only", async () => {
    const res = await post({ kind: "unavailable", from: "2099-01-01", memberId: "someone-else" });
    expect(res.status).toBe(201);
    const saved = (h.insertOne.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(saved.memberId).toBe("m1");
    expect(saved.availabilityId).toMatch(/^AV-/);
  });

  it("rejects bad dates", async () => {
    expect((await post({ kind: "unavailable", from: "nope" })).status).toBe(400);
    expect(h.insertOne).not.toHaveBeenCalled();
  });

  it("only deletes my own entry", async () => {
    await DELETE(new NextRequest("http://x/api/member/my-availability?id=AV-1", { method: "DELETE" }));
    expect(h.deleteOne).toHaveBeenCalledWith({ availabilityId: "AV-1", memberId: "m1" });
    h.deleteOne.mockResolvedValueOnce({ deletedCount: 0 });
    expect((await DELETE(new NextRequest("http://x/api/member/my-availability?id=AV-2", { method: "DELETE" }))).status).toBe(404);
  });
});
