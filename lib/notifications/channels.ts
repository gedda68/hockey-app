// lib/notifications/channels.ts
// How a notification reaches a person. The in-app inbox is the stored notification itself. Email, SMS and social
// are not switched on yet: when one is, register its sender here and every notification the engine creates will
// also go out on it for the people who turned it on (the preferences already store that choice).

import type { Db } from "mongodb";
import { allows, CHANNELS, type Channel, type NotificationPrefs } from "@/lib/notifications/prefs";
import { logDelivery } from "@/lib/notifications/deliveryLog";
import type { Candidate } from "@/lib/notifications/candidates";
import { emailConfigured, sendNotificationEmail } from "@/lib/notifications/senders/email";
import { smsConfigured, sendNotificationSms } from "@/lib/notifications/senders/sms";
import { whatsappConfigured, sendNotificationWhatsApp } from "@/lib/notifications/senders/whatsapp";

export interface Recipient { memberId: string; email?: string | null; mobile?: string | null }
export type ChannelSender = (n: Candidate, to: Recipient, db: Db) => Promise<void>;

/** Overrides (used by tests). Normally the senders come from {@link senderFor}, based on what's configured. */
export const SENDERS: Partial<Record<Exclude<Channel, "inApp">, ChannelSender>> = {};

/** The sender for a channel, or undefined when it isn't set up (no API keys). Social is WhatsApp. */
export function senderFor(ch: Exclude<Channel, "inApp">): ChannelSender | undefined {
  if (SENDERS[ch]) return SENDERS[ch];
  if (ch === "email" && emailConfigured()) return sendNotificationEmail;
  if (ch === "sms" && smsConfigured()) return sendNotificationSms;
  if (ch === "social" && whatsappConfigured()) return sendNotificationWhatsApp;
  return undefined;
}

/** Channels that actually deliver right now. */
export function liveChannels(): Channel[] {
  return CHANNELS.filter((c) => c === "inApp" || !!senderFor(c));
}

/** Sends a newly created notification on every extra channel the person has on for it. Never throws. */
export async function dispatchExtraChannels(db: Db, n: Candidate, to: Recipient, prefs: NotificationPrefs): Promise<Channel[]> {
  const sent: Channel[] = [];
  for (const ch of CHANNELS) {
    if (ch === "inApp") continue;
    const send = senderFor(ch);
    if (!send || !allows(prefs, n, ch)) continue;
    try {
      await send(n, to, db);
      sent.push(ch);
      await logDelivery(db, { memberId: to.memberId, dedupeKey: n.dedupeKey, channel: ch, status: "sent", category: n.category, level: n.level, clubId: n.clubId });
    } catch (e) {
      console.error(`notification ${ch} send failed:`, e);
      await logDelivery(db, { memberId: to.memberId, dedupeKey: n.dedupeKey, channel: ch, status: "failed", error: e instanceof Error ? e.message : String(e), category: n.category, level: n.level, clubId: n.clubId });
    }
  }
  return sent;
}
