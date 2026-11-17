/**
 * GET /api/admin/deliveries[?clubId=&days=30&category=&channel=]
 * Club-wide delivery log across every notification type: counts by category and channel, and the people it failed for
 * (latest attempt per person, channel and notification). Covers notifications tied to the club; association-wide and
 * national announcements are checked from the announcement itself.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { canViewReports, reportClub } from "@/lib/auth/reportsGate";
import { DELIVERIES, latestFailed, summarize, type DeliveryRow } from "@/lib/notifications/deliveryLog";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    if (!(await canViewReports(db, session))) return NextResponse.json({ error: "You don't have access to this area" }, { status: 403 });
    const sp = new URL(request.url).searchParams;
    const club = await reportClub(session, sp.get("clubId"));
    if ("error" in club) return NextResponse.json({ error: club.error }, { status: club.status });

    const days = Math.min(Math.max(Number(sp.get("days")) || 30, 1), 90);
    const q: Record<string, unknown> = { clubId: club.clubId, at: { $gte: new Date(Date.now() - days * 86_400_000).toISOString() } };
    if (sp.get("category")) q.category = sp.get("category");
    if (sp.get("channel")) q.channel = sp.get("channel");
    const rows = (await db.collection(DELIVERIES).find(q, { projection: { _id: 0 } }).limit(20000).toArray()) as unknown as DeliveryRow[];

    const failed = latestFailed(rows);
    const shown = failed.slice(0, 100);
    const people = shown.length ? await db.collection("members").find({ memberId: { $in: [...new Set(shown.map((f) => f.memberId))] } }, { projection: { memberId: 1, personalInfo: 1 } }).toArray() : [];
    const name = new Map(people.map((m) => [String(m.memberId), `${m.personalInfo?.firstName ?? ""} ${m.personalInfo?.lastName ?? ""}`.trim() || String(m.memberId)]));
    return NextResponse.json({
      days,
      summary: summarize(rows),
      failedTotal: failed.length,
      failures: shown.map((f) => ({ memberId: f.memberId, name: name.get(f.memberId) ?? f.memberId, channel: f.channel, category: f.category, title: f.title ?? "", dedupeKey: f.dedupeKey, error: f.error ?? "Failed", at: f.at })),
    });
  } catch (e) {
    console.error("deliveries GET error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
