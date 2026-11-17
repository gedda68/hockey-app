// lib/notifications/channels.ts
// How a notification reaches a person. The in-app inbox is the stored notification itself. Email, SMS and social
// are not switched on yet: when one is, register its sender here and every notification the engine creates will
// also go out on it for the people who turned it on (the preferences already store that choice).

import type { Db } from "mongodb";
import { allows, CHANNELS, type Channel, type NotificationPrefs } from "@/lib/notifications/prefs";
import type { Candidate } from "@/lib/notifications/candidates";

export interface Recipient { memberId: string; email?: string | null; mobile?: string | null }
export type ChannelSender = (n: Candidate, to: Recipient, db: Db) => Promise<void>;

/** Fill in as channels come online, e.g. `SENDERS.email = sendNotificationEmail`. */
export const SENDERS: Partial<Record<Exclude<Channel, "inApp">, ChannelSender>> = {};

/** Sends a newly created notification on every extra channel the person has on for it. Never throws. */
export async function dispatchExtraChannels(db: Db, n: Candidate, to: Recipient, prefs: NotificationPrefs): Promise<Channel[]> {
  const sent: Channel[] = [];
  for (const ch of CHANNELS) {
    if (ch === "inApp") continue;
    const send = SENDERS[ch];
    if (!send || !allows(prefs, n, ch)) continue;
    try {
      await send(n, to, db);
      sent.push(ch);
    } catch (e) {
      console.error(`notification ${ch} send failed:`, e);
    }
  }
  return sent;
}
