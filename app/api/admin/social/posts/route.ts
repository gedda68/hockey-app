/**
 * Posts to connected Facebook pages.
 *   GET  → recent posts for the organisations you can act for, with their status
 *   POST { ownerLevel?, ownerId?, accountIds[], text, link?, postAt?, source? }  → queue a post (goes out now, or at postAt)
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { ownersFor, resolveOwner } from "@/lib/social/access";
import { cleanSocialPost } from "@/lib/social/compose";
import { POSTS, processDuePosts, queuePosts, type Source } from "@/lib/social/posts";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const owners = await ownersFor(session);
    if (!owners) return NextResponse.json({ error: "You can't manage social posts" }, { status: 403 });
    if (!owners.length) return NextResponse.json({ posts: [] });
    const db = await getDatabase();
    const posts = await db.collection(POSTS).find({ $or: owners.map((o) => ({ ownerLevel: o.level, ownerId: o.id })) }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(100).toArray();
    return NextResponse.json({ posts });
  } catch (e) {
    console.error("social posts GET error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const o = await resolveOwner(session, { level: b.ownerLevel, id: b.ownerId });
    if ("error" in o) return NextResponse.json({ error: o.error }, { status: o.status });
    const v = cleanSocialPost(b);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

    const src = (b.source && typeof b.source === "object" ? b.source : {}) as Record<string, unknown>;
    const source: Source = src.type === "announcement" || src.type === "nomination-window" ? { type: src.type, id: String(src.id ?? "") } : { type: "custom" };
    const db = await getDatabase();
    const r = await queuePosts(db, o.owner, v.value.accountIds, { text: v.value.text, link: v.value.link, postAt: v.value.postAt, source, by: { id: session.userId, name: session.name } });
    if (!r.queued) return NextResponse.json({ error: "None of those pages are connected for this organisation" }, { status: 400 });
    const sent = Date.parse(v.value.postAt) <= Date.now() ? await processDuePosts(db) : { posted: 0, failed: 0 };
    return NextResponse.json({ success: true, queued: r.queued, ...sent }, { status: 201 });
  } catch (e) {
    console.error("social posts POST error:", e);
    return NextResponse.json({ error: "Failed to queue" }, { status: 500 });
  }
}
