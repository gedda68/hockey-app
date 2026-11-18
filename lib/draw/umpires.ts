// lib/draw/umpires.ts
// Suggests umpires for a set of matches. An official is only suggested when they are free, not marked unavailable, not
// from either club, not related to a player in either team, under their daily limit, and can get between grounds.
// Among those who qualify, the least-used come first so the work is shared, then best fit for the match level and
// fewest changes of ground. Pure.

import { dayOf } from "@/lib/draw/time";

export interface UmpMatch {
  id: string;
  start: number;
  end: number;
  venueId?: string | null;
  homeTeamId: string;
  awayTeamId: string;
  /** Minimum qualification tier needed (0 = anyone). */
  requiredTier?: number;
  /** Officials already on this match. */
  existing?: string[];
  /** How many umpires are wanted in total. */
  slots?: number;
}
export interface Official {
  id: string;
  name: string;
  clubId?: string | null;
  /** 0 beginner to 3 national. */
  tier: number;
  /** The register says they are not taking matches. */
  unavailable?: boolean;
  /** Days (YYYY-MM-DD) they have marked themselves unavailable. */
  unavailableDays?: string[];
  /** Teams where a close relative plays. */
  conflictTeamIds?: string[];
  maxPerDay?: number;
}
export interface UmpOptions {
  clubOf: Record<string, string | null | undefined>;
  offset?: string;
  travelMinutes?: number;
  maxPerDay?: number;
  /** Matches already allocated elsewhere (other competitions) as busy windows by official. */
  busy?: Record<string, { start: number; end: number; venueId?: string | null }[]>;
  /** Count of matches already given this season, so the load stays even. */
  priorLoad?: Record<string, number>;
}
export interface Suggestion { matchId: string; slotIndex: number; umpireId: string; umpireName: string; umpireType: string; notes: string[] }
export interface Gap { matchId: string; slotIndex: number; reason: string }

/** Qualification tier from the register's level text. */
export function tierFromLabel(label: string | null | undefined, codes: string[] = []): number {
  const s = [label ?? "", ...codes].join(" ").toLowerCase();
  if (/national|international|level\s*3|\bl3\b/.test(s)) return 3;
  if (/level\s*2|\bl2\b|state/.test(s)) return 2;
  if (/level\s*1|\bl1\b|club/.test(s)) return 1;
  return 0;
}

export function suggestUmpires(matches: UmpMatch[], officials: Official[], o: UmpOptions): { suggestions: Suggestion[]; gaps: Gap[]; load: Record<string, number> } {
  const travel = (o.travelMinutes ?? 30) * 60_000, off = o.offset;
  const load: Record<string, number> = {};
  const given = new Map<string, { start: number; end: number; venueId?: string | null }[]>();
  const add = (id: string, w: { start: number; end: number; venueId?: string | null }) => { given.set(id, [...(given.get(id) ?? []), w]); load[id] = (load[id] ?? 0) + 1; };
  for (const [id, ws] of Object.entries(o.busy ?? {})) for (const w of ws) given.set(id, [...(given.get(id) ?? []), w]);
  for (const m of matches) for (const id of m.existing ?? []) add(id, { start: m.start, end: m.end, venueId: m.venueId });

  const eligible = (u: Official, m: UmpMatch, slot: number): { ok: boolean; why?: string } => {
    if (u.unavailable) return { ok: false, why: "not taking matches" };
    if (m.existing?.includes(u.id)) return { ok: false, why: "already on this match" };
    const club = u.clubId;
    if (club && (club === o.clubOf[m.homeTeamId] || club === o.clubOf[m.awayTeamId])) return { ok: false, why: "own club" };
    if (u.conflictTeamIds?.some((t) => t === m.homeTeamId || t === m.awayTeamId)) return { ok: false, why: "relative plays" };
    const day = dayOf(m.start, off);
    if (u.unavailableDays?.includes(day)) return { ok: false, why: "marked unavailable" };
    if (slot === 0 && (m.requiredTier ?? 0) > u.tier) return { ok: false, why: "qualification too low" };
    const mine = given.get(u.id) ?? [];
    const sameDay = mine.filter((w) => dayOf(w.start, off) === day);
    if (sameDay.length >= (u.maxPerDay ?? o.maxPerDay ?? 3)) return { ok: false, why: "daily limit" };
    for (const w of sameDay) {
      const gap = m.start >= w.end ? m.start - w.end : w.start >= m.end ? w.start - m.end : -1;
      if (gap < 0) return { ok: false, why: "already allocated then" };
      if (w.venueId !== m.venueId && gap < travel) return { ok: false, why: "not enough travel time" };
    }
    return { ok: true };
  };

  // Most constrained matches first within a start time, so the hard ones aren't left with nobody.
  const order = [...matches].sort((a, b) => a.start - b.start || (b.requiredTier ?? 0) - (a.requiredTier ?? 0));
  const suggestions: Suggestion[] = [], gaps: Gap[] = [];
  for (const m of order) {
    const want = m.slots ?? 2, have = (m.existing ?? []).length;
    for (let s = have; s < want; s++) {
      const pool = officials.filter((u) => eligible(u, m, s).ok && !suggestions.some((x) => x.matchId === m.id && x.umpireId === u.id));
      if (!pool.length) {
        const reasons = new Map<string, number>();
        for (const u of officials) { const r = eligible(u, m, s); if (!r.ok && r.why) reasons.set(r.why, (reasons.get(r.why) ?? 0) + 1); }
        const top = [...reasons.entries()].sort((a, b) => b[1] - a[1])[0];
        gaps.push({ matchId: m.id, slotIndex: s, reason: officials.length ? `No one free${top ? ` (mostly: ${top[0]})` : ""}` : "No officials on the register" });
        continue;
      }
      const score = (u: Official) => {
        const day = dayOf(m.start, off), mine = (given.get(u.id) ?? []).filter((w) => dayOf(w.start, off) === day);
        let v = -((load[u.id] ?? 0) + (o.priorLoad?.[u.id] ?? 0)) * 10;
        const need = s === 0 ? m.requiredTier ?? 0 : 0;
        v -= Math.max(0, u.tier - Math.max(need, 1)) * 2; // keep the top officials for the matches that need them
        if (mine.some((w) => w.venueId === m.venueId)) v += 4; // already at this ground that day
        else if (mine.length) v -= 3;
        return v;
      };
      pool.sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
      const pick = pool[0], notes: string[] = [];
      if ((given.get(pick.id) ?? []).some((w) => w.venueId === m.venueId && dayOf(w.start, off) === dayOf(m.start, off))) notes.push("already at this ground");
      if ((o.priorLoad?.[pick.id] ?? 0) + (load[pick.id] ?? 0) === 0) notes.push("no matches yet");
      add(pick.id, { start: m.start, end: m.end, venueId: m.venueId });
      suggestions.push({ matchId: m.id, slotIndex: s, umpireId: pick.id, umpireName: pick.name, umpireType: `Match Umpire ${s + 1}`, notes });
    }
  }
  return { suggestions, gaps, load };
}
