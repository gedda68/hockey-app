/**
 * lib/email/client.ts
 * Centralised Resend email client.
 *
 * Required environment variable:
 *   RESEND_API_KEY  — obtain from https://resend.com/api-keys
 *
 * Optional environment variables:
 *   EMAIL_FROM      — sender address (default: noreply@yourdomain.com)
 *   NEXT_PUBLIC_APP_URL — base URL for links in emails (default: http://localhost:3000)
 */

import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  // Warn at startup rather than throwing — email is non-critical at boot time.
  console.warn(
    "⚠️  RESEND_API_KEY is not set. Email sending will be disabled."
  );
}

export const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "Hockey App <noreply@yourdomain.com>";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Send an email via Resend.
 * Returns { success: true } or { success: false, error }.
 */
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Uint8Array | Buffer;
    contentType?: string;
  }>;
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn("Email not sent — RESEND_API_KEY is not configured.");
    return { success: false, error: "Email service not configured" };
  }

  try {
    // Resend's TS types are a bit strict across union overloads; we keep this wrapper
    // simple and cast the final options to avoid type-noise across our codebase.
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      ...(typeof options.text === "string" ? { text: options.text } : {}),
      ...(options.attachments?.length
        ? {
            attachments: options.attachments.map((a) => ({
              filename: a.filename,
              content: a.content,
              contentType: a.contentType,
            })),
          }
        : {}),
    } as any);

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Email send failed:", message);
    return { success: false, error: message };
  }
}
