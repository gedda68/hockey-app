// lib/notifications/senders/sms.ts — a notification as a text message, through Twilio's REST API (no extra package).
// Needs TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM (a Twilio number or messaging service SID "MG…").

import type { ChannelSender } from "@/lib/notifications/channels";

export const smsConfigured = () => !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);

/** Australian mobiles like 0412 345 678 become +61412345678; numbers already starting with + are kept. Anything else is refused. */
export function toE164(raw: string | null | undefined, defaultCountry = "61"): string | null {
  const s = String(raw ?? "").replace(/[\s().-]/g, "");
  if (/^\+\d{8,15}$/.test(s)) return s;
  if (/^0\d{9}$/.test(s)) return `+${defaultCountry}${s.slice(1)}`;
  return null;
}

export const smsText = (title: string, message: string, max = 300) => {
  const t = message ? `${title}: ${message}` : title;
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

export const sendNotificationSms: ChannelSender = async (n, to) => {
  const phone = toE164(to.mobile);
  if (!smsConfigured()) return;
  if (!phone) throw new Error("No valid mobile number on file");
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const from = process.env.TWILIO_FROM!;
  const body = new URLSearchParams({ To: phone, Body: smsText(n.title, n.message) });
  body.set(from.startsWith("MG") ? "MessagingServiceSid" : "From", from);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`sms failed: ${res.status}`);
};
