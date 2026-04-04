/**
 * lib/email/templates/registrationConfirmation.ts
 * HTML and plain-text templates for the registration confirmation email.
 */

import { APP_URL } from "@/lib/email/client";

interface RegistrationConfirmationOptions {
  firstName: string;
  memberId: string;
  clubName: string;
  membershipType: string;
  season?: string;
}

export function buildRegistrationConfirmationEmail(
  opts: RegistrationConfirmationOptions
): { subject: string; html: string; text: string } {
  const { firstName, memberId, clubName, membershipType, season } = opts;
  const portalUrl = `${APP_URL}/portal`;
  const displaySeason = season ?? new Date().getFullYear().toString();

  const subject = `Registration confirmed — ${clubName} ${displaySeason}`;

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
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#06054e;padding:32px 40px;text-align:center;">
              <h1 style="color:#FFD700;margin:0;font-size:24px;font-weight:900;letter-spacing:1px;">
                🏑 HOCKEY APP
              </h1>
              <p style="color:#c7d2fe;margin:8px 0 0;font-size:14px;">Registration Confirmation</p>
            </td>
          </tr>

          <!-- Success banner -->
          <tr>
            <td style="background:#f0fdf4;border-bottom:2px solid #86efac;padding:20px 40px;text-align:center;">
              <p style="color:#166534;font-size:18px;font-weight:800;margin:0;">
                ✅ You're registered for ${displaySeason}!
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#06054e;font-size:20px;font-weight:800;margin:0 0 16px;">
                Hi ${firstName},
              </h2>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Your registration with <strong>${clubName}</strong> has been confirmed.
                Here are your membership details:
              </p>

              <!-- Details table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;overflow:hidden;margin:0 0 32px;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                    <span style="color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Member ID</span><br/>
                    <span style="color:#06054e;font-size:16px;font-weight:900;">${memberId}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                    <span style="color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Club</span><br/>
                    <span style="color:#1e293b;font-size:15px;font-weight:700;">${clubName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                    <span style="color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Membership Type</span><br/>
                    <span style="color:#1e293b;font-size:15px;font-weight:700;">${membershipType}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <span style="color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Season</span><br/>
                    <span style="color:#1e293b;font-size:15px;font-weight:700;">${displaySeason}</span>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:#06054e;border-radius:12px;">
                    <a href="${portalUrl}"
                       style="display:inline-block;padding:14px 32px;color:#FFD700;font-weight:900;font-size:16px;text-decoration:none;">
                      View My Portal
                    </a>
                  </td>
                </tr>
              </table>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;" />

              <p style="color:#94a3b8;font-size:12px;margin:0;">
                Keep your member ID handy — you may need it at registration desks and events.
                Contact your club administrator if you have any questions.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:11px;margin:0;">
                © ${new Date().getFullYear()} Hockey App · This is an automated message, please do not reply.
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

  const text = `
Hi ${firstName},

Your registration with ${clubName} for ${displaySeason} has been confirmed!

Member ID:        ${memberId}
Club:             ${clubName}
Membership Type:  ${membershipType}
Season:           ${displaySeason}

View your portal: ${portalUrl}

Keep your member ID handy — you may need it at registration desks and events.

— Hockey App
`.trim();

  return { subject, html, text };
}
