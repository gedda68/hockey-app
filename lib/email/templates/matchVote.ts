/** lib/email/templates/matchVote.ts — "vote for your player of the match". */
import { APP_URL } from "@/lib/email/client";

export interface MatchVoteEmail { name: string; teamName: string; opponent: string; whenText: string; closesText: string }
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildVoteEmail(o: MatchVoteEmail): { subject: string; html: string; text: string } {
  const url = `${APP_URL.replace(/\/$/, "")}/admin/my-votes`;
  const vs = o.opponent ? ` against ${o.opponent}` : "";
  const subject = `Who was best on ground? ${o.teamName}, ${o.whenText}`;
  const lines = [
    `Hi ${o.name || "there"},`,
    `${o.teamName} played${vs} on ${o.whenText}. Vote for your top three players: 3 points for first, 2 for second and 1 for third. You can't vote for yourself.`,
    `Voting closes ${o.closesText}.`,
  ];
  const text = `${lines.join("\n\n")}\n\nVote: ${url}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;color:#334155"><h2 style="color:#06054e;margin:0 0 8px">Player of the match</h2>${lines.map((l) => `<p>${esc(l)}</p>`).join("")}<p><a href="${esc(url)}" style="background:#f59e0b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Cast your votes</a></p></div>`;
  return { subject, html, text };
}
