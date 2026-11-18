/** lib/email/templates/shiftReminder.ts — reminder for a volunteer shift. */

import { APP_URL } from "@/lib/email/client";

export interface ShiftReminderOptions { name: string; clubName: string; label: string; whenText: string; timeText: string; location?: string; notes?: string; evening: boolean }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildShiftReminderEmail(o: ShiftReminderOptions): { subject: string; html: string; text: string } {
  const url = `${APP_URL.replace(/\/$/, "")}/admin/my-shifts`;
  const subject = `${o.evening ? "Tomorrow" : "Coming up"}: ${o.label} shift, ${o.whenText}`;
  const lines = [
    `Hi ${o.name || "there"},`,
    `Thank you for helping ${o.clubName}. You're on ${o.label.toLowerCase()} ${o.evening ? "tomorrow" : "soon"}: ${o.whenText}, ${o.timeText}${o.location ? ` at ${o.location}` : ""}.`,
    ...(o.notes ? [o.notes] : []),
    "Can't make it? Open My shifts and ask for cover so someone can take your place.",
  ];
  const text = `${lines.join("\n\n")}\n\nMy shifts: ${url}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;color:#334155"><h2 style="color:#06054e;margin:0 0 8px">${esc(o.label)}: ${esc(o.whenText)}</h2>${lines.map((l) => `<p>${esc(l)}</p>`).join("")}<p><a href="${esc(url)}" style="background:#14b8a6;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">My shifts</a></p></div>`;
  return { subject, html, text };
}
