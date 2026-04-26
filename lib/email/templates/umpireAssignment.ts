/**
 * lib/email/templates/umpireAssignment.ts
 *
 * HTML + plain-text email sent to a referee/umpire when they are assigned to a
 * fixture.  Two one-click CTA buttons let the official accept or decline without
 * logging in — each links to a signed token endpoint that expires after 14 days.
 *
 * Called from POST /api/admin/umpires/assign (first assignment) and can be
 * re-used to re-send a reminder for unresponded assignments.
 */

import { APP_URL } from "@/lib/email/client";

export interface UmpireAssignmentEmailOptions {
  /** Official's display name, e.g. "Jane Smith" */
  umpireName: string;
  /** Role label on the fixture, e.g. "Match Umpire 1", "Goal Judge" */
  umpireType: string;
  /** Round number or label */
  round: number | string;
  /** ISO datetime of the fixture, or null/undefined if TBC */
  scheduledStart?: string | null;
  /** Venue name, or null/undefined if TBC */
  venueName?: string | null;
  /** Human-readable competition identifier shown in the email */
  seasonCompetitionId: string;
  /** 64-char hex response token (baked into accept/decline URLs) */
  responseToken: string;
  /** Token expiry shown in the email footer (ISO string) */
  tokenExpiresAt: string;
  /** When true, subject is prefixed with "Reminder:" */
  isResend?: boolean;
}

export function buildUmpireAssignmentEmail(
  opts: UmpireAssignmentEmailOptions,
): { subject: string; html: string; text: string } {
  const {
    umpireName,
    umpireType,
    round,
    scheduledStart,
    venueName,
    seasonCompetitionId,
    responseToken,
    tokenExpiresAt,
    isResend,
  } = opts;

  const acceptUrl = `${APP_URL}/api/umpire/respond?token=${encodeURIComponent(responseToken)}&action=accept`;
  const declineUrl = `${APP_URL}/api/umpire/respond?token=${encodeURIComponent(responseToken)}&action=decline`;

  const when = scheduledStart
    ? new Date(scheduledStart).toLocaleString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : "TBC";

  const venue = venueName?.trim() || "TBC";

  const expiryFormatted = new Date(tokenExpiresAt).toLocaleString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const subject = isResend
    ? `Reminder: Umpire assignment awaiting response — ${seasonCompetitionId} Round ${round}`
    : `Umpire assignment — ${seasonCompetitionId} Round ${round}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#06054e;padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:900;letter-spacing:1px;">
                🏑 HOCKEY APP
              </h1>
              <p style="color:#a5b4fc;margin:8px 0 0;font-size:14px;">
                ${isResend ? "Assignment Reminder" : "Umpire Assignment"}
              </p>
            </td>
          </tr>

          <!-- Competition / round banner -->
          <tr>
            <td style="background:#eef2ff;border-bottom:2px solid #818cf8;padding:20px 40px;text-align:center;">
              <p style="color:#1e1b4b;font-size:20px;font-weight:800;margin:0;">
                ${escapeHtml(seasonCompetitionId)}
              </p>
              <p style="color:#4f46e5;font-size:14px;font-weight:600;margin:4px 0 0;">
                Round ${escapeHtml(String(round))} · ${escapeHtml(umpireType)}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#1e293b;font-size:16px;font-weight:700;margin:0 0 12px;">
                Hi ${escapeHtml(umpireName)},
              </p>

              ${isResend
                ? `<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px;">
                     This is a reminder that you have an <strong>unconfirmed umpire assignment</strong>.
                     Please accept or decline using the buttons below as soon as possible.
                   </p>`
                : `<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px;">
                     You have been assigned as <strong>${escapeHtml(umpireType)}</strong> for an
                     upcoming fixture. Please confirm your availability by accepting or declining
                     below.
                   </p>`
              }

              <!-- Fixture details card -->
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
                <p style="color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px;">
                  Fixture Details
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#64748b;font-size:13px;padding:4px 0;width:90px;vertical-align:top;">Role</td>
                    <td style="color:#1e293b;font-size:14px;font-weight:600;padding:4px 0;">${escapeHtml(umpireType)}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;font-size:13px;padding:4px 0;vertical-align:top;">When</td>
                    <td style="color:#1e293b;font-size:14px;font-weight:600;padding:4px 0;">${escapeHtml(when)}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;font-size:13px;padding:4px 0;vertical-align:top;">Venue</td>
                    <td style="color:#1e293b;font-size:14px;font-weight:600;padding:4px 0;">${escapeHtml(venue)}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;font-size:13px;padding:4px 0;vertical-align:top;">Competition</td>
                    <td style="color:#1e293b;font-size:14px;font-weight:600;padding:4px 0;">${escapeHtml(seasonCompetitionId)}</td>
                  </tr>
                </table>
              </div>

              <!-- Accept / Decline buttons -->
              <p style="color:#1e293b;font-size:14px;font-weight:700;margin:0 0 16px;">
                Please respond to this assignment:
              </p>

              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:#16a34a;border-radius:10px;padding:0;margin-right:12px;">
                    <a href="${acceptUrl}"
                       style="display:inline-block;padding:14px 28px;color:#ffffff;
                              font-size:15px;font-weight:900;text-decoration:none;
                              letter-spacing:0.3px;">
                      ✓ Accept
                    </a>
                  </td>
                  <td width="12"></td>
                  <td style="background:#dc2626;border-radius:10px;padding:0;">
                    <a href="${declineUrl}"
                       style="display:inline-block;padding:14px 28px;color:#ffffff;
                              font-size:15px;font-weight:900;text-decoration:none;
                              letter-spacing:0.3px;">
                      ✗ Decline
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link fallback -->
              <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0 0 4px;">
                If the buttons don't work, use these links:
              </p>
              <p style="margin:0 0 4px;">
                <strong style="color:#64748b;font-size:12px;">Accept:</strong>
                <a href="${acceptUrl}" style="color:#16a34a;font-size:11px;word-break:break-all;">${acceptUrl}</a>
              </p>
              <p style="margin:0 0 28px;">
                <strong style="color:#64748b;font-size:12px;">Decline:</strong>
                <a href="${declineUrl}" style="color:#dc2626;font-size:11px;word-break:break-all;">${declineUrl}</a>
              </p>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;" />

              <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
                These links expire on <strong>${escapeHtml(expiryFormatted)}</strong>.
                If you need to change your response after that date, please contact your
                association's officiating coordinator directly.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">
                Sent via Hockey App · Umpire Assignment System
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `
Hi ${umpireName},

${isResend
  ? `REMINDER: You have an unconfirmed umpire assignment — please respond as soon as possible.`
  : `You have been assigned as ${umpireType} for an upcoming fixture.`
}

FIXTURE DETAILS
Role:        ${umpireType}
When:        ${when}
Venue:       ${venue}
Competition: ${seasonCompetitionId}  Round ${round}

ACCEPT this assignment:
${acceptUrl}

DECLINE this assignment:
${declineUrl}

These links expire ${expiryFormatted}.
If you need to change your response after that date, contact your officiating coordinator.

— Hockey App · Umpire Assignment System
`.trim();

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
