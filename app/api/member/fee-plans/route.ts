/**
 * GET  /api/member/fee-plans   → my payment plan (or request), and whether I can ask for one
 * POST /api/member/fee-plans   { count, frequency, note? } → ask the club for a payment plan over what I (and my children) owe
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { childrenOf } from "@/lib/access/guardians";
import { dayOf } from "@/lib/fees/overdue";
import { FREQUENCIES, planProgress, type Frequency, type Instalment } from "@/lib/fees/plans";
import { PLANS, centsOf, overdueFor, requestPlan } from "@/lib/fees/service";
import { clubOfMember } from "@/lib/volunteers/access";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const me = await resolveSessionMemberId(db, session);
    if (!me) return NextResponse.json({ plan: null, canRequest: false, owingCents: 0, overdueCents: 0 });
    const today = dayOf(new Date().toISOString());
    const plan = await db.collection(PLANS).findOne({ memberId: me, status: { $in: ["requested", "active"] } }, { projection: { _id: 0 } });
    const kids = (await childrenOf(db, me).catch(() => [])).map((k: any) => String(k.memberId));
    const owing = await db.collection("payments").find({ memberId: { $in: [me, ...kids] }, status: "pending", onPlanId: null }, { projection: { amount: 1, amountCents: 1 } }).limit(100).toArray();
    const owingCents = owing.reduce((s, p) => s + centsOf(p), 0);
    const overdue = await overdueFor(db, me, today);
    return NextResponse.json({ today, plan: plan ? { ...plan, progress: (plan.instalments as Instalment[])?.length ? planProgress(plan.instalments as Instalment[], today) : null } : null, canRequest: !plan && owingCents >= 2000, owingCents, overdueCents: overdue.overdueCents });
  } catch (e) {
    console.error("member fee plan error:", e);
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
    const b = (await request.json().catch(() => ({}))) as { count?: unknown; frequency?: unknown; note?: unknown };
    const count = Math.round(Number(b.count));
    if (!Number.isInteger(count) || count < 2 || count > 12) return NextResponse.json({ error: "Choose between 2 and 12 instalments" }, { status: 400 });
    const frequency = (FREQUENCIES as readonly string[]).includes(String(b.frequency)) ? (b.frequency as Frequency) : "fortnightly";
    const r = await requestPlan(db, me, (await clubOfMember(db, me))?.clubId ?? null, { count, frequency, note: String(b.note ?? "") });
    return r.ok ? NextResponse.json({ ok: true, planId: r.planId }, { status: 201 }) : NextResponse.json({ error: r.error }, { status: r.status });
  } catch (e) {
    console.error("member fee plan request error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
