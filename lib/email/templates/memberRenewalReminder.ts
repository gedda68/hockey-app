/**
 * lib/email/templates/memberRenewalReminder.ts
 *
 * HTML + plain-text email template for the membership renewal reminder.
 * Sent by the monthly cron job to members whose membership.currentPeriodEnd
 * falls within the next 30 days.
 *
 * The CTA deep-links to /admin/my-registrations?role=member&clubId=<id>
 * which opens the submit-request modal pre-filled for the member role at
 * their club (handled by existing URL-param logic on that page).
 */

import { APP_URL } from "@/lib/email/client";

export interface MemberRenewalReminderOptions {
  /** Member's first name for personalisation */
  firstName: string;
  /** Their assigned member ID */
  memberId: string;
  /** Display name of the club */
  clubName: string;
  /** Canonical club ID used for the deep-link */
  clubId: string;
  /** ISO date string — membership.currentPeriodEnd */
  expiresAt: string;
  /** Season year for the renewal, e.g. "2026" */
  seasonYear: string;
}

export function buildMemberRenewalReminderEmail(
  opts: MemberRenewalReminderOptions,
): { subject: string; html: string; text: string } {
  const { firstName, memberId, clubName, clubId, expiresAt, seasonYear } = opts;

  const renewUrl = `${APP_URL}/admin/my-registrations?role=member&clubId=${encodeURIComponent(clubId)}`;

  const expiryFormatted = new Date(expiresAt).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const subject = `Action required: renew your ${clubName} membership before ${expiryFormatted}`;

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
            <td style="background:#0f766e;padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:900;letter-spacing:1px;">
                🏑 HOCKEY APP
              </h1>
              <p style="color:#99f6e4;margin:8px 0 0;font-size:14px;">Membership Renewal Reminder</p>
            </td>
          </tr>

          <!-- Club banner -->
          <tr>
            <td style="background:#f0fdfa;border-bottom:2px solid #5eead4;padding:20px 40px;text-align:center;">
              <p style="color:#134e4a;font-size:20px;font-weight:800;margin:0;">
                ${clubName}
              </p>
              <p style="color:#0f766e;font-size:14px;font-weight:600;margin:4px 0 0;">
                ${seasonYear} Season
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#1e293b;font-size:16px;font-weight:700;margin:0 0 12px;">
                Hi ${firstName},
              </p>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Your membership with <strong>${clubName}</strong> is expiring soon.
                Please renew before the deadline to stay registered for the
                <strong>${seasonYear}</strong> season.
              </p>

              <!-- Expiry notice box -->
              <div style="background:#fef9c3;border:1px solid #fde047;border-radius:10px;padding:16px 20px;margin-bottom:32px;">
                <p style="color:#713f12;font-size:14px;font-weight:700;margin:0 0 4px;">
                  ⏰ Membership expires: <strong>${expiryFormatted}</strong>
                </p>
                <p style="color:#92400e;font-size:12px;margin:0;">
                  Member ID: <strong>${memberId}</strong>
                </p>
              </div>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:#0f766e;border-radius:12px;padding:0;">
                    <a href="${renewUrl}"
                       style="display:inline-block;padding:16px 36px;color:#ffffff;
                              font-size:16px;font-weight:900;text-decoration:none;
                              letter-spacing:0.5px;">
                      Renew Membership →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link fallback -->
              <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0 0 8px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 32px;">
                <a href="${renewUrl}"
                   style="color:#0f766e;font-size:12px;word-break:break-all;">
                  ${renewUrl}
                </a>
              </p>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;" />

              <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
                If you believe this message was sent in error or have already renewed,
                please contact your club registrar. You can safely ignore this email
                if you do not intend to continue your membership.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">
                Sent via Hockey App · Questions? Contact ${clubName} directly.
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
Hi ${firstName},

Your membership with ${clubName} is expiring soon.

Membership expires: ${expiryFormatted}
Member ID: ${memberId}

Renew your membership here:
${renewUrl}

If you have already renewed or do not intend to continue, you can ignore this email.

— Hockey App
`.trim();

  return { subject, html, text };
}
