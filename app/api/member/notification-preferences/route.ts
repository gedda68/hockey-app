/**
 * GET /api/member/notification-preferences  → { prefs, live }   (live = channels that deliver today)
 * PUT /api/member/notification-preferences  → body is a partial { enabled?, levels?, categories? }; returns the saved prefs
 * Stored on the member (members.notificationPrefs). Always the signed-in member's own.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { applyPrefsPatch, LIVE_CHANNELS } from "@/lib/notifications/prefs";
import { loadPrefs } from "@/lib/notifications/engine";

async function who(): Promise<{ memberId: string } | NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const memberId = session.memberId?.trim();
  if (!memberId) return NextResponse.json({ error: "No member profile on this account" }, { status: 400 });
  return { memberId };
}

export async function GET(): Promise<NextResponse> {
  try {
    const w = await who();
    if (w instanceof NextResponse) return w;
    const { prefs } = await loadPrefs(await getDatabase(), w.memberId);
    return NextResponse.json({ prefs, live: LIVE_CHANNELS });
  } catch (e) {
    console.error("notification-preferences GET error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const w = await who();
    if (w instanceof NextResponse) return w;
    const patch = await request.json().catch(() => null);
    if (!patch || typeof patch !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const db = await getDatabase();
    const { prefs } = await loadPrefs(db, w.memberId);
    const next = applyPrefsPatch(prefs, patch);
    // Clear the refresh stamp so a switched-on category fills its inbox on the next look.
    await db.collection("members").updateOne({ memberId: w.memberId }, { $set: { notificationPrefs: next, notificationsRefreshedAt: null } });
    return NextResponse.json({ prefs: next, live: LIVE_CHANNELS });
  } catch (e) {
    console.error("notification-preferences PUT error:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
