/**
 * lib/email/templates/passwordReset.ts
 * HTML and plain-text templates for the password reset email.
 */

import { APP_URL } from "@/lib/email/client";

interface PasswordResetOptions {
  firstName: string;
  resetToken: string;
  expiryMinutes?: number;
}

export function buildPasswordResetEmail(opts: PasswordResetOptions): {
  subject: string;
  html: string;
  text: string;
} {
  const { firstName, resetToken, expiryMinutes = 60 } = opts;
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

  const subject = "Reset your Hockey App password";

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
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#06054e;font-size:20px;font-weight:800;margin:0 0 16px;">
                Hi ${firstName},
              </h2>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
                We received a request to reset your Hockey App password. Click the button below
                to create a new password. This link expires in <strong>${expiryMinutes} minutes</strong>.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:#06054e;border-radius:12px;">
                    <a href="${resetUrl}"
                       style="display:inline-block;padding:14px 32px;color:#FFD700;font-weight:900;font-size:16px;text-decoration:none;letter-spacing:0.5px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 8px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 32px;">
                <a href="${resetUrl}" style="color:#06054e;font-size:13px;word-break:break-all;">${resetUrl}</a>
              </p>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;" />

              <p style="color:#94a3b8;font-size:12px;margin:0;">
                If you didn't request a password reset, you can safely ignore this email.
                Your password will remain unchanged.
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

We received a request to reset your Hockey App password.

Reset your password here (expires in ${expiryMinutes} minutes):
${resetUrl}

If you didn't request this, you can safely ignore this email.

— Hockey App
`.trim();

  return { subject, html, text };
}
