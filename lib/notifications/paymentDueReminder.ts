/**
 * J1 — One-off “fees / payment due” reminder email to a member (Resend).
 */

import { sendEmail, APP_URL } from "@/lib/email/client";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendPaymentDueReminderEmail(input: {
  to: string;
  memberDisplayName: string;
  /** Optional extra line from registrar */
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  const feesUrl = `${APP_URL}/my-fees`;
  const html = `
    <p>Hi ${escapeHtml(input.memberDisplayName)},</p>
    <p>You have <strong>outstanding fees or payments</strong> on your account. Please sign in and complete payment when you can.</p>
    ${input.note?.trim() ? `<p>${escapeHtml(input.note.trim())}</p>` : ""}
    <p><a href="${feesUrl}">Open My fees</a></p>
    <p style="color:#666;font-size:12px">If you have already paid, you can ignore this message.</p>
  `;

  return sendEmail({
    to: input.to,
    subject: "Payment reminder — fees outstanding",
    html,
    text: `Hi ${input.memberDisplayName}, you have outstanding fees. Visit ${feesUrl}`,
  });
}
