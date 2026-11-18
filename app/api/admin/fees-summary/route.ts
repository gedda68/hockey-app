/**
 * GET /api/admin/fees-summary[?format=csv]
 * The treasurer's summary for the people and clubs the caller can see: billed, collected, owed, overdue, ageing,
 * payment plans, discounts, and who owes most. ?format=csv downloads the debtors list.
 */

import { NextRequest, NextResponse } from "next/server";
import { treasurerContext } from "@/lib/fees/treasurer";
import { DEFAULT_DUE_DAYS, dayOf } from "@/lib/fees/overdue";
import { debtorsCsv, treasurerSummary } from "@/lib/fees/summary";
import { PLANS, loadSettings, nameOf, toSumPayment } from "@/lib/fees/service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const t = await treasurerContext(request, "GET");
    if (!t.ok) return t.res;
    const { db, scope, clubId } = t.ctx;
    const year = request.nextUrl.searchParams.get("year");
    const q: Record<string, unknown> = { ...scope };
    if (clubId && !scope.clubId && !scope.owningAssociationId) q.clubId = clubId;
    if (year && /^\d{4}$/.test(year)) q.seasonYear = year;
    const payments = await db.collection("payments").find(q).limit(10000).toArray();
    const planQ: Record<string, unknown> = {};
    if (clubId) planQ.clubId = clubId;
    else if (typeof scope.clubId === "string") planQ.clubId = scope.clubId;
    else planQ.paymentIds = { $in: payments.map((p) => String(p.paymentId)).slice(0, 5000) };
    const plans = await db.collection(PLANS).find({ ...planQ, status: { $in: ["active", "completed"] } }).limit(2000).toArray();
    const settings = clubId ? await loadSettings(db, clubId) : null;
    const today = dayOf(new Date().toISOString());
    const sum = treasurerSummary(payments.map(toSumPayment), plans.map((p) => ({ planId: String(p.planId), memberId: String(p.memberId), status: String(p.status), instalments: p.instalments })), today, settings?.dueDays ?? DEFAULT_DUE_DAYS, request.nextUrl.searchParams.get("format") === "csv" ? 5000 : 15);

    const ids = sum.debtors.map((d) => d.memberId);
    const members = ids.length ? await db.collection("members").find({ memberId: { $in: ids } }, { projection: { memberId: 1, personalInfo: 1, firstName: 1, lastName: 1, contact: 1 } }).toArray() : [];
    const by = new Map(members.map((m) => [String(m.memberId), m]));
    const debtors = sum.debtors.map((d) => ({ ...d, name: nameOf(by.get(d.memberId)) || d.memberId, email: String(by.get(d.memberId)?.contact?.primaryEmail ?? "") }));
    if (request.nextUrl.searchParams.get("format") === "csv") {
      return new NextResponse(debtorsCsv(debtors), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="fees-owing-${today}.csv"` } });
    }
    const requested = clubId ? await db.collection(PLANS).countDocuments({ clubId, status: "requested" }) : 0;
    return NextResponse.json({ today, clubId, settings, summary: { ...sum, debtors }, requestedPlans: requested });
  } catch (e) {
    console.error("fees summary error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
