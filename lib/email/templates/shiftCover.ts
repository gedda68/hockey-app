/** lib/email/templates/shiftCover.ts — a volunteer asked for cover: tell the coordinator, and ask people who've done the job before. */

import { APP_URL } from "@/lib/email/client";

export interface CoverOptions { name: string; clubName: string; label: string; whenText: string; timeText: string; location?: string; volunteer: string }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const wrap = (title: string, lines: string[], cta: string, url: string) => ({
  html: `<div style="font-family:Arial,sans-serif;max-width:520px;color:#334155"><h2 style="color:#06054e;margin:0 0 8px">${esc(title)}</h2>${lines.map((l) => `<p>${esc(l)}</p>`).join("")}<p><a href="${esc(url)}" style="background:#14b8a6;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">${esc(cta)}</a></p></div>`,
  text: `${lines.join("\n\n")}\n\n${cta}: ${url}`,
});
const where = (o: CoverOptions) => `${o.label.toLowerCase()} on ${o.whenText}, ${o.timeText}${o.location ? ` at ${o.location}` : ""}`;

/** To whoever runs the roster. */
export function buildCoverCoordinatorEmail(o: CoverOptions): { subject: string; html: string; text: string } {
  const url = `${APP_URL.replace(/\/$/, "")}/admin/volunteer-shifts`;
  const lines = [`Hi ${o.name || "there"},`, `${o.volunteer} can't make ${where(o)} and has asked for cover. They stay on the shift until someone takes it over.`, "We've asked a few people who've done this job before. You can also put someone on the shift yourself."];
  return { subject: `Cover needed: ${o.label}, ${o.whenText}`, ...wrap(`Cover needed: ${o.label}`, lines, "Open the roster", url) };
}

/** To someone who has done this job before. */
export function buildCoverNudgeEmail(o: CoverOptions): { subject: string; html: string; text: string } {
  const url = `${APP_URL.replace(/\/$/, "")}/admin/my-shifts`;
  const lines = [`Hi ${o.name || "there"},`, `${o.clubName} needs someone to cover ${where(o)}. You've helped with this before, so we thought of you.`, "If you can, open My shifts and tap Take over. If not, no need to reply."];
  return { subject: `Can you help? ${o.label}, ${o.whenText}`, ...wrap(`Can you cover ${o.label.toLowerCase()}?`, lines, "See the shift", url) };
}
