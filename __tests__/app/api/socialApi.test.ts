import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  session: null as Record<string, unknown> | null,
  clubOk: true,
  accounts: [] as Record<string, any>[],
  posts: [] as Record<string, any>[],
  upserts: [] as Record<string, any>[],
  announcements: [] as Record<string, any>[],
  verify: vi.fn(async () => ({ id: "123456", name: "Lions Hockey" })),
}));
vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn(async () => h.session) }));
vi.mock("@/lib/auth/sessionMember", () => ({ resolveSessionMemberId: vi.fn(async () => "MBR-1") }));
vi.mock("@/lib/access/memberAccess", () => ({ accessForSession: vi.fn(async () => null) }));
vi.mock("@/lib/auth/resourceAccessDb", () => ({ userCanAccessClubResource: vi.fn(async () => h.clubOk), userCanAccessAssociationResource: vi.fn(async () => true) }));
vi.mock("@/lib/social/facebook", () => ({ verifyPage: h.verify, postToPage: vi.fn(async () => "P_1"), deletePagePost: vi.fn() }));
vi.mock("@/lib/mongodb", () => ({
  getDatabase: async () => ({
    collection: (n: string) => ({
      find: (q: Record<string, any>, opts?: { projection?: Record<string, number> }) => {
        const proj = opts?.projection;
        const strip = (r: Record<string, any>) => Object.fromEntries(Object.entries(r).filter(([k]) => proj?.[k] !== 0));
        const rows = (n === "social_accounts" ? h.accounts.filter((a) => a.status === q.status || !q.status) : n === "social_posts" ? h.posts : []).map(strip);
        const chain: Record<string, unknown> = { toArray: async () => rows };
        chain.sort = () => chain; chain.limit = () => chain;
        return chain;
      },
      findOne: async () => null,
      updateOne: async (...a: any[]) => { if (n === "social_accounts") h.upserts.push(a[1]); return { modifiedCount: 1, matchedCount: 1 }; },
      insertOne: async (d: any) => { if (n === "announcements") h.announcements.push(d); },
      insertMany: async (d: any[]) => { h.posts.push(...d); },
      findOneAndUpdate: async () => null,
    }),
  }),
}));

import { NextRequest } from "next/server";
import { GET as ACC_GET, POST as ACC_POST } from "@/app/api/admin/social/accounts/route";
import { POST as POST_POST } from "@/app/api/admin/social/posts/route";
import { POST as ANN_POST } from "@/app/api/admin/announcements/route";

const req = (url: string, body?: unknown) => new NextRequest(`http://x${url}`, { method: body ? "POST" : "GET", ...(body ? { body: JSON.stringify(body) } : {}) });
const club = (over: Record<string, unknown> = {}) => ({ memberId: "m", userId: "u1", name: "Pat", role: "club-admin", clubId: "c1", associationId: "a1", ...over });
const acct = (over: Record<string, any> = {}) => ({ accountId: "A1", platform: "facebook", pageId: "123456", pageName: "Lions Hockey", ownerLevel: "club", ownerId: "c1", status: "active", tokenEnc: "SECRET-ENC", ...over });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SOCIAL_TOKEN_KEY = "a-long-random-test-key-123";
  h.session = club(); h.clubOk = true; h.accounts = [acct()]; h.posts = []; h.upserts = []; h.announcements = [];
});

describe("connecting pages", () => {
  it("needs sign-in and a role that can manage the organisation's posts", async () => {
    h.session = null; expect((await ACC_GET()).status).toBe(401);
    h.session = club({ role: "coach" }); expect((await ACC_GET()).status).toBe(403);
  });
  it("lists pages without their tokens", async () => {
    const res = await ACC_GET();
    const text = JSON.stringify(await res.json());
    expect(text).toContain("Lions Hockey");
    expect(text).not.toContain("SECRET-ENC");
  });
  it("checks the token with Facebook, then stores it encrypted", async () => {
    const res = await ACC_POST(req("/api/admin/social/accounts", { pageId: "123456", accessToken: "EAAB-this-is-a-long-page-token" }));
    expect(res.status).toBe(201);
    const stored = JSON.stringify(h.upserts[0]);
    expect(stored).not.toContain("EAAB-this-is-a-long-page-token");
    expect(h.upserts[0].$set.tokenEnc).toBeTruthy();
  });
  it("rejects bad input, a token Facebook refuses, a missing server key, and other clubs", async () => {
    expect((await ACC_POST(req("/api/admin/social/accounts", { pageId: "abc", accessToken: "x".repeat(30) }))).status).toBe(400);
    expect((await ACC_POST(req("/api/admin/social/accounts", { pageId: "123456", accessToken: "short" }))).status).toBe(400);
    h.verify.mockRejectedValueOnce(new Error("Invalid OAuth access token"));
    const r = await ACC_POST(req("/api/admin/social/accounts", { pageId: "123456", accessToken: "x".repeat(30) }));
    expect(r.status).toBe(400);
    expect((await r.json()).error).toContain("Invalid OAuth");
    h.clubOk = false;
    expect((await ACC_POST(req("/api/admin/social/accounts", { ownerLevel: "club", ownerId: "other", pageId: "123456", accessToken: "x".repeat(30) }))).status).toBe(403);
    h.clubOk = true; delete process.env.SOCIAL_TOKEN_KEY;
    expect((await ACC_POST(req("/api/admin/social/accounts", { pageId: "123456", accessToken: "x".repeat(30) }))).status).toBe(503);
  });
});

describe("queueing posts", () => {
  it("queues a post for a connected page, scheduled for later", async () => {
    const res = await POST_POST(req("/api/admin/social/posts", { text: "Nominations open", accountIds: ["A1"], postAt: new Date(Date.now() + 3600_000).toISOString(), source: { type: "nomination-window", id: "W1" } }));
    expect(res.status).toBe(201);
    expect(h.posts[0]).toMatchObject({ accountId: "A1", status: "queued", ownerId: "c1", source: { type: "nomination-window", id: "W1" } });
  });
  it("refuses empty posts, unknown pages and other people's organisations", async () => {
    expect((await POST_POST(req("/api/admin/social/posts", { text: "", accountIds: ["A1"] }))).status).toBe(400);
    h.accounts = [];
    expect((await POST_POST(req("/api/admin/social/posts", { text: "Hi", accountIds: ["A1"] }))).status).toBe(400);
    h.session = club({ role: "coach" });
    expect((await POST_POST(req("/api/admin/social/posts", { text: "Hi", accountIds: ["A1"] }))).status).toBe(403);
  });
});

describe("announcement with 'post to our page'", () => {
  const ann = { level: "club", scopeId: "c1", title: "Presentation night", body: "Friday 7pm", publishAt: new Date(Date.now() + 3600_000).toISOString() };
  it("queues the page post together with the announcement", async () => {
    const res = await ANN_POST(req("/api/admin/announcements", { ...ann, postToSocial: true }));
    expect(res.status).toBe(201);
    expect((await res.json()).social).toEqual({ queued: 1, postIds: expect.any(Array) });
    expect(h.posts[0]).toMatchObject({ text: "Presentation night\n\nFriday 7pm", source: { type: "announcement" } });
  });
  it("won't post a targeted announcement publicly, and publishes nothing when it refuses", async () => {
    const res = await ANN_POST(req("/api/admin/announcements", { ...ann, postToSocial: true, targeting: { maxAge: 12 } }));
    expect(res.status).toBe(400);
    expect(h.announcements).toHaveLength(0);
  });
  it("needs a connected page, and isn't offered for everyone-announcements", async () => {
    h.accounts = [];
    expect((await ANN_POST(req("/api/admin/announcements", { ...ann, postToSocial: true }))).status).toBe(400);
    h.session = club({ role: "super-admin" });
    expect((await ANN_POST(req("/api/admin/announcements", { level: "global", title: "T", body: "B", postToSocial: true }))).status).toBe(400);
  });
  it("is unchanged without the checkbox", async () => {
    const res = await ANN_POST(req("/api/admin/announcements", ann));
    expect(res.status).toBe(201);
    expect((await res.json()).social).toBeUndefined();
    expect(h.posts).toHaveLength(0);
  });
});
