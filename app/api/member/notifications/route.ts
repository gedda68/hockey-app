/**
 * GET  /api/member/notifications
 *   Returns all undismissed, unexpired in-app notifications for the current
 *   session's member.  Called on mount by the RenewalReminderBanner component.
 *
 * PATCH /api/member/notifications?notificationId=<id>
 *   Dismisses a single notification (sets dismissedAt to now).  The banner
 *   hides it optimistically; this call persists the dismissal.
 *
 * Both routes are scoped to the caller's own memberId — no additional
 * permission is required beyond being authenticated with a memberId in
 * the session.
 *
 * Collection: member_notifications
 * Document shape:
 *   {
 *     notificationId: string;      // "notif-<uuid>"
 *     memberId:       string;
 *     type:           "renewal_reminder";
 *     seasonYear:     string;
 *     title:          string;
 *     message:        string;
 *     link:           string;      // /admin/my-registrations?role=member&clubId=...
 *     clubId:         string;
 *     clubName:       string;
 *     createdAt:      string;      // ISO
 *     dismissedAt:    string|null; // ISO when dismissed; null = active
 *     expiresAt:      string;      // ISO — 7 days after membership.currentPeriodEnd
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { refreshForMember, loadPrefs } from "@/lib/notifications/engine";
import { allows, classifyLegacy, type Category, type Level } from "@/lib/notifications/prefs";

// ── Shared types (returned to the client) ─────────────────────────────────────

export interface MemberNotification {
  notificationId: string;
  type:           string;
  title:          string;
  message:        string;
  link:           string;
  clubId:         string;
  clubName:       string;
  createdAt:      string;
  expiresAt:      string;
}

/** The inbox shape (GET ?inbox=1): adds level, category, read state and when it happens. */
export interface InboxNotification extends MemberNotification {
  level:    Level;
  category: Category;
  eventAt:  string;
  read:     boolean;
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!session.memberId) {
      // Not a member — return empty; this is not an error
      return NextResponse.json({ notifications: [] });
    }

    const db  = await getDatabase();
    const now = new Date().toISOString();

    // Inbox: bring it up to date, then show what their preferences allow.
    if (new URL(request.url).searchParams.get("inbox") === "1") {
      await refreshForMember(db, session.memberId).catch((e) => console.error("notifications refresh failed:", e));
      const { prefs } = await loadPrefs(db, session.memberId);
      const rows = await db
        .collection("member_notifications")
        .find({ memberId: session.memberId, dismissedAt: null, expiresAt: { $gt: now } })
        .limit(200)
        .toArray();
      const items: InboxNotification[] = rows
        .map((d) => {
          const { level, category } = classifyLegacy(d as { level?: string; category?: string });
          return {
            notificationId: String(d.notificationId ?? ""),
            type: String(d.type ?? ""),
            title: String(d.title ?? ""),
            message: String(d.message ?? ""),
            link: String(d.link ?? ""),
            clubId: String(d.clubId ?? ""),
            clubName: String(d.clubName ?? ""),
            createdAt: String(d.createdAt ?? ""),
            expiresAt: String(d.expiresAt ?? ""),
            level, category,
            eventAt: String(d.eventAt ?? d.createdAt ?? ""),
            read: Boolean(d.readAt),
          };
        })
        .filter((n) => allows(prefs, n))
        .sort((a, b) => Number(a.read) - Number(b.read) || a.eventAt.localeCompare(b.eventAt));
      return NextResponse.json({ notifications: items, unread: items.filter((n) => !n.read).length });
    }

    const docs = await db
      .collection("member_notifications")
      .find({
        memberId:    session.memberId,
        dismissedAt: null,
        expiresAt:   { $gt: now },
      })
      .sort({ createdAt: -1 })
      .toArray();

    const notifications: MemberNotification[] = docs.map((d) => ({
      notificationId: String(d.notificationId ?? ""),
      type:           String(d.type ?? ""),
      title:          String(d.title ?? ""),
      message:        String(d.message ?? ""),
      link:           String(d.link ?? ""),
      clubId:         String(d.clubId ?? ""),
      clubName:       String(d.clubName ?? ""),
      createdAt:      String(d.createdAt ?? ""),
      expiresAt:      String(d.expiresAt ?? ""),
    }));

    return NextResponse.json({ notifications });
  } catch (error: unknown) {
    console.error("💥 notifications GET error:", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}

// ── PATCH — dismiss ───────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!session.memberId) {
      return NextResponse.json({ error: "No member record linked to this account" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => null) as { action?: string; notificationId?: string } | null;

    // Inbox actions: read, read-all, dismiss.
    if (body?.action) {
      const db = await getDatabase();
      const at = new Date().toISOString();
      const mine = { memberId: session.memberId };
      if (body.action === "read-all") {
        await db.collection("member_notifications").updateMany({ ...mine, readAt: null }, { $set: { readAt: at } });
        return NextResponse.json({ ok: true });
      }
      const id = String(body.notificationId ?? "").trim();
      if (!id || !["read", "dismiss"].includes(body.action)) {
        return NextResponse.json({ error: "notificationId and a valid action are required" }, { status: 400 });
      }
      const r = await db.collection("member_notifications").updateOne(
        { ...mine, notificationId: id },
        { $set: body.action === "read" ? { readAt: at } : { dismissedAt: at, readAt: at } },
      );
      if (r.matchedCount === 0) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    const notificationId   = searchParams.get("notificationId")?.trim();

    if (!notificationId) {
      return NextResponse.json({ error: "notificationId query param is required" }, { status: 400 });
    }

    const db = await getDatabase();

    // Scope the update to the caller's own memberId — prevents dismissing
    // another member's notifications even if the notificationId is guessed.
    const result = await db.collection("member_notifications").updateOne(
      { notificationId, memberId: session.memberId },
      { $set: { dismissedAt: new Date().toISOString() } },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("💥 notifications PATCH error:", error);
    return NextResponse.json({ error: "Failed to dismiss notification" }, { status: 500 });
  }
}
