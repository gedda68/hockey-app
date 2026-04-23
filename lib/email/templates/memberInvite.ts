/**
 * lib/email/templates/memberInvite.ts
 *
 * HTML + plain-text email template for the club member invitation.
 * Sent by a registrar when generating a tokenised invite link.
 */

import { APP_URL } from "@/lib/email/client";

export interface MemberInviteOptions {
  /** Recipient's first name — used for personalisation if known, else "there" */
  firstName?: string;
  clubName: string;
  clubSlug: string;
  seasonYear: string;
  /** The raw 64-char hex token (NOT the full URL — we build the URL here) */
  token: string;
  /** Name of the registrar / staff member who sent the invite */
  invitedByName: string;
  /** ISO expiry date — formatted as a human-readable date in the email */
  expiresAt: string;
}

export function buildMemberInviteEmail(
  opts: MemberInviteOptions,
): { subject: string; html: string; text: string } {
  const {
    firstName,
    clubName,
    clubSlug,
    seasonYear,
    token,
    invitedByName,
    expiresAt,
  } = opts;

  const greeting = firstName ? `Hi ${firstName}` : "Hi there";
  const inviteUrl = `${APP_URL}/clubs/${clubSlug}/register?token=${token}`;
  const expiryFormatted = new Date(expiresAt).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const subject = `You're invited to register with ${clubName} — ${seasonYear}`;

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
              <p style="color:#99f6e4;margin:8px 0 0;font-size:14px;">Member Registration Invitation</p>
            </td>
          </tr>

          <!-- Club banner -->
          <tr>
            <td style="background:#f0fdfa;border-bottom:2px solid #5eead4;padding:20px 40px;text-align:center;">
              <p style="color:#134e4a;font-size:20px;font-weight:800;margin:0;">
                ${clubName}
              </p>
              <p style="color:#0f766e;font-size:14px;font-weight:600;margin:4px 0 0;">
                ${seasonYear} Season Registration
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#1e293b;font-size:16px;font-weight:700;margin:0 0 12px;">
                ${greeting},
              </p>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
                <strong>${invitedByName}</strong> has invited you to complete your
                ${seasonYear} membership registration with
                <strong>${clubName}</strong>.
              </p>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 32px;">
                Click the button below to fill in your details and select your membership
                category. The whole process takes about 3 minutes.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:#0f766e;border-radius:12px;padding:0;">
                    <a href="${inviteUrl}"
                       style="display:inline-block;padding:16px 32px;color:#ffffff;
                              font-size:16px;font-weight:900;text-decoration:none;
                              letter-spacing:0.5px;">
                      Complete Registration →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link fallback -->
              <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0 0 8px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 32px;">
                <a href="${inviteUrl}"
                   style="color:#0f766e;font-size:12px;word-break:break-all;">
                  ${inviteUrl}
                </a>
              </p>

              <!-- Expiry notice -->
              <div style="background:#fef9c3;border:1px solid #fde047;border-radius:10px;padding:14px 18px;margin-bottom:32px;">
                <p style="color:#713f12;font-size:13px;font-weight:600;margin:0;">
                  ⏰ This invitation link expires on <strong>${expiryFormatted}</strong>.
                </p>
              </div>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;" />

              <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
                If you weren't expecting this invitation or don't recognise
                ${clubName}, you can safely ignore this email.
                No account will be created without your action.
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
${greeting},

${invitedByName} has invited you to complete your ${seasonYear} membership registration with ${clubName}.

Complete your registration here:
${inviteUrl}

This link expires on ${expiryFormatted}.

If you weren't expecting this, you can safely ignore this email.

— Hockey App
`.trim();

  return { subject, html, text };
}
