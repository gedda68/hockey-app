/**
 * Announcements written by admins, delivered through the notification engine to the audience.
 *   GET  → announcements this person may manage (their club / association; everything for a super-admin)
 *   POST { level: "global"|"association"|"club", scopeId?, title, body, link?, publishAt?, expiresAt? }
 * Who may write: Communications (matrix) at edit level where it applies, otherwise by login role
 * (super-admin → everyone; association-admin → their association and its clubs; club-admin/committee → their club).
 * Collection: announcements.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { cleanAnnouncement } from "@/lib/announcements/validate";
import { canWriteTo, COL, teamsBelongTo, writableAudiences } from "@/lib/announcements/access";
import { composeAnnouncementPost } from "@/lib/social/compose";
import { ACCOUNTS, processDuePosts, queuePosts } from "@/lib/social/posts";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const audiences = await writableAudiences(session);
    if (!audiences) return NextResponse.json({ error: "You can't manage announcements" }, { status: 403 });
    const db = await getDatabase();
    const or: Record<string, unknown>[] = [];
    if (session.role === "super-admin") or.push({});
    else {
      if (session.clubId) or.push({ level: "club", scopeId: session.clubId });
      if (session.associationId) or.push({ level: "association", scopeId: session.associationId });
    }
    const rows = or.length ? await db.collection(COL).find(or.length === 1 ? or[0] : { $or: or }, { projection: { _id: 0 } }).sort({ publishAt: -1 }).limit(100).toArray() : [];
    const teams = session.clubId
      ? (await db.collection("teams").find({ clubId: session.clubId, status: { $ne: "archived" } }, { projection: { teamId: 1, name: 1, displayName: 1 } }).limit(200).toArray()).map((t) => ({ teamId: String(t.teamId), name: String(t.displayName || t.name || t.teamId) }))
      : [];
    return NextResponse.json({ announcements: rows, audiences, teams, defaults: { clubId: session.clubId ?? "", associationId: session.associationId ?? "" } });
  } catch (e) {
    console.error("announcements GET error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const audiences = await writableAudiences(session);
    if (!audiences) return NextResponse.json({ error: "You can't write announcements" }, { status: 403 });

    const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const v = cleanAnnouncement(raw);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    if (!audiences.includes(v.value.level) || !(await canWriteTo(session, v.value.level, v.value.scopeId))) {
      return NextResponse.json({ error: "You can't write to that audience" }, { status: 403 });
    }

    const db = await getDatabase();
    const teamIds = v.value.targeting?.teamIds ?? [];
    if (teamIds.length && !(await teamsBelongTo(db, teamIds, v.value.level, v.value.scopeId))) {
      return NextResponse.json({ error: "One of those teams isn't in that club or association" }, { status: 400 });
    }
    // Optionally also post it publicly to the club's or association's Facebook page(s).
    let socialAccounts: string[] = [];
    if (raw?.postToSocial === true) {
      if (v.value.level === "global") return NextResponse.json({ error: "Announcements for everyone can't be posted to a page from here" }, { status: 400 });
      const c = composeAnnouncementPost({ title: v.value.title, body: v.value.body, targeting: v.value.targeting });
      if (!c.ok) return NextResponse.json({ error: c.error }, { status: 400 });
      const wanted = Array.isArray(raw.socialAccountIds) ? raw.socialAccountIds.map(String) : null;
      const pages = await db.collection(ACCOUNTS).find({ ownerLevel: v.value.level, ownerId: v.value.scopeId, status: "active", ...(wanted ? { accountId: { $in: wanted } } : {}) }, { projection: { accountId: 1 } }).toArray();
      if (!pages.length) return NextResponse.json({ error: "Connect a Facebook page first (Social pages)" }, { status: 400 });
      socialAccounts = pages.map((p) => String(p.accountId));
    }
    const now = new Date().toISOString();
    const doc = {
      announcementId: `ANN-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      ...v.value,
      status: "published",
      createdBy: (session.memberId ? await resolveSessionMemberId(db, session) : "") || session.userId,
      createdByName: session.name,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection(COL).insertOne({ ...doc });
    let social: { queued: number } | undefined;
    if (socialAccounts.length) {
      const c = composeAnnouncementPost({ title: doc.title, body: doc.body });
      const link = /^https:\/\//i.test(doc.link ?? "") ? doc.link : null;
      social = await queuePosts(db, { level: doc.level as "club" | "association", id: doc.scopeId }, socialAccounts, { text: c.ok ? c.value.text : doc.title, link, postAt: doc.publishAt, source: { type: "announcement", id: doc.announcementId }, by: { id: doc.createdBy, name: session.name } });
      if (Date.parse(doc.publishAt) <= Date.now()) await processDuePosts(db).catch(() => undefined);
    }
    return NextResponse.json({ success: true, announcement: doc, ...(social ? { social } : {}) }, { status: 201 });
  } catch (e) {
    console.error("announcements POST error:", e);
    return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
  }
}
