/** lib/email/templates/feeOverdue.ts — reminder that fees or a plan instalment are overdue. One email lists everything. */

import { APP_URL } from "@/lib/email/client";
import { money } from "@/lib/fees/plans";

export interface OverdueLine { label: string; amountCents: number; dueText: string; daysOverdue: number; forName?: string }
export interface OverdueEmailOptions { name: string; clubName: string; lines: OverdueLine[]; onPlan: boolean }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildOverdueEmail(o: OverdueEmailOptions): { subject: string; html: string; text: string } {
  const url = `${APP_URL.replace(/\/$/, "")}/admin/my-fees`;
  const total = o.lines.reduce((s, l) => s + l.amountCents, 0);
  const row = (l: OverdueLine) => `${l.forName ? `${l.forName}: ` : ""}${l.label}, ${money(l.amountCents)} (was due ${l.dueText}, ${l.daysOverdue} ${l.daysOverdue === 1 ? "day" : "days"} ago)`;
  const intro = `${o.onPlan ? "An instalment on your payment plan" : "A payment"} with ${o.clubName} is overdue. The total overdue is ${money(total)}.`;
  const lines = [`Hi ${o.name || "there"},`, intro, ...o.lines.map(row), "If you've already paid, thank you, and please ignore this. If money is tight, you can ask the club for a payment plan from My fees."];
  const text = `${lines.join("\n\n")}\n\nMy fees: ${url}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;color:#334155"><h2 style="color:#06054e;margin:0 0 8px">Payment overdue: ${esc(money(total))}</h2><p>Hi ${esc(o.name || "there")},</p><p>${esc(intro)}</p><ul>${o.lines.map((l) => `<li>${esc(row(l))}</li>`).join("")}</ul><p>If you've already paid, thank you, and please ignore this. If money is tight, you can ask the club for a payment plan from My fees.</p><p><a href="${esc(url)}" style="background:#14b8a6;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Open My fees</a></p></div>`;
  return { subject: `Payment overdue: ${money(total)} to ${o.clubName}`, html, text };
}
