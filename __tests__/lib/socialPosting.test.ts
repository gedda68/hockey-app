import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fb = vi.hoisted(() => ({ postToPage: vi.fn(async () => "PAGE_1_POST_9"), deletePagePost: vi.fn(async () => {}), verifyPage: vi.fn() }));
vi.mock("@/lib/social/facebook", () => fb);

import { decryptToken, encryptToken, socialKeyConfigured } from "@/lib/social/crypto";
import { cleanSocialPost, composeAnnouncementPost, composeNominationPost, MAX_POST } from "@/lib/social/compose";
import { processDuePosts, queuePosts, retryPost, withdrawPost } from "@/lib/social/posts";

beforeEach(() => { process.env.SOCIAL_TOKEN_KEY = "a-long-random-test-key-123"; vi.clearAllMocks(); });
afterEach(() => { delete process.env.SOCIAL_TOKEN_KEY; });

describe("token encryption", () => {
  it("round-trips and doesn't store the token in the clear", () => {
    const enc = encryptToken("EAAB-secret-token");
    expect(enc).not.toContain("secret");
    expect(decryptToken(enc)).toBe("EAAB-secret-token");
    expect(encryptToken("EAAB-secret-token")).not.toBe(enc); // fresh IV each time
  });
  it("refuses without a key, and rejects tampering or a different key", () => {
    const enc = encryptToken("tok");
    const tampered = enc.slice(0, -4) + "AAAA";
    expect(() => decryptToken(tampered)).toThrow();
    process.env.SOCIAL_TOKEN_KEY = "a-completely-different-key-456";
    expect(() => decryptToken(enc)).toThrow();
    delete process.env.SOCIAL_TOKEN_KEY;
    expect(socialKeyConfigured()).toBe(false);
    expect(() => encryptToken("x")).toThrow(/SOCIAL_TOKEN_KEY/);
  });
});

describe("composing posts", () => {
  it("builds a call for nominations without any people in it", () => {
    const p = composeNominationPost({ title: "U16 State Squad", ageGroup: "U16", scopeName: "Brisbane Hockey", openDate: "2026-06-01T00:00:00Z", closeDate: "2026-06-20T13:59:00Z" }, "https://app.example.com/admin/nominate");
    expect(p.text).toContain("Nominations are open: U16 State Squad");
    expect(p.text).toContain("For: U16");
    expect(p.text).toContain("Nominations close");
    expect(p.link).toBe("https://app.example.com/admin/nominate");
  });
  it("won't compose a post from an announcement aimed at particular teams or ages", () => {
    expect(composeAnnouncementPost({ title: "T", body: "B", targeting: { teamIds: ["U12"] } }).ok).toBe(false);
    expect(composeAnnouncementPost({ title: "T", body: "B", targeting: { maxAge: 12 } }).ok).toBe(false);
    const ok = composeAnnouncementPost({ title: "Presentation night", body: "Friday 7pm" });
    expect(ok.ok && ok.value.text).toBe("Presentation night\n\nFriday 7pm");
  });
  it("cleans a post from the form", () => {
    const NOW = new Date("2026-06-01T00:00:00Z");
    expect(cleanSocialPost({ text: "Hi", accountIds: ["A", "A", "B"] }, NOW)).toMatchObject({ ok: true, value: { text: "Hi", accountIds: ["A", "B"], postAt: NOW.toISOString(), link: null } });
    expect(cleanSocialPost({ text: " ", accountIds: ["A"] }, NOW).ok).toBe(false);
    expect(cleanSocialPost({ text: "Hi", accountIds: [] }, NOW).ok).toBe(false);
    expect(cleanSocialPost({ text: "Hi", accountIds: ["A"], link: "http://plain.com" }, NOW).ok).toBe(false);
    expect(cleanSocialPost({ text: "Hi", accountIds: ["A"], postAt: "2027-06-01T00:00:00Z" }, NOW).ok).toBe(false);
    const long = cleanSocialPost({ text: "x".repeat(5000), accountIds: ["A"] }, NOW);
    expect(long.ok && long.value.text.length).toBe(MAX_POST);
  });
});

// A tiny in-memory stand-in for the two collections.
function fakeDb(accounts: Record<string, any>[]) {
  const posts: Record<string, any>[] = [];
  const match = (d: Record<string, any>, q: Record<string, any>) => Object.entries(q).every(([k, v]) => (v && typeof v === "object" && "$in" in v ? v.$in.includes(d[k]) : v && typeof v === "object" && "$lte" in v ? d[k] <= v.$lte : d[k] === v));
  const col = (rows: Record<string, any>[]) => ({
    find: (q: Record<string, any>) => ({ toArray: async () => rows.filter((r) => match(r, q)) }),
    findOne: async (q: Record<string, any>) => rows.find((r) => match(r, q)) ?? null,
    insertMany: async (docs: Record<string, any>[]) => { rows.push(...docs); },
    updateOne: async (q: Record<string, any>, u: any) => { const r = rows.find((x) => match(x, q)); if (r) Object.assign(r, u.$set); return { modifiedCount: r ? 1 : 0 }; },
    findOneAndUpdate: async (q: Record<string, any>, u: any) => { const r = rows.filter((x) => match(x, q)).sort((a, b) => a.postAt.localeCompare(b.postAt))[0]; if (!r) return null; Object.assign(r, u.$set); r.attempts = (r.attempts ?? 0) + (u.$inc?.attempts ?? 0); return r; },
  });
  return { db: { collection: (n: string) => (n === "social_accounts" ? col(accounts) : col(posts)) } as never, posts };
}
const account = (over: Record<string, any> = {}) => ({ accountId: "A1", platform: "facebook", pageId: "111", pageName: "Lions HC", ownerLevel: "club", ownerId: "c1", status: "active", tokenEnc: "", ...over });
const input = { text: "Hello", link: null, postAt: "2026-06-01T00:00:00.000Z", source: { type: "custom" as const }, by: { id: "u", name: "Pat" } };

describe("queue and publish", () => {
  it("only queues for active pages of the same organisation", async () => {
    const { db, posts } = fakeDb([account(), account({ accountId: "A2", ownerId: "other" }), account({ accountId: "A3", status: "disconnected" })]);
    const r = await queuePosts(db, { level: "club", id: "c1" }, ["A1", "A2", "A3"], input);
    expect(r.queued).toBe(1);
    expect(posts[0]).toMatchObject({ accountId: "A1", status: "queued", ownerId: "c1" });
  });

  it("publishes due posts with the decrypted token, and leaves future ones queued", async () => {
    const { db, posts } = fakeDb([account({ tokenEnc: encryptToken("PAGE-TOKEN") })]);
    await queuePosts(db, { level: "club", id: "c1" }, ["A1"], input);
    await queuePosts(db, { level: "club", id: "c1" }, ["A1"], { ...input, postAt: "2026-07-01T00:00:00.000Z" });
    const r = await processDuePosts(db, new Date("2026-06-02T00:00:00Z"));
    expect(r).toEqual({ posted: 1, failed: 0 });
    expect(fb.postToPage).toHaveBeenCalledWith("111", "PAGE-TOKEN", "Hello", null);
    expect(posts.map((p) => p.status).sort()).toEqual(["posted", "queued"]);
    expect(posts.find((p) => p.status === "posted")?.externalId).toBe("PAGE_1_POST_9");
  });

  it("records a failure and lets it be retried", async () => {
    const { db, posts } = fakeDb([account({ tokenEnc: encryptToken("T") })]);
    await queuePosts(db, { level: "club", id: "c1" }, ["A1"], input);
    fb.postToPage.mockRejectedValueOnce(new Error("(#200) Permissions error"));
    expect(await processDuePosts(db, new Date("2026-06-02T00:00:00Z"))).toEqual({ posted: 0, failed: 1 });
    expect(posts[0]).toMatchObject({ status: "failed", error: "(#200) Permissions error" });
    expect(await retryPost(db, posts[0].postId)).toBe(true);
    expect(await processDuePosts(db)).toMatchObject({ posted: 1 });
  });

  it("fails cleanly when the page was disconnected after queuing", async () => {
    const { db, posts } = fakeDb([account()]);
    await queuePosts(db, { level: "club", id: "c1" }, ["A1"], input);
    (db as any).collection("social_accounts").updateOne({ accountId: "A1" }, { $set: { status: "disconnected" } });
    await processDuePosts(db, new Date("2026-06-02T00:00:00Z"));
    expect(posts[0]).toMatchObject({ status: "failed", error: "That page is no longer connected" });
    expect(fb.postToPage).not.toHaveBeenCalled();
  });
});

describe("withdrawing", () => {
  it("cancels queued posts and removes published ones from the page", async () => {
    const { db, posts } = fakeDb([account({ tokenEnc: encryptToken("TOK") })]);
    await queuePosts(db, { level: "club", id: "c1" }, ["A1"], input);
    expect(await withdrawPost(db, posts[0])).toBe("cancelled");
    posts[0].status = "posted"; posts[0].externalId = "X_1";
    expect(await withdrawPost(db, posts[0])).toBe("removed");
    expect(fb.deletePagePost).toHaveBeenCalledWith("X_1", "TOK");
    expect(posts[0].status).toBe("removed");
    expect(await withdrawPost(db, posts[0])).toBe("nothing");
  });
});
