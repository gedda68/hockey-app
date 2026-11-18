// lib/draw/multi.ts
// Draws for several divisions at once. Club-against-club meetings are lined up across divisions (see align.ts), the home
// side is chosen once per meeting so the clubs share one ground, and the meeting's matches go on one pitch in
// back-to-back time slots (for example BHL3, then BHL2, then BHL1). The order rotates through the rounds so no division
// always plays first. When a group can't be kept together it is placed match by match and flagged.

import { alignDivisions, clubPairKey, type DivisionInput } from "@/lib/draw/align";
import type { Busy, DrawPitch, DrawTeam } from "@/lib/draw/generate";
import { DEFAULT_OFFSET, addDays, at } from "@/lib/draw/time";

export interface MultiDrawOptions {
  divisions: DivisionInput[];
  startDate: string;
  roundGapDays?: number;
  slotTimes: string[];
  slotMinutes: number;
  bufferMinutes?: number;
  pitches: DrawPitch[];
  blackoutDates?: string[];
  pitchBusy?: Record<string, Busy[]>;
  teamBusy?: Record<string, Busy[]>;
  offset?: string;
  /** Keep a club's meetings together across divisions (default true). */
  alignClubs?: boolean;
}
export interface MultiFixture {
  divisionId: string;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  date: string | null;
  start: string | null;
  end: string | null;
  pitchId: string | null;
  venueId: string | null;
  venueName: string | null;
  addressLine: string | null;
  /** Fixtures of the same two clubs in the same round share this. */
  groupKey: string | null;
  warnings: string[];
}
export interface MultiDrawResult {
  fixtures: MultiFixture[];
  roundDates: Record<number, string>;
  unplaced: { divisionId: string; round: number; homeTeamId: string; awayTeamId: string; reason: string }[];
  homeAway: Record<string, { home: number; away: number }>;
  /** Matches that sit in a group of two or more divisions, and how many of those were placed back to back. */
  alignment: { grouped: number; together: number; matches: number };
}

const overlaps = (aS: number, aE: number, bS: number, bE: number, buf: number) => aS < bE + buf && bS < aE + buf;

export function generateMultiDraw(o: MultiDrawOptions): MultiDrawResult {
  const offset = o.offset ?? DEFAULT_OFFSET, gap = Math.max(1, o.roundGapDays ?? 7);
  const slotMs = o.slotMinutes * 60_000, buf = (o.bufferMinutes ?? 15) * 60_000;
  const black = new Set(o.blackoutDates ?? []);
  const times = [...o.slotTimes].sort();
  const teams = new Map<string, DrawTeam>(o.divisions.flatMap((d) => d.teams.map((t) => [t.teamId, t] as const)));
  const clubOf = (id: string) => teams.get(id)?.clubId ?? null;
  const divOrder = new Map(o.divisions.map((d, i) => [d.id, i]));

  // 1. Pairings, lined up across divisions
  const aligned = o.alignClubs === false ? null : alignDivisions(o.divisions);
  const base = aligned ? aligned.fixtures : alignDivisions(o.divisions.map((d) => ({ ...d, teams: d.teams.map((t) => ({ ...t, clubId: null })) }))).fixtures;
  type Item = { divisionId: string; g: number; home: string; away: string; key: string | null };
  const items: Item[] = base.map((f) => ({ divisionId: f.divisionId, g: f.g, home: f.homeTeamId, away: f.awayTeamId, key: aligned ? clubPairKey(clubOf(f.homeTeamId), clubOf(f.awayTeamId)) : null }));

  // 2. Home side chosen once per club meeting, so both clubs share a ground and the home games even out
  const clubBal = new Map<string, number>(), teamBal = new Map<string, number>();
  const gs = [...new Set(items.map((i) => i.g))].sort((a, b) => a - b);
  for (const g of gs) {
    const groups = new Map<string, Item[]>();
    for (const it of items.filter((x) => x.g === g)) { const k = it.key ?? `solo-${it.divisionId}-${it.home}`; groups.set(k, [...(groups.get(k) ?? []), it]); }
    for (const [, grp] of groups) {
      const a = clubOf(grp[0].home), b = clubOf(grp[0].away);
      let homeClub: string | null;
      if (a && b && a !== b) {
        const ba = clubBal.get(a) ?? 0, bb = clubBal.get(b) ?? 0;
        homeClub = ba <= bb ? a : b;
        if (ba === bb) homeClub = (teamBal.get(grp[0].home) ?? 0) <= (teamBal.get(grp[0].away) ?? 0) ? a : b;
      } else homeClub = null;
      for (const it of grp) {
        if (homeClub && clubOf(it.home) !== homeClub) [it.home, it.away] = [it.away, it.home];
        else if (!homeClub && (teamBal.get(it.home) ?? 0) > (teamBal.get(it.away) ?? 0)) [it.home, it.away] = [it.away, it.home];
        teamBal.set(it.home, (teamBal.get(it.home) ?? 0) + 1); teamBal.set(it.away, (teamBal.get(it.away) ?? 0) - 1);
      }
      if (homeClub && a && b) { const other = homeClub === a ? b : a; clubBal.set(homeClub, (clubBal.get(homeClub) ?? 0) + grp.length); clubBal.set(other, (clubBal.get(other) ?? 0) - grp.length); }
    }
  }

  // 3. Dates
  const roundDates: Record<number, string> = {};
  let cursor = o.startDate;
  for (const g of gs) { let d = cursor, guard = 0; while (black.has(d) && guard++ < 60) d = addDays(d, gap); roundDates[g + 1] = d; cursor = addDays(d, gap); }

  // 4. Placement
  const pitchBusy = new Map<string, Busy[]>(Object.entries(o.pitchBusy ?? {}).map(([k, v]) => [k, [...v]]));
  const teamBusy = new Map<string, Busy[]>(Object.entries(o.teamBusy ?? {}).map(([k, v]) => [k, [...v]]));
  const clubBusy = new Map<string, Busy[]>();
  const free = (m: Map<string, Busy[]>, k: string | null, s: number, e: number, b: number) => !k || !(m.get(k) ?? []).some((x) => overlaps(s, e, x.start, x.end, b));
  const book = (m: Map<string, Busy[]>, k: string | null, s: number, e: number) => { if (k) m.set(k, [...(m.get(k) ?? []), { start: s, end: e }]); };
  const pitchesByVenue = new Map<string, DrawPitch[]>();
  for (const p of o.pitches) pitchesByVenue.set(p.venueId, [...(pitchesByVenue.get(p.venueId) ?? []), p]);

  const placed: MultiFixture[] = [], unplaced: MultiDrawResult["unplaced"] = [];
  // each division's rounds are numbered 1.. in the order it actually plays them
  const seq = new Map<string, number[]>();
  for (const d of o.divisions) seq.set(d.id, [...new Set(items.filter((i) => i.divisionId === d.id).map((i) => i.g))].sort((a, b) => a - b));

  const canPlay = (it: Item, s: number, e: number, strictClub: boolean) => {
    if (!free(teamBusy, it.home, s, e, 0) || !free(teamBusy, it.away, s, e, 0)) return false;
    if (strictClub) { const hc = clubOf(it.home), ac = clubOf(it.away); if (hc && !free(clubBusy, hc, s, e, 0)) return false; if (ac && ac !== hc && !free(clubBusy, ac, s, e, 0)) return false; }
    return true;
  };
  const commit = (it: Item, p: DrawPitch, s: number, warnings: string[], groupKey: string | null) => {
    const e = s + slotMs, date = roundDates[it.g + 1];
    book(pitchBusy, p.pitchId, s, e); book(teamBusy, it.home, s, e); book(teamBusy, it.away, s, e);
    const hc = clubOf(it.home), ac = clubOf(it.away); book(clubBusy, hc, s, e); if (ac !== hc) book(clubBusy, ac, s, e);
    const home = teams.get(it.home);
    const w = [...warnings]; if (home?.homeVenueId && p.venueId !== home.homeVenueId) w.push("Not at the home team's usual ground");
    placed.push({ divisionId: it.divisionId, round: (seq.get(it.divisionId)!.indexOf(it.g)) + 1, homeTeamId: it.home, awayTeamId: it.away, date, start: new Date(s).toISOString(), end: new Date(e).toISOString(), pitchId: p.pitchId, venueId: p.venueId, venueName: p.venueName, addressLine: p.addressLine ?? null, groupKey, warnings: w });
  };
  const fail = (it: Item, reason: string) => {
    unplaced.push({ divisionId: it.divisionId, round: seq.get(it.divisionId)!.indexOf(it.g) + 1, homeTeamId: it.home, awayTeamId: it.away, reason });
    placed.push({ divisionId: it.divisionId, round: seq.get(it.divisionId)!.indexOf(it.g) + 1, homeTeamId: it.home, awayTeamId: it.away, date: roundDates[it.g + 1], start: null, end: null, pitchId: null, venueId: null, venueName: null, addressLine: null, groupKey: it.key ? `${it.g}#${it.key}` : null, warnings: [reason] });
  };

  let grouped = 0, together = 0;
  for (const g of gs) {
    const date = roundDates[g + 1];
    const slotStarts = times.map((t) => at(date, t, offset));
    const groups = new Map<string, Item[]>();
    for (const it of items.filter((x) => x.g === g)) { const k = it.key ?? `solo-${it.divisionId}-${it.home}`; groups.set(k, [...(groups.get(k) ?? []), it]); }
    // Biggest meetings first, then those wanting a particular ground.
    const list = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || Number(!!teams.get(b[1][0].home)?.homeVenueId) - Number(!!teams.get(a[1][0].home)?.homeVenueId));
    for (const [k, grp] of list) {
      // Which division goes first rotates round by round.
      const sorted = [...grp].sort((x, y) => (divOrder.get(x.divisionId)! - divOrder.get(y.divisionId)!));
      const shift = sorted.length ? g % sorted.length : 0;
      const ordered = [...sorted.slice(shift), ...sorted.slice(0, shift)];
      const key = grp.length > 1 ? `${g}#${k}` : null;
      if (grp.length > 1) grouped += grp.length;
      const homeVenue = teams.get(grp[0].home)?.homeVenueId ?? null;
      let done = false;
      if (ordered.length >= 1) {
        const pitchList = [...o.pitches].sort((a, b) => Number(b.venueId === homeVenue) - Number(a.venueId === homeVenue));
        for (const strict of [true, false]) {
          for (const p of pitchList) {
            for (let i = 0; i + ordered.length <= slotStarts.length && !done; i++) {
              const ok = ordered.every((it, j) => { const s = slotStarts[i + j]; return free(pitchBusy, p.pitchId, s, s + slotMs, buf) && canPlay(it, s, s + slotMs, strict); });
              if (ok) { ordered.forEach((it, j) => commit(it, p, slotStarts[i + j], strict ? [] : ["Another team from the same club plays at this time"], key)); done = true; if (grp.length > 1) together += grp.length; }
            }
            if (done) break;
          }
          if (done) break;
        }
      }
      if (done) continue;
      // Couldn't keep the meeting together: place each match on its own.
      for (const it of ordered) {
        let ok = false;
        for (const strict of [true, false]) {
          const ranked = o.pitches.flatMap((p) => slotStarts.map((s) => ({ p, s }))).sort((x, y) => Number(y.p.venueId === homeVenue) - Number(x.p.venueId === homeVenue) || x.s - y.s);
          const c = ranked.find(({ p, s }) => free(pitchBusy, p.pitchId, s, s + slotMs, buf) && canPlay(it, s, s + slotMs, strict));
          if (c) { commit(it, c.p, c.s, [...(grp.length > 1 ? ["Could not be placed back to back with the club's other matches"] : []), ...(strict ? [] : ["Another team from the same club plays at this time"])], key); ok = true; break; }
        }
        if (!ok) fail(it, "No free pitch and time on this date");
      }
    }
  }

  const homeAway: MultiDrawResult["homeAway"] = {};
  for (const t of teams.keys()) homeAway[t] = { home: 0, away: 0 };
  for (const f of placed) { homeAway[f.homeTeamId].home++; homeAway[f.awayTeamId].away++; }
  placed.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || (a.start ?? "").localeCompare(b.start ?? ""));
  return { fixtures: placed, roundDates, unplaced, homeAway, alignment: { grouped, together, matches: placed.length } };
}
