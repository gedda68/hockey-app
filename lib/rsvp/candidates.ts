// lib/rsvp/candidates.ts
// A match availability request that's waiting for your answer, as a notification. Pure.

import type { Candidate } from "@/lib/notifications/candidates";

export interface RsvpPendingLike { requestId: string; inviteId: string; title: string; teamName: string; matchDate: string; startsAt?: string | null; status: string; forChild?: string; matchStartMs: number }

export function rsvpCandidates(rows: RsvpPendingLike[], now: Date): Candidate[] {
  const out: Candidate[] = [];
  for (const r of rows) {
    if (r.status !== "open" || r.matchStartMs <= now.getTime()) continue;
    const when = new Date(r.matchStartMs).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "Australia/Brisbane" });
    out.push({
      dedupeKey: `rsvp:${r.inviteId}`,
      level: "club",
      category: "availability",
      type: "rsvp",
      title: r.forChild ? `Can ${r.forChild} play on ${when}?` : `Can you play on ${when}?`,
      message: `${r.teamName}: ${r.title}. One tap to answer.`,
      link: "/admin/my-availability",
      eventAt: new Date(r.matchStartMs).toISOString(),
      expiresAt: new Date(r.matchStartMs).toISOString(),
    });
  }
  return out;
}
