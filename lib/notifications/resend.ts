// lib/notifications/resend.ts
// Trying failed deliveries again. The message is rebuilt from the member's stored notification, and a person who
// has since switched the channel off, or whose contact detail is gone, is skipped rather than sent to.

import type { Db } from "mongodb";
import { COLLECTION, loadPrefs } from "@/lib/notifications/engine";
import { senderFor } from "@/lib/notifications/channels";
import { allows } from "@/lib/notifications/prefs";
import { logDelivery, type DeliveryRow } from "@/lib/notifications/deliveryLog";
import type { Candidate } from "@/lib/notifications/candidates";

export const RESEND_LIMIT = 200;
export interface ResendResult { attempted: number; sent: number; failed: number; skipped: number; capped: boolean }

export async function resendFailed(db: Db, failures: Pick<DeliveryRow, "memberId" | "dedupeKey" | "channel">[]): Promise<ResendResult> {
  const result: ResendResult = { attempted: 0, sent: 0, failed: 0, skipped: 0, capped: failures.length > RESEND_LIMIT };
  for (const f of failures.slice(0, RESEND_LIMIT)) {
    const send = f.channel === "inApp" ? undefined : senderFor(f.channel);
    const [notif, member] = await Promise.all([
      db.collection(COLLECTION).findOne({ memberId: f.memberId, dedupeKey: f.dedupeKey }),
      db.collection("members").findOne({ memberId: f.memberId }, { projection: { contact: 1 } }),
    ]);
    if (!send || !notif || !member) { result.skipped++; continue; }
    const cand = notif as unknown as Candidate;
    const { prefs } = await loadPrefs(db, f.memberId);
    if (!allows(prefs, cand, f.channel)) { result.skipped++; continue; }
    const contact = (member.contact ?? {}) as Record<string, unknown>;
    const to = { memberId: f.memberId, email: (contact.primaryEmail ?? contact.email ?? null) as string | null, mobile: (contact.mobile ?? contact.phone ?? null) as string | null };
    result.attempted++;
    const base = { memberId: f.memberId, dedupeKey: f.dedupeKey, channel: f.channel, category: cand.category, level: cand.level, clubId: cand.clubId, title: cand.title };
    try {
      await send(cand, to, db);
      result.sent++;
      await logDelivery(db, { ...base, status: "sent" });
    } catch (e) {
      result.failed++;
      await logDelivery(db, { ...base, status: "failed", error: e instanceof Error ? e.message : String(e) });
    }
  }
  return result;
}
