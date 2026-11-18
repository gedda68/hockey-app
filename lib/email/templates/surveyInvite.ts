/**
 * lib/email/templates/surveyInvite.ts
 * Email asking someone to answer a survey. The link works without signing in (it carries their personal token).
 */

import { APP_URL } from "@/lib/email/client";

export interface SurveyInviteOptions {
  name: string;
  title: string;
  intro?: string;
  /** Who is asking, e.g. "Commercial Hockey Club". */
  fromName: string;
  token: string;
  closesAt: string;
  anonymous: boolean;
  onBehalfOf?: string;
  reminder?: boolean;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildSurveyInviteEmail(o: SurveyInviteOptions): { subject: string; html: string; text: string } {
  const url = `${APP_URL.replace(/\/$/, "")}/survey/${encodeURIComponent(o.token)}`;
  const closes = new Date(o.closesAt).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Brisbane" });
  const subject = `${o.reminder ? "Reminder: " : ""}${o.onBehalfOf ? `Survey for ${o.onBehalfOf}: ` : "Survey: "}${o.title}`;
  const privacy = o.anonymous ? "Your answers are anonymous." : "Your answers will be seen by the people running the survey.";
  const lines = [
    `Hi ${o.name || "there"},`,
    `${o.fromName} would like your views${o.onBehalfOf ? ` on behalf of ${o.onBehalfOf}` : ""}: ${o.title}.`,
    ...(o.intro ? [o.intro] : []),
    `${privacy} It closes on ${closes}.`,
  ];
  const text = `${lines.join("\n\n")}\n\nAnswer the survey: ${url}\n\nThis link is personal to you. Please don't forward it.`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;color:#334155">
<h2 style="color:#06054e;margin:0 0 8px">${esc(o.title)}</h2>
${lines.map((l) => `<p>${esc(l)}</p>`).join("")}
<p><a href="${esc(url)}" style="background:#14b8a6;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Answer the survey</a></p>
<p style="color:#94a3b8;font-size:12px">This link is personal to you. Please don't forward it.</p></div>`;
  return { subject, html, text };
}
