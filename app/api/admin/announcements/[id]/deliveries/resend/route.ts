/**
 * POST /api/admin/announcements/{id}/deliveries/resend
 * Tries this announcement's failed deliveries again (up to 200 per call). Only for people who manage the announcement.
 */

import { NextRequest, NextResponse } from "next/server";
import { loadManageable } from "@/lib/announcements/manage";
import { DELIVERIES, latestFailed, type DeliveryRow } from "@/lib/notifications/deliveryLog";
import { resendFailed } from "@/lib/notifications/resend";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const { id } = await params;
    const r = await loadManageable(id);
    if (r.response) return r.response;
    const rows = (await r.db.collection(DELIVERIES).find({ dedupeKey: `announcement:${id}` }, { projection: { _id: 0 } }).limit(20000).toArray()) as unknown as DeliveryRow[];
    return NextResponse.json({ success: true, ...(await resendFailed(r.db, latestFailed(rows))) });
  } catch (e) {
    console.error("announcement resend error:", e);
    return NextResponse.json({ error: "Failed to resend" }, { status: 500 });
  }
}
