/**
 * lib/email/templates/squadSelection.ts
 *
 * Congratulations email sent to each selected player when a rep-team squad is published.
 * Shadow/train-on players receive a slightly different message.
 */

import { APP_URL } from "@/lib/email/client";

export interface SquadSelectionOptions {
  /** Player's first name */
  firstName: string;
  /** Player's email address */
  email: string;
  /** e.g. "U16 Boys" or "Open Women" */
  ageGroup: string;
  /** e.g. "2026" */
  seasonYear: string;
  /** Association / club that published the squad */
  scopeName: string;
  /** true = shadow / train-on (train with the squad but not primary selection) */
  isShadow?: boolean;
  /** Optional position in the squad (if squadOrder is set) */
  squadPosition?: number;
}

export function buildSquadSelectionEmail(
  opts: SquadSelectionOptions
): { subject: string; html: string; text: string } {
  const {
    firstName,
    ageGroup,
    seasonYear,
    scopeName,
    isShadow = false,
  } = opts;

  const portalUrl = `${APP_URL}/my-nominations`;

  const subject = isShadow
    ? `You have been selected as a train-on player — ${ageGroup} ${seasonYear}`
    : `Congratulations! You have been selected for the ${ageGroup} squad — ${seasonYear}`;

  const bannerLabel = isShadow
    ? "Train-On / Shadow Selection"
    : "Squad Selection — Congratulations!";

  const bannerBg = isShadow ? "#d97706" : "#16a34a";

  const bodyContent = isShadow
    ? `
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
        You have been selected as a <strong>train-on (shadow) player</strong> for the
        <strong>${ageGroup}</strong> representative squad with <strong>${scopeName}</strong>
        for the <strong>${seasonYear} season</strong>.
      </p>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
        As a train-on player you will train with the squad and may be called up to fill
        a vacancy. This is a great opportunity to develop your skills at representative level.
      </p>
    `
    : `
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Congratulations! You have been officially selected in the
        <strong>${ageGroup}</strong> representative squad with <strong>${scopeName}</strong>
        for the <strong>${seasonYear} season</strong>.
      </p>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Further information about training schedules, events, and uniform requirements will
        be communicated by your team management.
      </p>
    `;

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
              <h1 style="color:#FFD700;margin:0;font-size:24px;font-weight:900;letter-spacing:1px;">
                🏑 HOCKEY APP
              </h1>
            </td>
          </tr>

          <!-- Banner -->
          <tr>
            <td style="background:${bannerBg};padding:16px 40px;text-align:center;">
              <p style="color:#ffffff;font-size:18px;font-weight:900;margin:0;letter-spacing:0.5px;">
                ${isShadow ? "🌟" : "🏆"} ${bannerLabel}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="color:#06054e;font-size:20px;font-weight:800;margin:0 0 20px;">
                Hi ${firstName},
              </h2>

              <!-- Squad detail card -->
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin:0 0 24px;">
                <p style="color:#1e293b;font-size:16px;font-weight:700;margin:0 0 6px;">${ageGroup} Representative Squad</p>
                <p style="color:#475569;font-size:14px;margin:0 0 4px;">
                  <strong>Organisation:</strong> ${scopeName}
                </p>
                <p style="color:#475569;font-size:14px;margin:0;">
                  <strong>Season:</strong> ${seasonYear}
                </p>
              </div>

              ${bodyContent}

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:#06054e;border-radius:12px;">
                    <a href="${portalUrl}"
                       style="display:inline-block;padding:14px 32px;color:#FFD700;font-weight:900;font-size:15px;text-decoration:none;letter-spacing:0.5px;">
                      View My Squad Selection
                    </a>
                  </td>
                </tr>
              </table>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;" />

              <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.6;">
                This is an automated notification from Hockey App.
                Please do not reply to this email — contact your team management or association if you have questions.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:11px;margin:0;">
                © ${new Date().getFullYear()} Hockey App · Automated message — please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  const text = isShadow
    ? `
Hi ${firstName},

You have been selected as a train-on (shadow) player for the ${ageGroup} representative squad with ${scopeName} for the ${seasonYear} season.

As a train-on player you will train with the squad and may be called up to fill a vacancy.

View your selection details:
${portalUrl}

— Hockey App
`.trim()
    : `
Hi ${firstName},

Congratulations! You have been selected in the ${ageGroup} representative squad with ${scopeName} for the ${seasonYear} season.

Further details will be communicated by your team management.

View your selection details:
${portalUrl}

— Hockey App
`.trim();

  return { subject, html, text };
}
