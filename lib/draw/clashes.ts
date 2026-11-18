// lib/draw/clashes.ts
// Finds clashes in a set of scheduled matches: a pitch used twice, a team or umpire in two places, an umpire who can't
// get between grounds, an umpire from a team's own club. Pure; used for the generated draw and for a live competition.

export interface SchedFixture {
  id: string;
  start: number | null;
  end: number | null;
  pitchId?: string | null;
  venueId?: string | null;
  homeTeamId: string;
  awayTeamId: string;
  umpires: string[];
}
export type ClashKind = "pitch_overlap" | "team_double_booked" | "club_simultaneous" | "umpire_double_booked" | "umpire_travel" | "umpire_own_club" | "unscheduled";
export interface Clash { kind: ClashKind; severity: "block" | "warn"; fixtureIds: string[]; message: string }

export interface ClashOptions {
  bufferMinutes?: number;
  travelMinutes?: number;
  clubOf?: Record<string, string | null | undefined>;
  umpireClub?: Record<string, string | null | undefined>;
  nameOf?: (id: string) => string;
}

const ov = (a: SchedFixture, b: SchedFixture, buf: number) => a.start! < b.end! + buf && b.start! < a.end! + buf;

export function findClashes(all: SchedFixture[], o: ClashOptions = {}): Clash[] {
  const buf = (o.bufferMinutes ?? 15) * 60_000, travel = (o.travelMinutes ?? 30) * 60_000;
  const nm = o.nameOf ?? ((id: string) => id), clubOf = o.clubOf ?? {}, umpClub = o.umpireClub ?? {};
  const out: Clash[] = [];
  const timed = all.filter((f) => f.start != null && f.end != null);
  for (const f of all) if (f.start == null) out.push({ kind: "unscheduled", severity: "warn", fixtureIds: [f.id], message: `${nm(f.homeTeamId)} v ${nm(f.awayTeamId)} has no time or pitch yet` });

  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i], b = timed[j], ids = [a.id, b.id];
      if (a.pitchId && a.pitchId === b.pitchId && ov(a, b, buf)) out.push({ kind: "pitch_overlap", severity: "block", fixtureIds: ids, message: `Two matches on the same pitch at overlapping times` });
      const shared = [a.homeTeamId, a.awayTeamId].filter((t) => t === b.homeTeamId || t === b.awayTeamId);
      if (shared.length && ov(a, b, 0)) out.push({ kind: "team_double_booked", severity: "block", fixtureIds: ids, message: `${nm(shared[0])} is in two matches at once` });
      else {
        const ca = new Set([a.homeTeamId, a.awayTeamId].map((t) => clubOf[t]).filter(Boolean)), cb = [b.homeTeamId, b.awayTeamId].map((t) => clubOf[t]).filter(Boolean);
        const both = cb.find((c) => ca.has(c));
        if (both && ov(a, b, 0) && !shared.length) out.push({ kind: "club_simultaneous", severity: "warn", fixtureIds: ids, message: `Two teams from ${both} play at the same time` });
      }
      for (const u of a.umpires) if (b.umpires.includes(u)) {
        if (ov(a, b, 0)) out.push({ kind: "umpire_double_booked", severity: "block", fixtureIds: ids, message: `${nm(u)} is allocated to two matches at once` });
        else if ((a.venueId ?? a.pitchId) !== (b.venueId ?? b.pitchId)) {
          const [first, second] = a.start! < b.start! ? [a, b] : [b, a];
          if (second.start! - first.end! < travel) out.push({ kind: "umpire_travel", severity: "warn", fixtureIds: ids, message: `${nm(u)} has under ${o.travelMinutes ?? 30} minutes to travel between grounds` });
        }
      }
    }
  }
  for (const f of all) for (const u of f.umpires) {
    const c = umpClub[u];
    if (c && (c === clubOf[f.homeTeamId] || c === clubOf[f.awayTeamId])) out.push({ kind: "umpire_own_club", severity: "block", fixtureIds: [f.id], message: `${nm(u)} umpires a match involving their own club` });
  }
  return out;
}
