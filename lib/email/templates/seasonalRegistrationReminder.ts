/**
 * lib/email/templates/seasonalRegistrationReminder.ts
 *
 * Email template for seasonal re-registration reminders (R6).
 *
 * Sent to members who held a seasonal role (player, member, coach, etc.) in
 * the current season but have not yet submitted a role-request for the upcoming
 * season.  Two reminder waves are defined:
 *
 *   "6w"  — ~6 weeks before season start (35–49 days out)
 *   "2w"  — ~2 weeks before season start  (7–20 days out)
 *
 * The email is rendered in table-based HTML for broad inbox compatibility,
 * matching the style of other Hockey App transactional emails.
 *
 * Associations can provide `customText` via the Communications Hub that is
 * injected as an optional paragraph between the greeting and the details
 * table, allowing per-association customisation without modifying code.
 */

import { APP_URL } from "@/lib/email/client";

// ── Options ───────────────────────────────────────────────────────────────────

export interface SeasonalReminderEmailOptions {
  /** Member's first name for the salutation. */
  firstName: string;
  /** Human-readable role label, e.g. "Player", "Coach". */
  roleLabel: string;
  /** Name of the club or association the role is scoped to. */
  scopeName: string;
  /** Scope type — drives display copy ("with {club}" vs "for {association}"). */
  scopeType: "club" | "association" | "team";
  /** The season year the member is currently registered for, e.g. "2025". */
  currentSeasonYear: string;
  /** The upcoming season year they need to register for, e.g. "2026". */
  upcomingSeasonYear: string;
  /**
   * Which reminder wave this email belongs to.
   * "6w" = approximately 6 weeks before season start.
   * "2w" = approximately 2 weeks before season start.
   */
  weeksLabel: "6w" | "2w";
  /**
   * Optional plain-text paragraph injected from the association's
   * Communications Hub settings.  HTML is never permitted here.
   */
  customText?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Direct link to the member's registration portal page. */
function registerUrl(): string {
  return `${APP_URL}/admin/my-registrations`;
}

function urgencyConfig(weeksLabel: "6w" | "2w"): {
  badge: string;
  badgeColor: string;
  headlineSuffix: string;
} {
  if (weeksLabel === "2w") {
    return {
      badge: "⏰ 2 Weeks to Go",
      badgeColor: "#dc2626",   // red-600
      headlineSuffix: "— only 2 weeks left",
    };
  }
  return {
    badge: "📅 6 Weeks to Go",
    badgeColor: "#d97706",   // amber-600
    headlineSuffix: "— register now",
  };
}

function scopePrep(scopeType: "club" | "association" | "team"): string {
  return scopeType === "association" ? "with" : "with";
}

// ── Builder ───────────────────────────────────────────────────────────────────

export function buildSeasonalRegistrationReminderEmail(
  opts: SeasonalReminderEmailOptions,
): { subject: string; html: string; text: string } {
  const {
    firstName,
    roleLabel,
    scopeName,
    scopeType,
    currentSeasonYear,
    upcomingSeasonYear,
    weeksLabel,
    customText,
  } = opts;

  const uc   = urgencyConfig(weeksLabel);
  const prep = scopePrep(scopeType);
  const ctaUrl = registerUrl();
  const year  = new Date().getFullYear();

  const subject = `Re-register for ${upcomingSeasonYear} ${weeksLabel === "2w" ? "— time is running out!" : "— season registration is open"}`;

  // ── Custom paragraph (association-supplied) ───────────────────────────────
  const customHtml = customText?.trim()
    ? `<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;padding:16px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;">
        ${customText.trim().replace(/\n/g, "<br/>")}
      </p>`
    : "";

  const customTxt = customText?.trim()
    ? `\n${customText.trim()}\n`
    : "";

  // ── HTML ──────────────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
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
              <p style="color:#c7d2fe;margin:8px 0 0;font-size:14px;">Seasonal Registration Reminder</p>
            </td>
          </tr>

          <!-- Urgency banner -->
          <tr>
            <td style="background:${uc.badgeColor};padding:14px 40px;text-align:center;">
              <p style="color:#ffffff;font-size:17px;font-weight:900;margin:0;letter-spacing:0.3px;">
                ${uc.badge} — ${upcomingSeasonYear} season registration ${weeksLabel === "2w" ? "closes soon" : "is open"}
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
                Your <strong>${roleLabel}</strong> registration ${prep}
                <strong>${scopeName}</strong> for the <strong>${currentSeasonYear}</strong> season
                is coming to an end.  Don't miss out on the
                <strong>${upcomingSeasonYear}</strong> season ${weeksLabel === "2w" ? "— registration closes soon!" : "— register early to secure your spot!"}
              </p>

              ${customHtml}

              <!-- Details table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;overflow:hidden;margin:0 0 32px;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                    <span style="color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Your Role</span><br/>
                    <span style="color:#06054e;font-size:16px;font-weight:900;">${roleLabel}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                    <span style="color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Club / Association</span><br/>
                    <span style="color:#1e293b;font-size:15px;font-weight:700;">${scopeName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                    <span style="color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Current Season</span><br/>
                    <span style="color:#1e293b;font-size:15px;font-weight:700;">${currentSeasonYear}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <span style="color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Upcoming Season</span><br/>
                    <span style="color:#06054e;font-size:15px;font-weight:900;">${upcomingSeasonYear} ← Register now</span>
                  </td>
                </tr>
              </table>

              <!-- What to do -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border-radius:12px;overflow:hidden;margin:0 0 32px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="color:#1e40af;font-size:14px;font-weight:800;margin:0 0 8px;">What you need to do</p>
                    <ol style="color:#1e40af;font-size:14px;line-height:1.8;margin:0;padding-left:20px;">
                      <li>Click the button below to open your registrations portal</li>
                      <li>Submit a new role-request for <strong>${upcomingSeasonYear}</strong></li>
                      <li>Complete any required fee payment</li>
                      <li>Wait for admin approval — you're done!</li>
                    </ol>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:#06054e;border-radius:12px;">
                    <a href="${ctaUrl}"
                       style="display:inline-block;padding:16px 40px;color:#FFD700;font-weight:900;font-size:16px;text-decoration:none;letter-spacing:0.5px;">
                      Register for ${upcomingSeasonYear} →
                    </a>
                  </td>
                </tr>
              </table>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;" />

              <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.6;">
                You're receiving this because you held the <strong>${roleLabel}</strong>
                role ${prep} <strong>${scopeName}</strong> in the ${currentSeasonYear} season and
                haven't yet re-registered for ${upcomingSeasonYear}.
                If you've already re-registered or no longer wish to participate,
                you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:11px;margin:0;">
                © ${year} Hockey App · This is an automated reminder, please do not reply directly.<br/>
                Manage your registration at <a href="${ctaUrl}" style="color:#94a3b8;">${ctaUrl}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  // ── Plain text ────────────────────────────────────────────────────────────
  const text = `
Hi ${firstName},

${uc.badge.replace(/[^\x00-\x7F]/g, "").trim()} — ${upcomingSeasonYear} SEASON REGISTRATION

Your ${roleLabel} registration ${prep} ${scopeName} for the ${currentSeasonYear} season
is coming to an end. Don't miss out on the ${upcomingSeasonYear} season${weeksLabel === "2w" ? " — registration closes soon!" : "!"}
${customTxt}
YOUR DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━
Role:            ${roleLabel}
Club/Assoc:      ${scopeName}
Current season:  ${currentSeasonYear}
Upcoming season: ${upcomingSeasonYear}  ← Register now

WHAT TO DO
1. Visit your registrations portal: ${ctaUrl}
2. Submit a new role-request for ${upcomingSeasonYear}
3. Complete any required fee payment
4. Wait for admin approval

Register now: ${ctaUrl}

─────────────────────────────────────
You're receiving this because you held the ${roleLabel} role ${prep} ${scopeName}
in the ${currentSeasonYear} season and haven't yet re-registered for ${upcomingSeasonYear}.
If you've already re-registered or no longer wish to participate, ignore this email.

© ${year} Hockey App
`.trim();

  return { subject, html, text };
}
