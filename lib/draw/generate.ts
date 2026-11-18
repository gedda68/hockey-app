// lib/draw/generate.ts
// Draw generator: pairs teams in a round robin, balances home and away, then places every match on a date, pitch and
// time without clashing with the pitch, either team, or the same club's other teams. Pure; the service loads the inputs.

import { generateRoundRobin } from "@/lib/competitions/roundRobin";
import { DEFAULT_OFFSET, addDays, at } from "@/lib/draw/time";

export interface DrawTeam { teamId: string; clubId?: string | null; homeVenueId?: string | null }
export interface DrawPitch { pitchId: string; venueId: string; venueName: string; addressLine?: string | null }
export interface Busy { start: number; end: number }

export interface DrawOptions {
  teams: DrawTeam[];
  doubleRound?: boolean;
  /** Date of the first round, YYYY-MM-DD. */
  startDate: string;
  /** Days between rounds (7 = weekly). */
  roundGapDays?: number;
  /** Start times each pitch can host, "HH:MM". */
  slotTimes: string[];
  slotMinutes: number;
  /** Gap kept between matches on one pitch. */
  bufferMinutes?: number;
  pitches: DrawPitch[];
  /** Dates with no play (public holidays, school holidays). The round moves to the next free date. */
  blackoutDates?: string[];
  /** Matches already booked, from other competitions. */
  pitchBusy?: Record<string, Busy[]>;
  teamBusy?: Record<string, Busy[]>;
  offset?: string;
}

export interface DrawFixture {
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
  warnings: string[];
}
export interface DrawResult {
  fixtures: DrawFixture[];
  roundDates: Record<number, string>;
  /** Matches that found no free slot on their round's date. */
  unplaced: { round: number; homeTeamId: string; awayTeamId: string; reason: string }[];
  homeAway: Record<string, { home: number; away: number }>;
}

const overlaps = (aS: number, aE: number, bS: number, bE: number, buf: number) => aS < bE + buf && bS < aE + buf;

/** Swap home and away where it evens out each team's home count (a team never gets far more home games than away). */
export function balanceHomeAway<T extends { homeTeamId: string; awayTeamId: string }>(fixtures: T[]): T[] {
  const out = fixtures.map((f) => ({ ...f }));
  const bal = new Map<string, number>(); // home minus away
  const get = (t: string) => bal.get(t) ?? 0;
  for (const f of out) {
    const before = Math.abs(get(f.homeTeamId) + 1) + Math.abs(get(f.awayTeamId) - 1);
    const after = Math.abs(get(f.homeTeamId) - 1) + Math.abs(get(f.awayTeamId) + 1);
    if (after < before) [f.homeTeamId, f.awayTeamId] = [f.awayTeamId, f.homeTeamId];
    bal.set(f.homeTeamId, get(f.homeTeamId) + 1);
    bal.set(f.awayTeamId, get(f.awayTeamId) - 1);
  }
  return out;
}

export function generateDraw(o: DrawOptions): DrawResult {
  const offset = o.offset ?? DEFAULT_OFFSET, gap = Math.max(1, o.roundGapDays ?? 7);
  const slotMs = o.slotMinutes * 60_000, buf = (o.bufferMinutes ?? 15) * 60_000;
  const black = new Set(o.blackoutDates ?? []);
  const teamById = new Map(o.teams.map((t) => [t.teamId, t]));
  const clubOf = (id: string) => teamById.get(id)?.clubId ?? null;

  const pairs = balanceHomeAway(generateRoundRobin(o.teams.map((t) => t.teamId), { doubleRound: o.doubleRound }));
  const rounds = [...new Set(pairs.map((p) => p.round))].sort((a, b) => a - b);

  const pitchBusy = new Map<string, Busy[]>(Object.entries(o.pitchBusy ?? {}).map(([k, v]) => [k, [...v]]));
  const teamBusy = new Map<string, Busy[]>(Object.entries(o.teamBusy ?? {}).map(([k, v]) => [k, [...v]]));
  const clubBusy = new Map<string, Busy[]>();
  const free = (m: Map<string, Busy[]>, k: string | null, s: number, e: number, b: number) => !k || !(m.get(k) ?? []).some((x) => overlaps(s, e, x.start, x.end, b));
  const book = (m: Map<string, Busy[]>, k: string | null, s: number, e: number) => { if (k) m.set(k, [...(m.get(k) ?? []), { start: s, end: e }]); };

  const fixtures: DrawFixture[] = [], unplaced: DrawResult["unplaced"] = [], roundDates: Record<number, string> = {};
  let cursor = o.startDate;
  const times = [...o.slotTimes].sort();

  for (const r of rounds) {
    let date = cursor, guard = 0;
    while (black.has(date) && guard++ < 60) date = addDays(date, gap);
    roundDates[r] = date; cursor = addDays(date, gap);

    const slots = times.flatMap((t) => o.pitches.map((p) => ({ pitch: p, start: at(date, t, offset) })));
    const todays = pairs.filter((p) => p.round === r);
    // Matches wanting a particular home ground go first so they are not squeezed out.
    todays.sort((a, b) => Number(!!teamById.get(b.homeTeamId)?.homeVenueId) - Number(!!teamById.get(a.homeTeamId)?.homeVenueId));

    for (const m of todays) {
      const home = teamById.get(m.homeTeamId), hc = clubOf(m.homeTeamId), ac = clubOf(m.awayTeamId);
      const ranked = [...slots].sort((x, y) => Number(y.pitch.venueId === home?.homeVenueId) - Number(x.pitch.venueId === home?.homeVenueId) || x.start - y.start);
      let chosen: (typeof slots)[number] | null = null, clubWarn = false;
      for (const strictClub of [true, false]) {
        chosen = ranked.find((s) => {
          const e = s.start + slotMs;
          if (!free(pitchBusy, s.pitch.pitchId, s.start, e, buf)) return false;
          if (!free(teamBusy, m.homeTeamId, s.start, e, 0) || !free(teamBusy, m.awayTeamId, s.start, e, 0)) return false;
          if (strictClub) {
            // Same-club teams playing at the same time split the club's umpires, coaches and parents.
            if (hc && !free(clubBusy, hc, s.start, e, 0)) return false;
            if (ac && ac !== hc && !free(clubBusy, ac, s.start, e, 0)) return false;
          }
          return true;
        }) ?? null;
        if (chosen) { clubWarn = !strictClub; break; }
      }
      if (!chosen) {
        unplaced.push({ round: r, homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId, reason: "No free pitch and time on this date" });
        fixtures.push({ round: r, homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId, date, start: null, end: null, pitchId: null, venueId: null, venueName: null, addressLine: null, warnings: ["No free pitch and time on this date"] });
        continue;
      }
      const e = chosen.start + slotMs;
      book(pitchBusy, chosen.pitch.pitchId, chosen.start, e);
      book(teamBusy, m.homeTeamId, chosen.start, e); book(teamBusy, m.awayTeamId, chosen.start, e);
      book(clubBusy, hc, chosen.start, e); if (ac !== hc) book(clubBusy, ac, chosen.start, e);
      const warnings: string[] = [];
      if (clubWarn) warnings.push("Another team from the same club plays at this time");
      if (home?.homeVenueId && chosen.pitch.venueId !== home.homeVenueId) warnings.push("Not at the home team's usual ground");
      fixtures.push({ round: r, homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId, date, start: new Date(chosen.start).toISOString(), end: new Date(e).toISOString(), pitchId: chosen.pitch.pitchId, venueId: chosen.pitch.venueId, venueName: chosen.pitch.venueName, addressLine: chosen.pitch.addressLine ?? null, warnings });
    }
  }

  const homeAway: DrawResult["homeAway"] = {};
  for (const t of o.teams) homeAway[t.teamId] = { home: 0, away: 0 };
  for (const f of fixtures) { homeAway[f.homeTeamId].home++; homeAway[f.awayTeamId].away++; }
  fixtures.sort((a, b) => a.round - b.round || (a.start ?? "").localeCompare(b.start ?? ""));
  return { fixtures, roundDates, unplaced, homeAway };
}
