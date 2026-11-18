/**
 * GET  /api/admin/fee-plans   → the club's payment plans (requests, active, recently finished) with progress
 * POST /api/admin/fee-plans   { action: "start" | "approve" | "decline" | "cancel" | "record", ... }
 *   start:   { payerId, count, frequency, firstDue, paymentIds? }
 *   approve: { planId, count, frequency, firstDue }
 *   record:  { planId, n, method, note? }   (an instalment was received)
 */

import { NextRequest, NextResponse } from "next/server";
import { treasurerContext } from "@/lib/fees/treasurer";
import { dayOf } from "@/lib/fees/overdue";
import { FREQUENCIES, planProgress, type Frequency, type Instalment } from "@/lib/fees/plans";
import { PLANS, cancelPlan, nameOf, recordInstalment, startPlan } from "@/lib/fees/service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const t = await treasurerContext(request, "GET");
    if (!t.ok) return t.res;
    const { db, clubId } = t.ctx;
    if (!clubId) return NextResponse.json({ error: "Payment plans are managed from a club's account" }, { status: 400 });
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const plans = await db.collection(PLANS).find({ clubId, $or: [{ status: { $in: ["requested", "active"] } }, { endedAt: { $gte: since } }, { completedAt: { $gte: since } }] }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(200).toArray();
    const members = await db.collection("members").find({ memberId: { $in: plans.map((p) => String(p.memberId)) } }, { projection: { memberId: 1, personalInfo: 1, firstName: 1, lastName: 1 } }).toArray();
    const nm = new Map(members.map((m) => [String(m.memberId), nameOf(m)]));
    const today = dayOf(new Date().toISOString());
    return NextResponse.json({ today, plans: plans.map((p) => ({ ...p, name: nm.get(String(p.memberId)) ?? String(p.memberId), progress: (p.instalments as Instalment[]).length ? planProgress(p.instalments as Instalment[], today) : null })) });
  } catch (e) {
    console.error("fee plans list error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const t = await treasurerContext(request, "POST");
    if (!t.ok) return t.res;
    const { db, clubId, session } = t.ctx;
    if (!clubId) return NextResponse.json({ error: "Payment plans are managed from a club's account" }, { status: 400 });
    const b = (await request.json().catch(() => ({}))) as Record<string, any>;
    const by = String(session.memberId ?? session.userId ?? "");
    const freq = (FREQUENCIES as readonly string[]).includes(b.frequency) ? (b.frequency as Frequency) : "fortnightly";
    const plan = { count: Math.round(Number(b.count)), frequency: freq, firstDue: String(b.firstDue ?? "") };
    let r;
    if (b.action === "start") r = await startPlan(db, { clubId, payerId: String(b.payerId ?? ""), paymentIds: Array.isArray(b.paymentIds) ? b.paymentIds.map(String) : undefined, ...plan, by });
    else if (b.action === "approve") r = await startPlan(db, { clubId, planId: String(b.planId ?? ""), ...plan, by });
    else if (b.action === "decline") r = await cancelPlan(db, String(b.planId ?? ""), clubId, "declined");
    else if (b.action === "cancel") r = await cancelPlan(db, String(b.planId ?? ""), clubId, "cancelled");
    else if (b.action === "record") {
      const owns = await db.collection(PLANS).findOne({ planId: String(b.planId ?? ""), clubId }, { projection: { planId: 1 } });
      r = owns ? await recordInstalment(db, String(b.planId), Math.round(Number(b.n)), { method: String(b.method ?? "other"), note: b.note ? String(b.note) : undefined, by }) : { ok: false as const, status: 404, error: "Plan not found" };
    } else return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.error }, { status: r.status });
  } catch (e) {
    console.error("fee plans action error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
