// lib/social/posts.ts — queueing posts to connected pages, publishing the ones that are due, and taking them down.
// Collections: social_accounts (one connected page, token encrypted) and social_posts (one row per page per post).

import type { Db } from "mongodb";
import { decryptToken } from "@/lib/social/crypto";
import { deletePagePost, postToPage } from "@/lib/social/facebook";

export const ACCOUNTS = "social_accounts";
export const POSTS = "social_posts";
export const BATCH = 20;

export type PostStatus = "queued" | "posting" | "posted" | "failed" | "cancelled" | "removed";
export interface Source { type: "announcement" | "nomination-window" | "custom"; id?: string }
export interface Owner { level: "club" | "association"; id: string }

export interface QueueInput { text: string; link: string | null; postAt: string; source: Source; by: { id: string; name: string } }

/** One queued row per page. Pages must belong to `owner`; anything else is ignored. */
export async function queuePosts(db: Db, owner: Owner, accountIds: string[], input: QueueInput): Promise<{ queued: number; postIds: string[] }> {
  const accounts = await db.collection(ACCOUNTS).find({ accountId: { $in: accountIds }, ownerLevel: owner.level, ownerId: owner.id, status: "active" }, { projection: { accountId: 1, platform: 1, pageName: 1 } }).toArray();
  const now = new Date().toISOString();
  const rows = accounts.map((a) => ({
    postId: `SOC-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    accountId: String(a.accountId), platform: String(a.platform), pageName: String(a.pageName ?? ""),
    ownerLevel: owner.level, ownerId: owner.id,
    text: input.text, link: input.link, postAt: input.postAt, source: input.source,
    status: "queued" as PostStatus, attempts: 0, createdBy: input.by.id, createdByName: input.by.name, createdAt: now, updatedAt: now,
  }));
  if (rows.length) await db.collection(POSTS).insertMany(rows.map((r) => ({ ...r })));
  return { queued: rows.length, postIds: rows.map((r) => r.postId) };
}

/** Publishes up to BATCH posts that are due. One failure never stops the others. */
export async function processDuePosts(db: Db, now: Date = new Date()): Promise<{ posted: number; failed: number }> {
  let posted = 0;
  let failed = 0;
  for (let i = 0; i < BATCH; i++) {
    const claimed = await db.collection(POSTS).findOneAndUpdate(
      { status: "queued", postAt: { $lte: now.toISOString() } },
      { $set: { status: "posting", updatedAt: now.toISOString() }, $inc: { attempts: 1 } },
      { sort: { postAt: 1 }, returnDocument: "after" },
    );
    if (!claimed) break;
    try {
      const account = await db.collection(ACCOUNTS).findOne({ accountId: claimed.accountId, status: "active" });
      if (!account) throw new Error("That page is no longer connected");
      const externalId = await postToPage(String(account.pageId), decryptToken(String(account.tokenEnc)), String(claimed.text), claimed.link ? String(claimed.link) : null);
      await db.collection(POSTS).updateOne({ postId: claimed.postId }, { $set: { status: "posted", externalId, postedAt: new Date().toISOString(), error: null, updatedAt: new Date().toISOString() } });
      posted++;
    } catch (e) {
      failed++;
      await db.collection(POSTS).updateOne({ postId: claimed.postId }, { $set: { status: "failed", error: (e instanceof Error ? e.message : String(e)).slice(0, 200), updatedAt: new Date().toISOString() } });
    }
  }
  return { posted, failed };
}

/** Cancel a queued post, or take a published one down from the page. Returns what happened. */
export async function withdrawPost(db: Db, post: Record<string, any>): Promise<"cancelled" | "removed" | "nothing"> {
  if (post.status === "queued" || post.status === "failed") {
    await db.collection(POSTS).updateOne({ postId: post.postId }, { $set: { status: "cancelled", updatedAt: new Date().toISOString() } });
    return "cancelled";
  }
  if (post.status === "posted" && post.externalId) {
    const account = await db.collection(ACCOUNTS).findOne({ accountId: post.accountId, status: "active" });
    if (!account) throw new Error("That page is no longer connected, so the post can't be removed from here");
    await deletePagePost(String(post.externalId), decryptToken(String(account.tokenEnc)));
    await db.collection(POSTS).updateOne({ postId: post.postId }, { $set: { status: "removed", updatedAt: new Date().toISOString() } });
    return "removed";
  }
  return "nothing";
}

/** Put a failed post back in the queue to try again now. */
export async function retryPost(db: Db, postId: string): Promise<boolean> {
  const r = await db.collection(POSTS).updateOne({ postId, status: "failed" }, { $set: { status: "queued", postAt: new Date().toISOString(), error: null, updatedAt: new Date().toISOString() } });
  return r.modifiedCount > 0;
}
