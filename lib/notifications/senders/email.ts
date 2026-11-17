// lib/notifications/senders/email.ts — a notification as an email, through the app's Resend client.

import { APP_URL, sendEmail } from "@/lib/email/client";
import type { ChannelSender } from "@/lib/notifications/channels";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const absolute = (link: string) => (/^https?:\/\//i.test(link) ? link : `${APP_URL.replace(/\/$/, "")}${link.startsWith("/") ? "" : "/"}${link}`);

export const emailConfigured = () => !!process.env.RESEND_API_KEY;

export const sendNotificationEmail: ChannelSender = async (n, to) => {
  if (!to.email) throw new Error("No email address on file");
  const url = absolute(n.link);
  const r = await sendEmail({
    to: to.email,
    subject: n.title,
    text: `${n.title}\n\n${n.message}\n\n${url}\n\nYou can change which notifications you get under Notifications > Settings.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px"><h2 style="color:#06054e;margin:0 0 8px">${esc(n.title)}</h2><p style="color:#334155">${esc(n.message)}</p><p><a href="${esc(url)}" style="background:#14b8a6;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold">Open</a></p><p style="color:#94a3b8;font-size:12px">You can change which notifications you get under Notifications &gt; Settings.</p></div>`,
  });
  if (!r.success) throw new Error(r.error || "email failed");
};
