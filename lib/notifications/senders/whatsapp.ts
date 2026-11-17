// lib/notifications/senders/whatsapp.ts — the "social" channel, delivered as a WhatsApp message through Meta's
// WhatsApp Business Cloud API (plain REST, no extra package).
//
// WhatsApp only lets a business start a conversation with an approved *template* message, so this sends a template
// with two fields: {{1}} the headline and {{2}} the details. Create one in WhatsApp Manager, e.g.
//   "{{1}} — {{2}}. Open the app for more."   (category: Utility)
// Needs WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN and WHATSAPP_TEMPLATE_NAME; WHATSAPP_TEMPLATE_LANG defaults to en_AU.

import type { ChannelSender } from "@/lib/notifications/channels";
import { toE164 } from "@/lib/notifications/senders/sms";

export const whatsappConfigured = () => !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_TEMPLATE_NAME);

/** WhatsApp template fields can't contain newlines, tabs or runs of spaces, and have a length limit. */
export const templateField = (s: string, max = 200) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return (t.length > max ? `${t.slice(0, max - 1)}…` : t) || "-";
};

export const sendNotificationWhatsApp: ChannelSender = async (n, to) => {
  const phone = toE164(to.mobile);
  if (!whatsappConfigured()) return;
  if (!phone) throw new Error("No valid mobile number on file");
  const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone.slice(1), // the API wants digits only, no "+"
      type: "template",
      template: {
        name: process.env.WHATSAPP_TEMPLATE_NAME,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en_AU" },
        components: [{ type: "body", parameters: [{ type: "text", text: templateField(n.title, 100) }, { type: "text", text: templateField(n.message) }] }],
      },
    }),
  });
  if (!res.ok) throw new Error(`whatsapp failed: ${res.status}`);
};
