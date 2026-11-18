// lib/fees/plans.ts
// Payment plans: splitting what someone owes into instalments, and where a plan stands. Pure; amounts in cents.

export const FREQUENCIES = ["weekly", "fortnightly", "monthly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];
export const FREQUENCY_LABELS: Record<Frequency, string> = { weekly: "Weekly", fortnightly: "Fortnightly", monthly: "Monthly" };

export interface Instalment { n: number; dueDate: string; amountCents: number; status: "due" | "paid"; paidAt?: string; method?: string; note?: string; recordedBy?: string }

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const validDay = (d: string) => DAY_RE.test(d) && new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;

/** The date `i` periods after `start`. Monthly keeps the day of month, clamped to the month's end (31 Jan → 28 Feb → 31 Mar). */
export function addPeriods(start: string, freq: Frequency, i: number): string {
  const d = new Date(`${start}T00:00:00Z`);
  if (freq === "weekly") return new Date(d.getTime() + i * 7 * 86400000).toISOString().slice(0, 10);
  if (freq === "fortnightly") return new Date(d.getTime() + i * 14 * 86400000).toISOString().slice(0, 10);
  const day = d.getUTCDate();
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + i, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(day, last));
  return t.toISOString().slice(0, 10);
}

/** Splits the total into equal instalments to the cent; any odd cents go on the first one so the total is exact. */
export function buildInstalments(totalCents: number, count: number, freq: Frequency, firstDue: string): { ok: true; instalments: Instalment[] } | { ok: false; error: string } {
  if (!Number.isInteger(totalCents) || totalCents <= 0) return { ok: false, error: "There is nothing to pay off" };
  if (!Number.isInteger(count) || count < 2 || count > 24) return { ok: false, error: "Choose between 2 and 24 instalments" };
  if (!FREQUENCIES.includes(freq)) return { ok: false, error: "Choose weekly, fortnightly or monthly" };
  if (!validDay(firstDue)) return { ok: false, error: "Choose the first due date" };
  if (Math.floor(totalCents / count) < 100) return { ok: false, error: "Instalments would be under $1 each. Use fewer." };
  const base = Math.floor(totalCents / count), extra = totalCents - base * count;
  return { ok: true, instalments: Array.from({ length: count }, (_, i) => ({ n: i + 1, dueDate: addPeriods(firstDue, freq, i), amountCents: base + (i === 0 ? extra : 0), status: "due" as const })) };
}

export interface PlanProgress { totalCents: number; paidCents: number; remainingCents: number; overdueCents: number; overdueCount: number; next: Instalment | null; complete: boolean }

/** Where a plan stands on `today` (YYYY-MM-DD). An instalment is overdue the day after it falls due. */
export function planProgress(instalments: Instalment[], today: string): PlanProgress {
  const totalCents = instalments.reduce((s, i) => s + i.amountCents, 0);
  const paidCents = instalments.filter((i) => i.status === "paid").reduce((s, i) => s + i.amountCents, 0);
  const unpaid = instalments.filter((i) => i.status !== "paid").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const overdue = unpaid.filter((i) => i.dueDate < today);
  return { totalCents, paidCents, remainingCents: totalCents - paidCents, overdueCents: overdue.reduce((s, i) => s + i.amountCents, 0), overdueCount: overdue.length, next: unpaid[0] ?? null, complete: unpaid.length === 0 && instalments.length > 0 };
}

export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
export const money = (cents: number) => `${cents < 0 ? "-" : ""}$${(Math.abs(cents) / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
