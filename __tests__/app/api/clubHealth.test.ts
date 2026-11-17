import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ session: null as Record<string, unknown> | null, memberFind: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn(async () => h.session) }));
vi.mock("@/lib/access/memberAccess", () => ({ accessForSession: vi.fn(async () => null) }));
vi.mock("@/lib/auth/resourceAccessDb", () => ({ userCanAccessClubResource: vi.fn(async () => false) }));
vi.mock("@/lib/mongodb", () => ({
  getDatabase: async () => ({
    collection: (n: string) => ({
      find: (q: unknown) => { if (n === "members") h.memberFind(q); return { limit: () => ({ toArray: async () => [] }) }; },
      countDocuments: async () => 0,
    }),
  }),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/club-health/route";

const get = (qs = "") => GET(new NextRequest(`http://x/api/admin/club-health${qs}`));

beforeEach(() => { vi.clearAllMocks(); h.session = { memberId: "m", role: "club-admin", clubId: "club-1" }; });

describe("GET /api/admin/club-health", () => {
  it("needs sign-in", async () => { h.session = null; expect((await get()).status).toBe(401); });
  it("refuses roles that don't run the club", async () => {
    h.session = { memberId: "m", role: "coach", clubId: "club-1" };
    expect((await get()).status).toBe(403);
  });
  it("runs for the club admin's own club", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect((await res.json()).score).toBe(100);
    expect(h.memberFind).toHaveBeenCalledWith({ $or: [{ "membership.clubId": "club-1" }, { clubId: "club-1" }] });
  });
  it("won't check another club without access", async () => {
    expect((await get("?clubId=other")).status).toBe(403);
  });
});
