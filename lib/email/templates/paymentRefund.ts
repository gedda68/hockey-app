/**
 * lib/email/templates/paymentRefund.ts
 *
 * Email sent to the member when a payment is refunded by an admin.
 * Covers both full and partial refunds, and both Stripe and manual adjustments.
 *
 * ── Anti-nepotism ─────────────────────────────────────────────────────────────
 * The refund reason is mandatory at the API layer and is surfaced prominently in
 * this email, creating a paper trail visible to the member — mirroring the fee-
 * waiver audit design.
 */

import { APP_URL } from "@/lib/email/client";

export interface PaymentRefundEmailOptions {
  /** Member's first name for personalised greeting */
  firstName: string;
  /** Unique payment identifier, e.g. PAY-ABC123 */
  paymentId: string;
  /** Original payment total in cents */
  originalAmountCents: number;
  /** Amount being refunded in cents */
  refundAmountCents: number;
  /** Mandatory admin-supplied reason */
  refundReason: string;
  /** Name of the admin who initiated the refund */
  refundedByName: string;
  /** ISO date string of the original payment */
  paidDate?: string | null;
  /** ISO date string of when the refund was processed */
  refundedAt: string;
  /** True when refundAmountCents < originalAmountCents */
  partial: boolean;
  /** Brief description of what was paid (line item names) */
  lineItemNames?: string[];
  /** Whether the refund was processed via Stripe or recorded manually */
  paymentMethod: "stripe" | "manual" | "simulated" | string;
  /** Optional Stripe refund ID for member reference */
  stripeRefundId?: string | null;
}

function formatCentsAUD(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDateFull(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function buildPaymentRefundEmail(
  opts: PaymentRefundEmailOptions,
): { subject: string; html: string; text: string } {
  const {
    firstName,
    paymentId,
    originalAmountCents,
    refundAmountCents,
    refundReason,
    refundedByName,
    paidDate,
    refundedAt,
    partial,
    lineItemNames = [],
    paymentMethod,
    stripeRefundId,
  } = opts;

  const portalUrl = `${APP_URL}/admin/my-fees`;
  const isStripe  = paymentMethod === "stripe";

  const subject = partial
    ? `Partial refund of ${formatCentsAUD(refundAmountCents)} processed — ${paymentId}`
    : `Refund of ${formatCentsAUD(refundAmountCents)} processed — ${paymentId}`;

  const bannerText  = partial ? "Partial Refund Processed" : "Refund Processed";
  const bannerIcon  = "↩️";

  // ── Item list ─────────────────────────────────────────────────────────────
  const itemsHtml = lineItemNames.length
    ? `<ul style="margin:0 0 0 16px;padding:0;color:#475569;font-size:14px;line-height:1.8;">
         ${lineItemNames.map((n) => `<li>${n}</li>`).join("\n         ")}
       </ul>`
    : "";

  // ── Refund details table ──────────────────────────────────────────────────
  const rows: Array<[string, string]> = [
    ["Payment Reference",  paymentId],
    ["Original Amount",    formatCentsAUD(originalAmountCents)],
    ["Refund Amount",      formatCentsAUD(refundAmountCents)],
    ["Refund Date",        formatDateFull(refundedAt)],
    ["Processed by",       refundedByName],
    ...(paidDate ? [["Original Payment Date", formatDateFull(paidDate)] as [string, string]] : []),
    ...(isStripe && stripeRefundId ? [["Stripe Refund ID", stripeRefundId] as [string, string]] : []),
  ];

  const tableHtml = `
    <table cellpadding="0" cellspacing="0" width="100%"
           style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin:0 0 24px;">
      ${rows.map(([label, value], i) => `
      <tr style="background:${i % 2 === 0 ? "#f8fafc" : "#ffffff"};">
        <td style="padding:10px 16px;font-size:13px;color:#64748b;font-weight:600;width:45%;border-bottom:1px solid #e2e8f0;">${label}</td>
        <td style="padding:10px 16px;font-size:13px;color:#1e293b;font-family:monospace;border-bottom:1px solid #e2e8f0;">${value}</td>
      </tr>`).join("")}
    </table>`;

  // ── What happens next (partial vs full) ──────────────────────────────────
  const nextStepsHtml = partial
    ? `<div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin:0 0 20px;">
         <p style="color:#78350f;font-size:14px;margin:0;line-height:1.6;">
           <strong>Partial refund note:</strong> This is a partial refund. Your registration record
           remains active. ${formatCentsAUD(originalAmountCents - refundAmountCents)} of the
           original payment is retained.
         </p>
       </div>`
    : `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 18px;margin:0 0 20px;">
         <p style="color:#1e40af;font-size:14px;margin:0;line-height:1.6;">
           <strong>Full refund:</strong> Your registration has been reverted to
           <em>pending payment</em> status. If you wish to re-register, please contact
           your club registrar or submit a new registration request.
         </p>
       </div>`;

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
            <td style="background:#2563eb;padding:16px 40px;text-align:center;">
              <p style="color:#ffffff;font-size:18px;font-weight:900;margin:0;letter-spacing:0.5px;">
                ${bannerIcon} ${bannerText}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="color:#06054e;font-size:20px;font-weight:800;margin:0 0 16px;">
                Hi ${firstName},
              </h2>

              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
                ${partial
                  ? `A <strong>partial refund of ${formatCentsAUD(refundAmountCents)}</strong> has been processed against your payment of ${formatCentsAUD(originalAmountCents)}.`
                  : `A <strong>full refund of ${formatCentsAUD(refundAmountCents)}</strong> has been processed for your payment.`}
                ${isStripe ? "The refund has been submitted to your original payment method and should appear within 5–10 business days." : "This refund has been recorded manually by your club administrator."}
              </p>

              ${tableHtml}

              ${itemsHtml
                ? `<div style="margin:0 0 24px;">
                     <p style="font-size:13px;font-weight:700;color:#1e293b;margin:0 0 8px;">Items refunded:</p>
                     ${itemsHtml}
                   </div>`
                : ""}

              <!-- Reason block (mandatory — anti-nepotism audit) -->
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #2563eb;border-radius:0 8px 8px 0;padding:14px 18px;margin:0 0 24px;">
                <p style="color:#1e293b;font-size:13px;font-weight:700;margin:0 0 4px;">Reason provided by ${refundedByName}:</p>
                <p style="color:#475569;font-size:14px;line-height:1.6;margin:0;">${refundReason}</p>
              </div>

              ${nextStepsHtml}

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:#06054e;border-radius:12px;">
                    <a href="${portalUrl}"
                       style="display:inline-block;padding:14px 32px;color:#FFD700;font-weight:900;font-size:15px;text-decoration:none;letter-spacing:0.5px;">
                      View My Fees &amp; Payments
                    </a>
                  </td>
                </tr>
              </table>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;" />

              <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.6;">
                This refund was initiated by an administrator on your behalf.
                If you have questions, contact your club registrar — please do not reply to this email.
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
  const text = `
Hi ${firstName},

${partial
  ? `A partial refund of ${formatCentsAUD(refundAmountCents)} has been processed against your payment of ${formatCentsAUD(originalAmountCents)}.`
  : `A full refund of ${formatCentsAUD(refundAmountCents)} has been processed for your payment.`}

Payment Reference:  ${paymentId}
Refund Amount:      ${formatCentsAUD(refundAmountCents)}
Original Amount:    ${formatCentsAUD(originalAmountCents)}
Refund Date:        ${formatDateFull(refundedAt)}
Processed by:       ${refundedByName}
${paidDate         ? `Original Payment:   ${formatDateFull(paidDate)}\n` : ""}${isStripe && stripeRefundId ? `Stripe Refund ID:   ${stripeRefundId}\n` : ""}${lineItemNames.length ? `\nItems:\n${lineItemNames.map((n) => `  • ${n}`).join("\n")}\n` : ""}
Reason: ${refundReason}

${partial
  ? `This is a partial refund. Your registration remains active. ${formatCentsAUD(originalAmountCents - refundAmountCents)} of the original payment is retained.`
  : "Your registration has been reverted to pending payment status. Submit a new request if you wish to re-register."}

View your fees and payment history:
${portalUrl}

— Hockey App
`.trim();

  return { subject, html, text };
}
