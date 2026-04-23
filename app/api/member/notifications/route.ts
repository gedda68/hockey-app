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

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET() {
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
