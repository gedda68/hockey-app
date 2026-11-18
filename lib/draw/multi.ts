// lib/draw/multi.ts
// Draws for several divisions at once. Club-against-club meetings are lined up across divisions (see align.ts), the home
// side is chosen once per meeting so the clubs share one ground, and the meeting's matches go on one pitch in
// back-to-back time slots (for example BHL3, then BHL2, then BHL1). The order rotates through the rounds so no division
// always plays first. When a group can't be kept together it is placed match by match and flagged.

import { alignDivisions, clubPairKey, type DivisionInput } from "@/lib/draw/align";
import type { Busy, DrawPitch, DrawTeam } from "@/lib/draw/generate";
import { DEFAULT_OFFSET, addDays, at } from "@/lib/draw/time";

export interface MultiDivision extends DivisionInput {
  /** Days after the round's first date that this division plays (0 = same day, 1 = the next day). */
  dayOffset?: number;
  /** This division's own start times; defaults to the draw's slot times. Divisions that play on the same day at the same times are drawn together. */
  slotTimes?: string[];
}
export interface MultiDrawOptions {
  divisions: MultiDivision[];
  /** Venues that clubs without a ground of their own may use. When set, other clubs' grounds are never used for them. */
  sharedVenueIds?: string[];
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

  // 1. Pairings, lined up across divisions that play on the same day at the same times
  type Item = { divisionId: string; g: number; home: string; away: string; key: string | null; cls: string };
  const classOf = (d: MultiDivision) => `${d.dayOffset ?? 0}|${(d.slotTimes?.length ? [...d.slotTimes].sort() : times).join(",")}`;
  const classes = new Map<string, MultiDivision[]>();
  for (const d of o.divisions) classes.set(classOf(d), [...(classes.get(classOf(d)) ?? []), d]);
  const classInfo = new Map<string, { dayOffset: number; times: string[] }>();
  for (const [c, ds] of classes) classInfo.set(c, { dayOffset: ds[0].dayOffset ?? 0, times: ds[0].slotTimes?.length ? [...ds[0].slotTimes].sort() : times });
  const items: Item[] = [];
  for (const [c, ds] of classes) {
    const noClubs = o.alignClubs === false;
    const r = alignDivisions(noClubs ? ds.map((d) => ({ ...d, teams: d.teams.map((t) => ({ ...t, clubId: null })) })) : ds);
    for (const f of r.fixtures) items.push({ divisionId: f.divisionId, g: f.g, home: f.homeTeamId, away: f.awayTeamId, key: noClubs ? null : clubPairKey(clubOf(f.homeTeamId), clubOf(f.awayTeamId)), cls: c });
  }

  // 2. Home side chosen once per club meeting, so both clubs share a ground and the home games even out
  const clubBal = new Map<string, number>(), teamBal = new Map<string, number>();
  const gs = [...new Set(items.map((i) => i.g))].sort((a, b) => a - b);
  for (const g of gs) {
    const groups = new Map<string, Item[]>();
    for (const it of items.filter((x) => x.g === g)) { const k = it.key ?? `solo-${it.divisionId}-${it.home}`; groups.set(k, [...(groups.get(k) ?? []), it]); }
    for (const [, grp] of groups) {
      const a = clubOf(grp[0].home), b = clubOf(grp[0].away);
      let homeClub: string | null = null;
      if (a && b && a !== b) {
        // Try each club as the host and keep the one that leaves its teams' home and away counts most even.
        const cost = (host: string) => grp.reduce((sum, it) => {
          const h = clubOf(it.home) === host ? it.home : it.away, w = h === it.home ? it.away : it.home;
          return sum + ((teamBal.get(h) ?? 0) + 1) ** 2 + ((teamBal.get(w) ?? 0) - 1) ** 2;
        }, 0);
        const ca = cost(a), cb = cost(b);
        homeClub = ca < cb ? a : cb < ca ? b : (clubBal.get(a) ?? 0) <= (clubBal.get(b) ?? 0) ? a : b;
      }
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
  const offsets = [...new Set([...classInfo.values()].map((c) => c.dayOffset))];
  for (const g of gs) { let d = cursor, guard = 0; while (offsets.some((n) => black.has(addDays(d, n))) && guard++ < 60) d = addDays(d, gap); roundDates[g + 1] = d; cursor = addDays(d, gap); }

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

  const dateOf = (it: Item) => addDays(roundDates[it.g + 1], classInfo.get(it.cls)!.dayOffset);
  const canPlay = (it: Item, s: number, e: number, strictClub: boolean) => {
    if (!free(teamBusy, it.home, s, e, 0) || !free(teamBusy, it.away, s, e, 0)) return false;
    if (strictClub) { const hc = clubOf(it.home), ac = clubOf(it.away); if (hc && !free(clubBusy, hc, s, e, 0)) return false; if (ac && ac !== hc && !free(clubBusy, ac, s, e, 0)) return false; }
    return true;
  };
  const commit = (it: Item, p: DrawPitch, s: number, warnings: string[], groupKey: string | null) => {
    const e = s + slotMs, date = dateOf(it);
    book(pitchBusy, p.pitchId, s, e); book(teamBusy, it.home, s, e); book(teamBusy, it.away, s, e);
    const hc = clubOf(it.home), ac = clubOf(it.away); book(clubBusy, hc, s, e); if (ac !== hc) book(clubBusy, ac, s, e);
    const home = teams.get(it.home);
    const w = [...warnings]; if (home?.homeVenueId && p.venueId !== home.homeVenueId) w.push("Not at the home team's usual ground");
    placed.push({ divisionId: it.divisionId, round: (seq.get(it.divisionId)!.indexOf(it.g)) + 1, homeTeamId: it.home, awayTeamId: it.away, date, start: new Date(s).toISOString(), end: new Date(e).toISOString(), pitchId: p.pitchId, venueId: p.venueId, venueName: p.venueName, addressLine: p.addressLine ?? null, groupKey, warnings: w });
  };
  const fail = (it: Item, reason: string) => {
    unplaced.push({ divisionId: it.divisionId, round: seq.get(it.divisionId)!.indexOf(it.g) + 1, homeTeamId: it.home, awayTeamId: it.away, reason });
    placed.push({ divisionId: it.divisionId, round: seq.get(it.divisionId)!.indexOf(it.g) + 1, homeTeamId: it.home, awayTeamId: it.away, date: dateOf(it), start: null, end: null, pitchId: null, venueId: null, venueName: null, addressLine: null, groupKey: it.key ? `${it.g}#${it.key}` : null, warnings: [reason] });
  };

  let grouped = 0, together = 0;
  const rounds = [...classInfo.keys()].flatMap((cls) => gs.map((g) => ({ cls, g }))).sort((a, b) => a.g - b.g || classInfo.get(a.cls)!.dayOffset - classInfo.get(b.cls)!.dayOffset);
  for (const { cls, g } of rounds) {
    const info = classInfo.get(cls)!, date = addDays(roundDates[g + 1], info.dayOffset);
    const slotStarts = info.times.map((t) => at(date, t, offset));
    const groups = new Map<string, Item[]>();
    for (const it of items.filter((x) => x.g === g && x.cls === cls)) { const k = it.key ?? `solo-${it.divisionId}-${it.home}`; groups.set(k, [...(groups.get(k) ?? []), it]); }
    if (!groups.size) continue;
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
      const shared = o.sharedVenueIds?.length ? new Set(o.sharedVenueIds) : null;
      const allowed = (p: DrawPitch) => !shared || p.venueId === homeVenue || shared.has(p.venueId);
      const usable = o.pitches.filter(allowed);
      let done = false;
      if (ordered.length >= 1) {
        const pitchList = [...usable].sort((a, b) => Number(b.venueId === homeVenue) - Number(a.venueId === homeVenue));
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
          const ranked = usable.flatMap((p) => slotStarts.map((s) => ({ p, s }))).sort((x, y) => Number(y.p.venueId === homeVenue) - Number(x.p.venueId === homeVenue) || x.s - y.s);
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
