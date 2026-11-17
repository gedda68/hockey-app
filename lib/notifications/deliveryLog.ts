// lib/notifications/deliveryLog.ts
// A record of every delivery attempt on a channel, so admins can see what reached people and what failed.
// Logging never breaks sending: any error here is swallowed.

import type { Db } from "mongodb";
import type { Channel } from "@/lib/notifications/prefs";

export const DELIVERIES = "notification_deliveries";
export const RETAIN_DAYS = 90;

export interface DeliveryRow {
  memberId: string; dedupeKey: string; channel: Channel; status: "sent" | "failed";
  error?: string; category: string; level: string; clubId?: string; title?: string; at: string;
}

export async function logDelivery(db: Db, row: Omit<DeliveryRow, "at"> & { at?: string }): Promise<void> {
  try {
    await db.collection(DELIVERIES).insertOne({ ...row, at: row.at ?? new Date().toISOString(), ...(row.error ? { error: row.error.slice(0, 200) } : {}) });
  } catch (e) {
    console.error("delivery log write failed:", e);
  }
}

export async function pruneDeliveries(db: Db, now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - RETAIN_DAYS * 86_400_000).toISOString();
  const r = await db.collection(DELIVERIES).deleteMany({ at: { $lt: cutoff } });
  return r.deletedCount ?? 0;
}

export type ChannelTally = Record<Channel, { sent: number; failed: number }>;

/** Counts per channel; a person counts once per channel (their latest attempt wins). */
export function tally(rows: Pick<DeliveryRow, "memberId" | "channel" | "status" | "at">[]): ChannelTally {
  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const k = `${r.channel}|${r.memberId}`;
    const cur = latest.get(k);
    if (!cur || r.at >= cur.at) latest.set(k, r);
  }
  const out: ChannelTally = { inApp: { sent: 0, failed: 0 }, email: { sent: 0, failed: 0 }, sms: { sent: 0, failed: 0 }, social: { sent: 0, failed: 0 } };
  for (const r of latest.values()) out[r.channel][r.status]++;
  return out;
}

/** The latest attempt per person, channel and notification, keeping only those that failed. */
export function latestFailed<T extends Pick<DeliveryRow, "memberId" | "channel" | "status" | "at" | "dedupeKey">>(rows: T[]): T[] {
  const latest = new Map<string, T>();
  for (const r of rows) {
    const k = `${r.dedupeKey}|${r.channel}|${r.memberId}`;
    const cur = latest.get(k);
    if (!cur || r.at >= cur.at) latest.set(k, r);
  }
  return [...latest.values()].filter((r) => r.status === "failed").sort((a, b) => b.at.localeCompare(a.at));
}

/** Counts by category and channel, counting each person once per notification and channel (latest attempt wins). */
export function summarize(rows: Pick<DeliveryRow, "memberId" | "channel" | "status" | "at" | "dedupeKey" | "category">[]): { category: string; channel: Channel; sent: number; failed: number }[] {
  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const k = `${r.dedupeKey}|${r.channel}|${r.memberId}`;
    const cur = latest.get(k);
    if (!cur || r.at >= cur.at) latest.set(k, r);
  }
  const out = new Map<string, { category: string; channel: Channel; sent: number; failed: number }>();
  for (const r of latest.values()) {
    const k = `${r.category}|${r.channel}`;
    const e = out.get(k) ?? { category: r.category, channel: r.channel, sent: 0, failed: 0 };
    e[r.status]++;
    out.set(k, e);
  }
  return [...out.values()].sort((a, b) => a.category.localeCompare(b.category) || a.channel.localeCompare(b.channel));
}
