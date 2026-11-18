// lib/fees/overdue.ts
// What is overdue, how overdue, and when to remind. Pure; amounts in cents, days as YYYY-MM-DD in the playing zone.

import { daysBetween } from "@/lib/fees/plans";

export const DEFAULT_DUE_DAYS = 30;
/** Days overdue at which a reminder goes out, each once. Then it's left to the treasurer. */
export const REMINDER_STAGES = [1, 7, 14, 28] as const;

export interface PaymentLike { paymentId: string; memberId: string; amountCents: number; status: string; createdAt: string; dueDate?: string | null; onPlanId?: string | null }

export const dayOf = (iso: string): string => new Date(Date.parse(iso) + 10 * 3600_000).toISOString().slice(0, 10);

/** When a payment falls due: its own due date, else the club's payment terms after it was raised. */
export function dueDateOf(p: Pick<PaymentLike, "createdAt" | "dueDate">, dueDays: number): string {
  if (p.dueDate) return p.dueDate.slice(0, 10);
  return new Date(Date.parse(`${dayOf(p.createdAt)}T00:00:00Z`) + dueDays * 86400000).toISOString().slice(0, 10);
}

export function daysOverdue(dueDate: string, today: string): number { return Math.max(0, daysBetween(dueDate, today)); }

/** The reminder stage (days overdue) now due for something that is `overdueDays` overdue and has had `sent` stages. Null when none is. */
export function nextStage(overdueDays: number, sent: number[]): number | null {
  const reached = REMINDER_STAGES.filter((s) => overdueDays >= s && !sent.includes(s));
  return reached.length ? reached[reached.length - 1] : null; // catch up with one message, the latest stage reached
}

export type Bucket = "notDue" | "d1_30" | "d31_60" | "d61_90" | "d90plus";
export const BUCKET_LABELS: Record<Bucket, string> = { notDue: "Not yet due", d1_30: "1 to 30 days overdue", d31_60: "31 to 60 days", d61_90: "61 to 90 days", d90plus: "Over 90 days" };
export const bucketFor = (overdueDays: number): Bucket => (overdueDays <= 0 ? "notDue" : overdueDays <= 30 ? "d1_30" : overdueDays <= 60 ? "d31_60" : overdueDays <= 90 ? "d61_90" : "d90plus");
