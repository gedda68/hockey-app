/** lib/email/templates/awardWinner.ts — "you've won". */
import { APP_URL } from "@/lib/email/client";

export interface WinnerEmail { name: string; clubName: string; awards: string[]; seasonYear: string }
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildWinnerEmail(o: WinnerEmail): { subject: string; html: string; text: string } {
  const url = `${APP_URL.replace(/\/$/, "")}/admin/season-awards`;
  const list = o.awards.join(", ");
  const subject = `Congratulations! ${list}, ${o.clubName} ${o.seasonYear}`;
  const lines = [`Hi ${o.name || "there"},`, `Congratulations! ${o.clubName} has named you ${list} for ${o.seasonYear}.`, "Thank you for everything you've given the club this season."];
  const text = `${lines.join("\n\n")}\n\nHonour roll: ${url}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;color:#334155"><h2 style="color:#06054e;margin:0 0 8px">🏆 ${esc(list)}</h2>${lines.map((l) => `<p>${esc(l)}</p>`).join("")}<p><a href="${esc(url)}" style="background:#f59e0b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">See the honour roll</a></p></div>`;
  return { subject, html, text };
}
