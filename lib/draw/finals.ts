// lib/draw/finals.ts — finals brackets, played weekly and ending on the grand final date.
//
//  10 or more teams (top five): week 1 pos 2 v 3 and pos 4 v 5 (pos 1 has the bye); week 2 pos 1 v winner of game 1,
//  and loser of game 1 v winner of game 2; week 3 loser of game 3 v winner of game 4 (the winner of game 3 is through);
//  week 4 grand final.
//  9 or fewer (top four): week 1 pos 1 v 2 and pos 3 v 4; week 2 loser of game 1 v winner of game 2 (the winner of
//  game 1 is through); week 3 grand final.
import { addDays } from "@/lib/draw/time";
import type { DrawPitch } from "@/lib/draw/generate";
import { slotGrid } from "@/lib/draw/time";

export type Slot = { kind: "pos"; pos: number } | { kind: "winner"; game: number } | { kind: "loser"; game: number } | { kind: "through"; game: number };
export interface FinalsGame { game: number; week: number; name: string; home: Slot; away: Slot; grandFinal: boolean }
export interface FinalsPlan { weeks: number; qualifiers: number; games: FinalsGame[]; byes: { week: number; pos: number }[] }

/** Season length rule: 8 or more teams play each other twice, 7 or fewer three times. */
export const legsForTeams = (teamCount: number) => (teamCount >= 8 ? 2 : 3);

export function finalsPlan(teamCount: number): FinalsPlan {
  const pos = (p: number): Slot => ({ kind: "pos", pos: p }), win = (g: number): Slot => ({ kind: "winner", game: g }), lose = (g: number): Slot => ({ kind: "loser", game: g });
  const g = (game: number, week: number, name: string, home: Slot, away: Slot, grandFinal = false): FinalsGame => ({ game, week, name, home, away, grandFinal });
  if (teamCount >= 10) return {
    weeks: 4, qualifiers: 5, byes: [{ week: 1, pos: 1 }],
    games: [g(1, 1, "Week 1 Game 1", pos(2), pos(3)), g(2, 1, "Week 1 Game 2", pos(4), pos(5)), g(3, 2, "Week 2 Game 3", pos(1), win(1)), g(4, 2, "Week 2 Game 4", lose(1), win(2)),
      g(5, 3, "Week 3 Game 5", lose(3), win(4)), g(6, 4, "Grand Final", win(3), win(5), true)],
  };
  return {
    weeks: 3, qualifiers: Math.min(4, Math.max(2, teamCount)), byes: [],
    games: [g(1, 1, "Week 1 Game 1", pos(1), pos(2)), g(2, 1, "Week 1 Game 2", pos(3), pos(4)), g(3, 2, "Week 2 Game 3", lose(1), win(2)), g(4, 3, "Grand Final", win(1), win(3), true)],
  };
}

export function slotText(s: Slot): string {
  return s.kind === "pos" ? `Position ${s.pos}` : s.kind === "winner" ? `Winner of game ${s.game}` : s.kind === "loser" ? `Loser of game ${s.game}` : `Through from game ${s.game}`;
}

/** The date of each finals week: the last is the grand final date, the others the weeks before it. */
export const finalsWeekDate = (plan: FinalsPlan, grandFinalDate: string, week: number) => addDays(grandFinalDate, -7 * (plan.weeks - week));

/** Who fills a slot, once the ladder and earlier results are known (null while it can't be told yet). */
export function resolveSlot(s: Slot, ladder: string[], results: Record<number, { winner: string; loser: string } | undefined>): string | null {
  if (s.kind === "pos") return ladder[s.pos - 1] ?? null;
  const r = results[s.game];
  if (!r) return null;
  return s.kind === "loser" ? r.loser : r.winner;
}

export interface PlacedFinal { divisionId: string; game: FinalsGame; date: string; start: string; end: string; pitchId: string; venueId: string; venueName: string }
/**
 * Puts every division's finals on the pitches given: each date's games fill the time slots in order, across the pitches,
 * so the games of one week of one division kick off together.
 */
export function placeFinals(
  divisions: { id: string; teamCount: number; grandFinalDate: string; startTime: string; endTime: string }[],
  o: { pitches: DrawPitch[]; matchMinutes: number; gapMinutes: number; offset?: string },
): { placed: PlacedFinal[]; unplaced: { divisionId: string; game: number; date: string }[] } {
  const off = o.offset ?? "+10:00";
  const byDate = new Map<string, { divisionId: string; game: FinalsGame; startTime: string; endTime: string }[]>();
  for (const d of divisions) {
    const plan = finalsPlan(d.teamCount);
    for (const game of plan.games) {
      const date = finalsWeekDate(plan, d.grandFinalDate, game.week);
      (byDate.get(date) ?? byDate.set(date, []).get(date)!).push({ divisionId: d.id, game, startTime: d.startTime, endTime: d.endTime });
    }
  }
  const placed: PlacedFinal[] = [], unplaced: { divisionId: string; game: number; date: string }[] = [];
  for (const [date, items] of [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    items.sort((a, b) => a.divisionId.localeCompare(b.divisionId) || a.game.game - b.game.game);
    const used = new Set<string>();
    for (const it of items) {
      const times = slotGrid(it.startTime, it.endTime, o.matchMinutes, o.gapMinutes);
      let done = false;
      for (const t of times) {
        const p = o.pitches.find((pp) => !used.has(`${pp.pitchId}|${t}`));
        if (!p) continue;
        used.add(`${p.pitchId}|${t}`);
        const start = new Date(`${date}T${t}:00${off}`).getTime();
        placed.push({ divisionId: it.divisionId, game: it.game, date, start: new Date(start).toISOString(), end: new Date(start + o.matchMinutes * 60_000).toISOString(), pitchId: p.pitchId, venueId: p.venueId, venueName: p.venueName });
        done = true; break;
      }
      if (!done) unplaced.push({ divisionId: it.divisionId, game: it.game.game, date });
    }
  }
  return { placed, unplaced };
}
