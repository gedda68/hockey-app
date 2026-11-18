/**
 * lib/email/templates/rsvpRequest.ts
 * "Can you play?" email. The link opens a page with big In / Maybe / Out buttons (one tap, no sign-in). The email links
 * don't record an answer themselves, so mail scanners that open every link can't answer for anyone.
 */

import { APP_URL } from "@/lib/email/client";

export interface RsvpEmailOptions {
  name: string;
  title: string;
  whenText: string;
  venue?: string;
  note?: string;
  teamName: string;
  token: string;
  /** Juniors: the parent is asked about their child. */
  forChild?: string;
  reminder?: boolean;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildRsvpEmail(o: RsvpEmailOptions): { subject: string; html: string; text: string } {
  const base = `${APP_URL.replace(/\/$/, "")}/rsvp/${encodeURIComponent(o.token)}`;
  const who = o.forChild ? `Can ${o.forChild} play` : "Can you play";
  const subject = `${o.reminder ? "Reminder: " : ""}${who}? ${o.title} (${o.whenText})`;
  const lines = [
    `Hi ${o.name || "there"},`,
    `${o.teamName} needs to know: ${who.toLowerCase()} on ${o.whenText}${o.venue ? ` at ${o.venue}` : ""}? (${o.title})`,
    ...(o.note ? [o.note] : []),
  ];
  const text = `${lines.join("\n\n")}\n\nTap to answer: ${base}\n\nThis link is personal to you. You can change your answer any time before the match.`;
  const btn = (label: string, colour: string) => `<a href="${esc(base)}" style="background:${colour};color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin:0 6px 6px 0">${label}</a>`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;color:#334155">
<h2 style="color:#06054e;margin:0 0 8px">${esc(who)}? ${esc(o.whenText)}</h2>
${lines.map((l) => `<p>${esc(l)}</p>`).join("")}
<p>${btn("I'm in", "#16a34a")}${btn("Maybe", "#d97706")}${btn("Can't make it", "#dc2626")}</p>
<p style="color:#94a3b8;font-size:12px">Tap one, then confirm on the next page. This link is personal to you. You can change your answer any time before the match.</p></div>`;
  return { subject, html, text };
}
