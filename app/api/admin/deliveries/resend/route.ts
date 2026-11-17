/**
 * POST /api/admin/deliveries/resend   { dedupeKey?, category?, channel?, clubId? }
 * Tries the club's failed deliveries again (up to 200 per call). People who have since switched the channel off,
 * or who still have no address on file, are skipped. Needs the same access as the delivery log.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { canViewReports, reportClub } from "@/lib/auth/reportsGate";
import { DELIVERIES, latestFailed, type DeliveryRow } from "@/lib/notifications/deliveryLog";
import { resendFailed } from "@/lib/notifications/resend";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    if (!(await canViewReports(db, session))) return NextResponse.json({ error: "You don't have access to this area" }, { status: 403 });
    const b = (await request.json().catch(() => ({}))) as Record<string, string | undefined>;
    const club = await reportClub(session, b.clubId);
    if ("error" in club) return NextResponse.json({ error: club.error }, { status: club.status });

    const q: Record<string, unknown> = { clubId: club.clubId, at: { $gte: new Date(Date.now() - 30 * 86_400_000).toISOString() } };
    for (const k of ["dedupeKey", "category", "channel"] as const) if (b[k]) q[k] = b[k];
    const rows = (await db.collection(DELIVERIES).find(q, { projection: { _id: 0 } }).limit(20000).toArray()) as unknown as DeliveryRow[];
    const result = await resendFailed(db, latestFailed(rows));
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error("deliveries resend error:", e);
    return NextResponse.json({ error: "Failed to resend" }, { status: 500 });
  }
}
