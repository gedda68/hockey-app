import { APP_URL } from "@/lib/email/client";

export type WeeklyDigestMatch = {
  scheduledStart: string | null;
  venueName: string | null;
  seasonCompetitionId: string;
  round: number | null;
  divisionName: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
};

export type WeeklyDigestNews = {
  title: string;
  publishDate: string | null;
  id: string;
};

export function buildWeeklyDigestEmail(opts: {
  associationName: string;
  introText?: string | null;
  weekLabel: string; // e.g. "Week of 27 Apr 2026"
  upcoming: WeeklyDigestMatch[];
  recentResults: WeeklyDigestMatch[];
  news: WeeklyDigestNews[];
}): { subject: string; html: string; text: string } {
  const subject = `Weekly digest — ${opts.associationName} (${opts.weekLabel})`;

  const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#f1f5f9;">
      <tr><td align="center">
        <table width="680" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:#06054e;padding:26px 28px;">
              <div style="color:#ffffff;font-weight:900;font-size:18px;letter-spacing:0.5px;">🏑 HOCKEY APP</div>
              <div style="color:#c7d2fe;font-size:13px;margin-top:4px;">Weekly digest · ${escapeHtml(opts.weekLabel)}</div>
              <div style="color:#ffffff;font-size:16px;font-weight:800;margin-top:10px;">${escapeHtml(opts.associationName)}</div>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 28px 4px;">
              ${opts.introText ? `<p style="margin:0;color:#334155;font-size:14px;line-height:1.6;">${escapeHtml(opts.introText)}</p>` : ""}
            </td>
          </tr>

          ${section("Upcoming fixtures (next 7 days)", opts.upcoming, "upcoming")}
          ${section("Recent results (last 7 days)", opts.recentResults, "results")}
          ${newsSection(opts.news)}

          <tr>
            <td style="padding:18px 28px 26px;color:#64748b;font-size:12px;">
              Sent via Hockey App · You’re receiving this because your association enabled weekly digests.
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>
`.trim();

  const text = [
    `Weekly digest — ${opts.associationName} (${opts.weekLabel})`,
    opts.introText ? `\n${opts.introText}\n` : "",
    "\nUPCOMING FIXTURES (next 7 days)",
    ...opts.upcoming.map((m) => `- ${oneLine(m, false)}`),
    "\nRECENT RESULTS (last 7 days)",
    ...opts.recentResults.map((m) => `- ${oneLine(m, true)}`),
    "\nNEWS",
    ...(opts.news.length ? opts.news.map((n) => `- ${n.title}`) : ["- (none)"]),
    `\nOpen: ${APP_URL}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

function section(title: string, items: WeeklyDigestMatch[], kind: "upcoming" | "results") {
  const body =
    items.length === 0
      ? `<p style="margin:0;color:#64748b;font-size:13px;">No ${kind === "upcoming" ? "fixtures" : "results"} to show.</p>`
      : `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${items
            .slice(0, 20)
            .map((m) => {
              const when = m.scheduledStart
                ? new Date(m.scheduledStart).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })
                : "TBC";
              const score =
                kind === "results" && m.homeScore != null && m.awayScore != null
                  ? `<span style="font-weight:900;color:#0f172a;">${m.homeScore}–${m.awayScore}</span>`
                  : `<span style="font-weight:800;color:#0f172a;">vs</span>`;
              const meta = [m.seasonCompetitionId, m.divisionName, m.round != null ? `R${m.round}` : null]
                .filter(Boolean)
                .join(" · ");
              return `<tr>
                <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
                  <div style="color:#0f172a;font-weight:800;font-size:14px;">${escapeHtml(m.homeTeamName)} ${score} ${escapeHtml(m.awayTeamName)}</div>
                  <div style="color:#64748b;font-size:12px;margin-top:2px;">${escapeHtml(meta)}</div>
                  <div style="color:#475569;font-size:12px;margin-top:2px;">${escapeHtml(when)} · ${escapeHtml(m.venueName?.trim() || "TBC")}</div>
                </td>
              </tr>`;
            })
            .join("")}
        </table>`;

  return `
    <tr>
      <td style="padding:18px 28px 0;">
        <h2 style="margin:0 0 10px;font-size:14px;font-weight:900;color:#1e293b;">${escapeHtml(title)}</h2>
        ${body}
      </td>
    </tr>
  `.trim();
}

function newsSection(items: WeeklyDigestNews[]) {
  const body =
    items.length === 0
      ? `<p style="margin:0;color:#64748b;font-size:13px;">No news items this week.</p>`
      : `<ul style="margin:0;padding-left:18px;color:#0f172a;">
          ${items
            .slice(0, 6)
            .map((n) => `<li style="margin:6px 0;"><span style="font-size:13px;">${escapeHtml(n.title)}</span></li>`)
            .join("")}
        </ul>`;

  return `
    <tr>
      <td style="padding:18px 28px 0;">
        <h2 style="margin:0 0 10px;font-size:14px;font-weight:900;color:#1e293b;">News</h2>
        ${body}
      </td>
    </tr>
  `.trim();
}

function oneLine(m: WeeklyDigestMatch, includeScore: boolean): string {
  const when = m.scheduledStart ? new Date(m.scheduledStart).toLocaleString("en-AU") : "TBC";
  const score =
    includeScore && m.homeScore != null && m.awayScore != null
      ? ` ${m.homeScore}-${m.awayScore} `
      : " vs ";
  return `${m.homeTeamName}${score}${m.awayTeamName} · ${when} · ${m.venueName ?? "TBC"}`;
}

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

