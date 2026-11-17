import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ session: null as Record<string, unknown> | null, rows: [] as Record<string, unknown>[], find: vi.fn(), clubOk: true }));
vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn(async () => h.session) }));
vi.mock("@/lib/access/memberAccess", () => ({ accessForSession: vi.fn(async () => null) }));
vi.mock("@/lib/auth/resourceAccessDb", () => ({ userCanAccessClubResource: vi.fn(async () => h.clubOk) }));
vi.mock("@/lib/mongodb", () => ({
  getDatabase: async () => ({
    collection: (n: string) => ({
      find: (q: unknown) => {
        if (n === "notification_deliveries") h.find(q);
        const rows = n === "notification_deliveries" ? h.rows : [{ memberId: "m2", personalInfo: { firstName: "Sam", lastName: "Lee" } }];
        const chain: Record<string, unknown> = { toArray: async () => rows };
        chain.limit = () => chain;
        return chain;
      },
      findOne: async () => null,
    }),
  }),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/deliveries/route";
import { POST } from "@/app/api/admin/deliveries/resend/route";

const get = (qs = "") => GET(new NextRequest(`http://x/api/admin/deliveries${qs}`));
const post = (body: unknown = {}) => POST(new NextRequest("http://x/api/admin/deliveries/resend", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  vi.clearAllMocks(); h.clubOk = true;
  h.session = { memberId: "m", role: "club-admin", clubId: "c1" };
  h.rows = [
    { memberId: "m1", channel: "email", status: "sent", at: "2026-06-01", dedupeKey: "k1", category: "matches" },
    { memberId: "m2", channel: "email", status: "failed", at: "2026-06-01", dedupeKey: "k1", category: "matches", error: "bounced", title: "Lions v Tigers" },
  ];
});

describe("club delivery log", () => {
  it("is closed to the signed-out and to roles that don't run the club", async () => {
    h.session = null; expect((await get()).status).toBe(401);
    h.session = { memberId: "m", role: "coach", clubId: "c1" }; expect((await get()).status).toBe(403);
    expect((await post()).status).toBe(403);
  });
  it("won't read another club without access", async () => {
    h.clubOk = false;
    expect((await get("?clubId=other")).status).toBe(403);
  });
  it("scopes to the club and reports counts and named failures", async () => {
    const body = await (await get("?category=matches")).json();
    expect(h.find).toHaveBeenCalledWith(expect.objectContaining({ clubId: "c1", category: "matches" }));
    expect(body.summary).toEqual([{ category: "matches", channel: "email", sent: 1, failed: 1 }]);
    expect(body.failedTotal).toBe(1);
    expect(body.failures[0]).toMatchObject({ name: "Sam Lee", error: "bounced", title: "Lions v Tigers" });
  });
  it("resend runs for the club's failures", async () => {
    const res = await post({ dedupeKey: "k1" });
    expect(res.status).toBe(200);
    expect(h.find).toHaveBeenCalledWith(expect.objectContaining({ clubId: "c1", dedupeKey: "k1" }));
    expect(await res.json()).toMatchObject({ success: true, attempted: 0, skipped: 1 });
  });
});
