/**
 * GET  /api/member/calendar   → me and my children, each with their calendar link if one exists
 * POST /api/member/calendar   { action: "create" | "replace" | "stop" | "choose", subjectId, includes? }
 */
import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { createFeed, listFeeds, revokeFeed, rotateFeed, setIncludes, subjectsFor, type Feed } from "@/lib/calendar/service";

const urls = (origin: string, f: Feed) => {
  const https = `${origin}/api/public/calendar/${f.token}.ics`;
  return { url: https, webcalUrl: https.replace(/^https?:/, "webcal:") };
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const me = await resolveSessionMemberId(db, session);
    if (!me) return NextResponse.json({ people: [] });
    const [people, feeds] = await Promise.all([subjectsFor(db, me), listFeeds(db, me)]);
    const origin = request.nextUrl.origin;
    return NextResponse.json({ people: people.map((p) => { const f = feeds.find((x) => x.subjectId === p.memberId); return { ...p, feed: f ? { ...urls(origin, f), includes: f.includes, lastFetchedAt: f.lastFetchedAt ?? null } : null }; }) });
  } catch (e) {
    console.error("member calendar error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const me = await resolveSessionMemberId(db, session);
    if (!me) return NextResponse.json({ error: "No member profile on this account" }, { status: 400 });
    const b = (await request.json().catch(() => ({}))) as { action?: string; subjectId?: string; includes?: unknown };
    const subjectId = String(b.subjectId || me);
    const r = b.action === "create" ? await createFeed(db, me, subjectId, b.includes)
      : b.action === "replace" ? await rotateFeed(db, me, subjectId)
      : b.action === "stop" ? await revokeFeed(db, me, subjectId)
      : b.action === "choose" ? await setIncludes(db, me, subjectId, b.includes) : null;
    if (!r) return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    const feed = (r as { feed?: Feed }).feed;
    return NextResponse.json({ ok: true, ...(feed ? { feed: { ...urls(request.nextUrl.origin, feed), includes: feed.includes } } : {}) });
  } catch (e) {
    console.error("member calendar post error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
