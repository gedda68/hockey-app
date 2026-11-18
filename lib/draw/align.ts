// lib/draw/align.ts
// Lines up the divisions of a competition so a club's teams meet the same opposing club in the same round
// (for example Commercial v East in BHL1, BHL2 and BHL3). Each division is an ordinary round robin; what can change is
// which team sits where in it and the order of its rounds, and both can be chosen freely without breaking the round
// robin. We search for the choice that puts the most club-against-club meetings in the same round. Pure and repeatable.

import { generateRoundRobin } from "@/lib/competitions/roundRobin";
import type { DrawTeam } from "@/lib/draw/generate";

export interface DivisionInput { id: string; name?: string; teams: DrawTeam[]; doubleRound?: boolean }
export interface AlignedFixture { divisionId: string; /** 0-based round across all divisions */ g: number; homeTeamId: string; awayTeamId: string }

/** The same pair of clubs, whichever team is home; null for a club playing itself or an unknown club. */
export function clubPairKey(a?: string | null, b?: string | null): string | null {
  if (!a || !b || a === b) return null;
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function rng(seed: number) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

type Rounds = [number, number][][]; // per round: pairs of team slots

function slotRounds(n: number, doubleRound: boolean): Rounds {
  const ids = Array.from({ length: n }, (_, i) => String(i));
  const out: Rounds = [];
  for (const f of generateRoundRobin(ids, { doubleRound })) (out[f.round - 1] ??= []).push([Number(f.homeTeamId), Number(f.awayTeamId)]);
  return out.map((r) => r ?? []);
}

/** Best round for each of a division's rounds, given what earlier divisions put in each round. */
function assign(rounds: Rounds, perm: DrawTeam[], taken: Map<string, number>[], total: number): { gOf: number[]; score: number } {
  const R = rounds.length, G = total;
  const scores: number[][] = rounds.map((r) => Array.from({ length: G }, (_, g) => r.reduce((s, [a, b]) => { const k = clubPairKey(perm[a].clubId, perm[b].clubId); return s + (k && (taken[g]?.get(k) ?? 0) > 0 ? 1 : 0); }, 0)));
  const cells: { r: number; g: number; s: number }[] = [];
  for (let r = 0; r < R; r++) for (let g = 0; g < G; g++) cells.push({ r, g, s: scores[r][g] });
  // Highest overlap first; ties keep rounds in their natural order so a division stays compact.
  cells.sort((x, y) => y.s - x.s || x.g - y.g || x.r - y.r);
  const gOf = Array<number>(R).fill(-1), used = new Set<number>();
  let score = 0;
  for (const c of cells) if (gOf[c.r] < 0 && !used.has(c.g)) { gOf[c.r] = c.g; used.add(c.g); score += c.s; }
  return { gOf, score };
}

export function alignDivisions(divisions: DivisionInput[], seed = 7): { fixtures: AlignedFixture[]; aligned: number; total: number } {
  const usable = divisions.filter((d) => d.teams.length >= 2);
  const shapes = usable.map((d) => ({ d, rounds: slotRounds(d.teams.length, !!d.doubleRound) }));
  const G = Math.max(0, ...shapes.map((s) => s.rounds.length));
  const order = [...shapes].sort((a, b) => b.rounds.length - a.rounds.length || b.d.teams.length - a.d.teams.length);
  const taken: Map<string, number>[] = Array.from({ length: G }, () => new Map());
  const out: AlignedFixture[] = [];
  const rand = rng(seed);

  order.forEach((s, idx) => {
    const { d, rounds } = s, n = d.teams.length;
    let bestPerm = d.teams.slice(), best = idx === 0 ? { gOf: rounds.map((_, i) => i), score: 0 } : assign(rounds, bestPerm, taken, G);
    if (idx > 0) {
      const tries = n > 20 ? 1 : 6;
      for (let t = 0; t < tries; t++) {
        const perm = d.teams.slice();
        if (t > 0) for (let i = n - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
        let cur = assign(rounds, perm, taken, G), improved = true, passes = 0;
        while (improved && passes++ < 12) {
          improved = false;
          for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
            [perm[i], perm[j]] = [perm[j], perm[i]];
            const next = assign(rounds, perm, taken, G);
            if (next.score > cur.score) { cur = next; improved = true; } else [perm[i], perm[j]] = [perm[j], perm[i]];
          }
        }
        if (cur.score > best.score) { best = cur; bestPerm = perm.slice(); }
      }
    }
    rounds.forEach((pairs, r) => {
      const g = best.gOf[r];
      for (const [a, b] of pairs) {
        const home = bestPerm[a], away = bestPerm[b], k = clubPairKey(home.clubId, away.clubId);
        if (k) taken[g].set(k, (taken[g].get(k) ?? 0) + 1);
        out.push({ divisionId: d.id, g, homeTeamId: home.teamId, awayTeamId: away.teamId });
      }
    });
  });

  let aligned = 0;
  const clubOf = new Map(usable.flatMap((d) => d.teams.map((t) => [t.teamId, t.clubId ?? null] as const)));
  const seen = new Map<string, number>();
  for (const f of out) { const k = clubPairKey(clubOf.get(f.homeTeamId), clubOf.get(f.awayTeamId)); if (k) seen.set(`${f.g}#${k}`, (seen.get(`${f.g}#${k}`) ?? 0) + 1); }
  for (const c of seen.values()) if (c > 1) aligned += c;
  return { fixtures: out, aligned, total: out.length };
}
