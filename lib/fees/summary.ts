// lib/fees/summary.ts
// The treasurer's numbers: what has been billed, collected, is owed and overdue, how old the debt is, who owes most,
// and what is being paid off on plans. Pure; amounts in cents.

import { bucketFor, dueDateOf, daysOverdue, type Bucket } from "@/lib/fees/overdue";
import { planProgress, type Instalment } from "@/lib/fees/plans";

export interface SumPayment { paymentId: string; memberId: string; amountCents: number; status: string; createdAt: string; dueDate?: string | null; paidDate?: string | null; onPlanId?: string | null; discountCents?: number }
export interface SumPlan { planId: string; memberId: string; status: string; instalments: Instalment[] }

export interface Debtor { memberId: string; outstandingCents: number; overdueCents: number; oldestDaysOverdue: number; onPlan: boolean }
export interface TreasurerSummary {
  billedCents: number; collectedCents: number; outstandingCents: number; overdueCents: number;
  onPlansCents: number; plansActive: number; discountsCents: number; collectedThisMonthCents: number; collectionRate: number | null;
  ageing: Record<Bucket, number>;
  debtors: Debtor[];
}

const monthOf = (day: string) => day.slice(0, 7);
const localDay = (iso: string) => new Date(Date.parse(iso) + 10 * 3600_000).toISOString().slice(0, 10);

export function treasurerSummary(payments: SumPayment[], plans: SumPlan[], today: string, dueDays: number, topDebtors = 15): TreasurerSummary {
  const active = new Map(plans.filter((p) => p.status === "active").map((p) => [p.planId, p]));
  const ageing: Record<Bucket, number> = { notDue: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0 };
  const debtors = new Map<string, Debtor>();
  const owe = (memberId: string, outstanding: number, overdue: number, days: number, onPlan: boolean) => {
    const d = debtors.get(memberId) ?? { memberId, outstandingCents: 0, overdueCents: 0, oldestDaysOverdue: 0, onPlan: false };
    d.outstandingCents += outstanding; d.overdueCents += overdue; d.oldestDaysOverdue = Math.max(d.oldestDaysOverdue, days); d.onPlan = d.onPlan || onPlan;
    debtors.set(memberId, d);
  };
  let billed = 0, collected = 0, outstanding = 0, overdue = 0, discounts = 0, thisMonth = 0;

  for (const p of payments) {
    if (p.status === "refunded" || p.status === "cancelled") continue;
    billed += p.amountCents;
    discounts += p.discountCents ?? 0;
    if (p.status === "paid") {
      collected += p.amountCents;
      if (p.paidDate && monthOf(localDay(p.paidDate)) === monthOf(today)) thisMonth += p.amountCents;
      continue;
    }
    if (p.onPlanId && active.has(p.onPlanId)) continue; // the plan carries it (below)
    const days = daysOverdue(dueDateOf(p, dueDays), today);
    outstanding += p.amountCents;
    ageing[bucketFor(days)] += p.amountCents;
    if (days > 0) overdue += p.amountCents;
    owe(p.memberId, p.amountCents, days > 0 ? p.amountCents : 0, days, false);
  }

  let onPlans = 0;
  for (const plan of active.values()) {
    const pr = planProgress(plan.instalments, today);
    collected += pr.paidCents;
    for (const i of plan.instalments) if (i.status === "paid" && i.paidAt && monthOf(localDay(i.paidAt)) === monthOf(today)) thisMonth += i.amountCents;
    outstanding += pr.remainingCents; onPlans += pr.remainingCents; overdue += pr.overdueCents;
    let oldest = 0;
    for (const i of plan.instalments) {
      if (i.status === "paid") continue;
      const days = daysOverdue(i.dueDate, today);
      ageing[bucketFor(days)] += i.amountCents;
      oldest = Math.max(oldest, days);
    }
    owe(plan.memberId, pr.remainingCents, pr.overdueCents, oldest, true);
  }

  return {
    billedCents: billed, collectedCents: collected, outstandingCents: outstanding, overdueCents: overdue,
    onPlansCents: onPlans, plansActive: active.size, discountsCents: discounts, collectedThisMonthCents: thisMonth,
    collectionRate: billed > 0 ? Math.round((collected / billed) * 1000) / 10 : null,
    ageing,
    debtors: [...debtors.values()].filter((d) => d.outstandingCents > 0).sort((a, b) => b.overdueCents - a.overdueCents || b.outstandingCents - a.outstandingCents || a.memberId.localeCompare(b.memberId)).slice(0, topDebtors),
  };
}

/** Rows for a CSV the treasurer can open in a spreadsheet. Cells starting with a formula character are neutralised. */
export function debtorsCsv(rows: { name: string; email: string; outstandingCents: number; overdueCents: number; oldestDaysOverdue: number; onPlan: boolean }[]): string {
  const cell = (v: string | number | boolean) => { let s = String(v); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines = [["Name", "Email", "Outstanding ($)", "Overdue ($)", "Oldest overdue (days)", "On a payment plan"].join(",")];
  for (const r of rows) lines.push([cell(r.name), cell(r.email), (r.outstandingCents / 100).toFixed(2), (r.overdueCents / 100).toFixed(2), r.oldestDaysOverdue, r.onPlan ? "Yes" : "No"].join(","));
  return lines.join("\n");
}
