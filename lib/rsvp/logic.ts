// lib/rsvp/logic.ts
// Match availability requests ("can you play on 14/06/2026?"): validation, the coach's summary and when reminders are
// due. Pure: no database access.

export const ANSWERS = ["in", "out", "maybe"] as const;
export type RsvpAnswer = (typeof ANSWERS)[number];
export const ANSWER_LABELS: Record<RsvpAnswer, string> = { in: "I'm in", maybe: "Maybe", out: "Can't make it" };

export interface RsvpInput {
  title: string;
  matchDate: string; // YYYY-MM-DD, a day in the playing zone
  startsAt?: string; // ISO start time when known
  venue?: string;
  fixtureId?: string;
  note?: string;
  squadSize: number | null;
}

export interface RsvpRequestLike { status: string; createdAt: string; matchDate: string; startsAt?: string | null }
export interface RsvpInviteLike { status: string; remindersSent?: number; lastRemindedAt?: string | null }

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const HOUR = 3600_000;
const ZONE_OFFSET = "+10:00"; // Australia/Brisbane has no daylight saving

export function cleanRsvp(body: unknown, today: string): { ok: true; value: RsvpInput } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const title = String(b.title ?? "").trim().slice(0, 120);
  if (!title) return { ok: false, error: "Add a short title, e.g. Round 5 v Brothers" };
  const matchDate = String(b.matchDate ?? "");
  if (!DAY.test(matchDate) || Number.isNaN(Date.parse(`${matchDate}T00:00:00Z`)) || new Date(`${matchDate}T00:00:00Z`).toISOString().slice(0, 10) !== matchDate) return { ok: false, error: "Choose the match date" };
  if (matchDate < today) return { ok: false, error: "That date has already passed" };
  let startsAt: string | undefined;
  if (b.startsAt) {
    const t = Date.parse(String(b.startsAt));
    if (Number.isNaN(t)) return { ok: false, error: "The start time isn't valid" };
    startsAt = new Date(t).toISOString();
  }
  const sq = b.squadSize === null || b.squadSize === undefined || b.squadSize === "" ? null : Math.round(Number(b.squadSize));
  if (sq !== null && (!Number.isFinite(sq) || sq < 1 || sq > 60)) return { ok: false, error: "Squad size should be between 1 and 60" };
  const venue = String(b.venue ?? "").trim().slice(0, 120);
  const note = String(b.note ?? "").trim().slice(0, 300);
  const fixtureId = String(b.fixtureId ?? "").trim().slice(0, 80);
  return { ok: true, value: { title, matchDate, ...(startsAt ? { startsAt } : {}), ...(venue ? { venue } : {}), ...(fixtureId ? { fixtureId } : {}), ...(note ? { note } : {}), squadSize: sq } };
}

/** When the match starts (its start time, else the beginning of its day). */
export const matchStartMs = (r: Pick<RsvpRequestLike, "matchDate" | "startsAt">): number =>
  r.startsAt ? Date.parse(r.startsAt) : Date.parse(`${r.matchDate}T00:00:00${ZONE_OFFSET}`);

/** Hour of day (0-23) in the playing zone. */
const localHour = (now: Date) => new Date(now.getTime() + 10 * HOUR).getUTCHours();

/** Nobody is nagged overnight. */
export const isQuietHour = (now: Date) => { const h = localHour(now); return h < 7 || h >= 21; };

/**
 * Which reminder (1 or 2) a person who hasn't answered is due, or null.
 * 1: a day after the request (sooner if the match is close). 2: about a day and a half before the match.
 * At most two, at least 12 hours apart, never overnight, never once the match has started.
 */
export function dueReminder(req: RsvpRequestLike, inv: RsvpInviteLike, now: Date): 1 | 2 | null {
  if (req.status !== "open" || inv.status !== "pending") return null;
  const start = matchStartMs(req);
  const t = now.getTime();
  if (t >= start || isQuietHour(now)) return null;
  const sent = inv.remindersSent ?? 0;
  if (sent >= 2) return null;
  const created = Date.parse(req.createdAt);
  if (sent === 0) return t >= created + Math.min(24 * HOUR, (start - created) / 3) ? 1 : null;
  const last = inv.lastRemindedAt ? Date.parse(inv.lastRemindedAt) : created;
  return t >= start - 36 * HOUR && t - last >= 12 * HOUR ? 2 : null;
}

export type Bucket = "in" | "maybe" | "out" | "away" | "noReply";
export interface SummaryRow { inviteId: string; memberId: string; name: string; answer?: RsvpAnswer; note?: string; respondedAt?: string; answeredByParent?: boolean; remindersSent: number }
export interface RsvpSummary {
  counts: Record<Bucket, number>;
  total: number;
  /** Players still needed to fill the squad, when a squad size was set. */
  needed: number | null;
  buckets: Record<Bucket, SummaryRow[]>;
}

/** The coach's view. Someone who hasn't answered but is marked away for that date shows as "away", not "no reply". */
export function summarise(
  rows: (SummaryRow & { status: string })[],
  squadSize: number | null,
  awayMemberIds: Set<string>,
): RsvpSummary {
  const buckets: Record<Bucket, SummaryRow[]> = { in: [], maybe: [], out: [], away: [], noReply: [] };
  for (const r of rows) {
    const b: Bucket = r.answer ?? (awayMemberIds.has(r.memberId) ? "away" : "noReply");
    buckets[b].push(r);
  }
  for (const k of Object.keys(buckets) as Bucket[]) buckets[k].sort((a, b) => a.name.localeCompare(b.name));
  const counts = Object.fromEntries((Object.keys(buckets) as Bucket[]).map((k) => [k, buckets[k].length])) as Record<Bucket, number>;
  return { counts, total: rows.length, needed: squadSize ? Math.max(0, squadSize - counts.in) : null, buckets };
}
