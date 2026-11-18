// lib/draw/align.ts
// Lines up the divisions of a competition so a club's teams meet the same opposing club in the same round
// (for example Commercial v East in BHL1, BHL2 and BHL3). Each division is an ordinary round robin; what can change is
// which team sits where in it and the order of its rounds, and both can be chosen freely without breaking the round
// robin. We search for the choice that puts the most club-against-club meetings in the same round. Pure and repeatable.

import { generateRoundRobin } from "@/lib/competitions/roundRobin";
import type { DrawTeam } from "@/lib/draw/generate";

export interface DivisionInput {
  id: string; name?: string; teams: DrawTeam[]; doubleRound?: boolean;
  /** How many times each pair meets (1 to 4). Overrides doubleRound. */
  legs?: number;
}
export interface AlignedFixture { divisionId: string; /** 0-based round across all divisions */ g: number; homeTeamId: string; awayTeamId: string }

/** The same pair of clubs, whichever team is home; null for a club playing itself or an unknown club. */
export function clubPairKey(a?: string | null, b?: string | null): string | null {
  if (!a || !b || a === b) return null;
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function rng(seed: number) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

type Rounds = [number, number][][]; // per round: pairs of team slots

function slotRounds(n: number, legs: number): Rounds {
  const ids = Array.from({ length: n }, (_, i) => String(i));
  const single: Rounds = [];
  for (const f of generateRoundRobin(ids)) (single[f.round - 1] ??= []).push([Number(f.homeTeamId), Number(f.awayTeamId)]);
  const base = single.map((r) => r ?? []);
  const out: Rounds = [];
  // Every extra meeting repeats the whole round robin with home and away swapped each time.
  for (let leg = 0; leg < legs; leg++) for (const r of base) out.push(r.map(([a, b]) => (leg % 2 ? [b, a] : [a, b]) as [number, number]));
  return out;
}

const legsOf = (d: DivisionInput) => Math.min(4, Math.max(1, Math.round(d.legs ?? (d.doubleRound ? 2 : 1))));

/** Optimal assignment (Hungarian) of rows to distinct columns, minimising cost. */
function hungarian(cost: number[][]): number[] {
  const n = cost.length, m = cost[0]?.length ?? 0;
  const INF = 1e15, u = Array(n + 1).fill(0), v = Array(m + 1).fill(0), p = Array(m + 1).fill(0), way = Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i; let j0 = 0;
    const minv = Array(m + 1).fill(INF), used = Array(m + 1).fill(false);
    do {
      used[j0] = true; const i0 = p[j0]; let delta = INF, j1 = 0;
      for (let j = 1; j <= m; j++) if (!used[j]) {
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= m; j++) { if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta; }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const out = Array(n).fill(-1);
  for (let j = 1; j <= m; j++) if (p[j]) out[p[j] - 1] = j - 1;
  return out;
}

/** Best round for each of a division's rounds, given what earlier divisions put in each round. */
function assign(rounds: Rounds, perm: DrawTeam[], taken: Map<string, number>[], total: number): { gOf: number[]; score: number } {
  const R = rounds.length, G = total;
  const scores: number[][] = rounds.map((r) => Array.from({ length: G }, (_, g) => r.reduce((s, [a, b]) => { const k = clubPairKey(perm[a].clubId, perm[b].clubId); return s + (k && (taken[g]?.get(k) ?? 0) > 0 ? 1 : 0); }, 0)));
  // Most overlap wins; among equals prefer earlier weeks so a division starts with the season and stays compact.
  const cost = scores.map((row) => row.map((sc, g) => -sc * 1000 + g));
  const gOf = hungarian(cost);
  return { gOf, score: gOf.reduce((s, g, r) => s + scores[r][g], 0) };
}

export function alignDivisions(divisions: DivisionInput[], seed = 7): { fixtures: AlignedFixture[]; aligned: number; total: number } {
  const usable = divisions.filter((d) => d.teams.length >= 2);
  const shapes = usable.map((d) => ({ d, rounds: slotRounds(d.teams.length, legsOf(d)) }));
  const G = Math.max(0, ...shapes.map((s) => s.rounds.length));
  const order = [...shapes].sort((a, b) => b.rounds.length - a.rounds.length || b.d.teams.length - a.d.teams.length);
  const taken: Map<string, number>[] = Array.from({ length: G }, () => new Map());
  const out: AlignedFixture[] = [];
  const rand = rng(seed);

  order.forEach((s, idx) => {
    const { d, rounds } = s, n = d.teams.length;
    let bestPerm = d.teams.slice(), best = idx === 0 ? { gOf: rounds.map((_, i) => i), score: 0 } : assign(rounds, bestPerm, taken, G);
    if (idx > 0) {
      const tries = n > 20 ? 2 : n > 12 ? 8 : 60;
      for (let t = 0; t < tries; t++) {
        const perm = d.teams.slice();
        if (t > 0) for (let i = n - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
        let cur = assign(rounds, perm, taken, G), improved = true, passes = 0;
        while (improved && passes++ < 8) {
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
