/**
 * PATCH /api/admin/social/posts/{id}  { action: "retry" | "withdraw" }
 *   retry    → put a failed post back in the queue
 *   withdraw → cancel a queued post, or take a published one down from the page
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveOwner } from "@/lib/social/access";
import { POSTS, processDuePosts, retryPost, withdrawPost } from "@/lib/social/posts";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { id } = await params;
    const db = await getDatabase();
    const post = await db.collection(POSTS).findOne({ postId: id });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const o = await resolveOwner(session, { level: post.ownerLevel, id: post.ownerId });
    if ("error" in o) return NextResponse.json({ error: o.error }, { status: o.status });

    const action = (await request.json().catch(() => ({})))?.action;
    if (action === "retry") {
      if (!(await retryPost(db, id))) return NextResponse.json({ error: "Only a failed post can be retried" }, { status: 409 });
      await processDuePosts(db);
      return NextResponse.json({ success: true });
    }
    if (action === "withdraw") {
      try { return NextResponse.json({ success: true, result: await withdrawPost(db, post) }); }
      catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't remove it" }, { status: 502 }); }
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("social posts PATCH error:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
