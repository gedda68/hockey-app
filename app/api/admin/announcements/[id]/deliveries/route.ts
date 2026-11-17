/**
 * GET /api/admin/announcements/{id}/deliveries
 * How an announcement was delivered: people reached per channel, and who it failed for (with the reason).
 * Only for people who may manage that announcement.
 */

import { NextRequest, NextResponse } from "next/server";
import { loadManageable } from "@/lib/announcements/manage";
import { DELIVERIES, tally, type DeliveryRow } from "@/lib/notifications/deliveryLog";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const { id } = await params;
    const r = await loadManageable(id);
    if (r.response) return r.response;
    const rows = (await r.db.collection(DELIVERIES).find({ dedupeKey: `announcement:${id}` }, { projection: { _id: 0 } }).limit(20000).toArray()) as unknown as DeliveryRow[];
    const counts = tally(rows);

    // The people it failed for: those whose latest attempt on a channel failed.
    const latest = new Map<string, DeliveryRow>();
    for (const x of rows) { const k = `${x.channel}|${x.memberId}`; const c = latest.get(k); if (!c || x.at >= c.at) latest.set(k, x); }
    const failed = [...latest.values()].filter((x) => x.status === "failed").sort((a, b) => b.at.localeCompare(a.at)).slice(0, 25);
    const people = failed.length ? await r.db.collection("members").find({ memberId: { $in: [...new Set(failed.map((f) => f.memberId))] } }, { projection: { memberId: 1, personalInfo: 1 } }).toArray() : [];
    const name = new Map(people.map((m) => [String(m.memberId), `${m.personalInfo?.firstName ?? ""} ${m.personalInfo?.lastName ?? ""}`.trim() || String(m.memberId)]));
    return NextResponse.json({
      counts,
      failures: failed.map((f) => ({ memberId: f.memberId, name: name.get(f.memberId) ?? f.memberId, channel: f.channel, error: f.error ?? "Failed", at: f.at })),
    });
  } catch (e) {
    console.error("announcement deliveries GET error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
