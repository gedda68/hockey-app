/**
 * lib/email/templates/roleRequestDecision.ts
 *
 * Email templates for role request approval and rejection notifications.
 * Sent to the member/user after an admin acts on their request.
 */

import { APP_URL } from "@/lib/email/client";

export interface RoleRequestDecisionOptions {
  firstName: string;
  decision: "approved" | "rejected";
  /** Human-readable role label, e.g. "Senior Player" */
  roleLabel: string;
  /** Organisation name, e.g. "Commercial Hockey Club" */
  scopeName?: string;
  seasonYear?: string;
  /** Admin who made the decision */
  approverName: string;
  /** Admin's notes — required for rejection, optional for approval */
  reviewNotes?: string;
  /** Whether the fee was waived rather than paid */
  feeWaived?: boolean;
}

export function buildRoleRequestDecisionEmail(
  opts: RoleRequestDecisionOptions
): { subject: string; html: string; text: string } {
  const {
    firstName,
    decision,
    roleLabel,
    scopeName,
    seasonYear,
    approverName,
    reviewNotes,
    feeWaived = false,
  } = opts;

  const isApproved = decision === "approved";
  const portalUrl = `${APP_URL}/admin/my-registrations`;

  const subject = isApproved
    ? `Your ${roleLabel} registration has been approved`
    : `Your ${roleLabel} registration was not approved`;

  // ── Colour scheme ─────────────────────────────────────────────────────────
  const bannerBg    = isApproved ? "#16a34a" : "#dc2626";
  const bannerText  = "#ffffff";
  const bannerIcon  = isApproved ? "✅" : "❌";
  const bannerLabel = isApproved ? "Registration Approved" : "Registration Not Approved";

  // ── Scope + season line ───────────────────────────────────────────────────
  const contextParts: string[] = [];
  if (scopeName)  contextParts.push(scopeName);
  if (seasonYear) contextParts.push(`${seasonYear} Season`);
  const contextLine = contextParts.length
    ? `<p style="color:#475569;font-size:14px;margin:0 0 8px;">
         <strong>Organisation:</strong> ${contextParts.join(" &mdash; ")}
       </p>`
    : "";

  // ── Body copy ─────────────────────────────────────────────────────────────
  const bodyContent = isApproved
    ? `
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Great news! Your request to be registered as a <strong>${roleLabel}</strong>
        ${scopeName ? `at <strong>${scopeName}</strong>` : ""}
        ${seasonYear ? `for the <strong>${seasonYear} season</strong>` : ""}
        has been approved by <strong>${approverName}</strong>.
      </p>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Your role is now active. You can view your registrations in the member portal.
      </p>
      ${feeWaived
        ? `<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;">
             <strong>Note:</strong> The registration fee for this role was waived by the approving administrator.
           </p>`
        : ""}
      ${reviewNotes
        ? `<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;">
             <strong>Notes from ${approverName}:</strong> ${reviewNotes}
           </p>`
        : ""}
    `
    : `
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Unfortunately your request to be registered as a <strong>${roleLabel}</strong>
        ${scopeName ? `at <strong>${scopeName}</strong>` : ""}
        ${seasonYear ? `for the <strong>${seasonYear} season</strong>` : ""}
        was not approved by <strong>${approverName}</strong>.
      </p>
      ${reviewNotes
        ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:0 0 20px;">
             <p style="color:#991b1b;font-size:14px;font-weight:700;margin:0 0 6px;">Reason provided:</p>
             <p style="color:#7f1d1d;font-size:14px;line-height:1.6;margin:0;">${reviewNotes}</p>
           </div>`
        : ""}
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
        If you believe this decision was made in error, please contact your club registrar
        or association administrator. You may also submit a new request if the circumstances
        have changed.
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

          <!-- Decision banner -->
          <tr>
            <td style="background:${bannerBg};padding:16px 40px;text-align:center;">
              <p style="color:${bannerText};font-size:18px;font-weight:900;margin:0;letter-spacing:0.5px;">
                ${bannerIcon} ${bannerLabel}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="color:#06054e;font-size:20px;font-weight:800;margin:0 0 20px;">
                Hi ${firstName},
              </h2>

              <!-- Role detail card -->
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin:0 0 24px;">
                <p style="color:#1e293b;font-size:15px;font-weight:700;margin:0 0 6px;">${roleLabel}</p>
                ${contextLine}
              </div>

              ${bodyContent}

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:#06054e;border-radius:12px;">
                    <a href="${portalUrl}"
                       style="display:inline-block;padding:14px 32px;color:#FFD700;font-weight:900;font-size:15px;text-decoration:none;letter-spacing:0.5px;">
                      View My Registrations
                    </a>
                  </td>
                </tr>
              </table>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;" />

              <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.6;">
                This is an automated notification from Hockey App.
                Please do not reply to this email — contact your club registrar if you have questions.
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

  // ── Plain text fallback ───────────────────────────────────────────────────
  const scopeContext = contextParts.length ? ` (${contextParts.join(", ")})` : "";

  const text = isApproved
    ? `
Hi ${firstName},

Your registration as ${roleLabel}${scopeContext} has been APPROVED by ${approverName}.

Your role is now active. View your registrations here:
${portalUrl}
${feeWaived ? "\nNote: The registration fee was waived by the approving administrator.\n" : ""}
${reviewNotes ? `\nNotes from ${approverName}: ${reviewNotes}\n` : ""}
— Hockey App
`.trim()
    : `
Hi ${firstName},

Your registration as ${roleLabel}${scopeContext} was NOT APPROVED by ${approverName}.
${reviewNotes ? `\nReason: ${reviewNotes}\n` : ""}
If you believe this is in error, please contact your club registrar.
You can submit a new request at:
${portalUrl}

— Hockey App
`.trim();

  return { subject, html, text };
}
