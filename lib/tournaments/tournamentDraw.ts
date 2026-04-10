// D3 — Pool assignment (snake), single-elim first round, cross-pool winner slots.

import type { Db } from "mongodb";
import type { TournamentDrawState } from "@/lib/db/schemas/repTournamentDraw.schema";
import {
  DrawGenerateBodySchema,
  TournamentDrawStateSchema,
  type TournamentDrawKnockoutMatchSchema,
} from "@/lib/db/schemas/repTournamentDraw.schema";
import type { z } from "zod";
import { getSeasonCompetitionStandingsReadBundle } from "@/lib/competitions/standingsBundle";
import type { LadderRules } from "@/lib/competitions/standings";

export const DEFAULT_TOURNAMENT_DRAW_STATE: TournamentDrawState = {
  format: "none",
};

export type KnockoutMatchDraft = z.infer<typeof TournamentDrawKnockoutMatchSchema>;
export type DrawGenerateInput = z.infer<typeof DrawGenerateBodySchema>;

export function nextPowerOf2(n: number): number {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/** Sort entry IDs: lower seed = stronger. Missing seed sorts last. */
export function orderEntryIdsBySeeds(
  entryIds: string[],
  seeds: Record<string, number> | undefined,
): string[] {
  return [...new Set(entryIds)].sort((a, b) => {
    const sa = seeds?.[a] ?? 9999;
    const sb = seeds?.[b] ?? 9999;
    if (sa !== sb) return sa - sb;
    return a.localeCompare(b);
  });
}

/** Fisher–Yates shuffle (copy). */
export function shuffleInPlace<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Snake draft across `poolCount` pools (0 → k-1 → 0 → …).
 */
export function distributeSnakePools(
  entryIdsOrdered: string[],
  poolCount: number,
): string[][] {
  if (poolCount < 2) throw new Error("poolCount must be at least 2");
  const pools: string[][] = Array.from({ length: poolCount }, () => []);
  let idx = 0;
  let dir = 1;
  for (const id of entryIdsOrdered) {
    pools[idx]!.push(id);
    if (dir === 1 && idx === poolCount - 1) dir = -1;
    else if (dir === -1 && idx === 0) dir = 1;
    else idx += dir;
  }
  return pools;
}

/**
 * First round of single elimination: best vs worst among padded bracket size (power of 2).
 * `orderedEntryIds` best-first (seed 1 first).
 */
export function buildSingleEliminationFirstRound(
  orderedEntryIds: string[],
): KnockoutMatchDraft[] {
  const teams = orderedEntryIds.filter(Boolean);
  if (teams.length < 2) return [];

  const n = nextPowerOf2(teams.length);
  const padded: (string | null)[] = [...teams];
  while (padded.length < n) padded.push(null);

  const out: KnockoutMatchDraft[] = [];
  for (let i = 0; i < n / 2; i++) {
    const ia = i;
    const ib = n - 1 - i;
    out.push({
      matchId: `tko-r0-${i}`,
      roundIndex: 0,
      roundLabel: "Round 1",
      order: i,
      homeEntryId: padded[ia] ?? null,
      awayEntryId: padded[ib] ?? null,
    });
  }
  return out;
}

/**
 * Cross-pool round: winner (place 1) of each pair of pools.
 * Odd pool count leaves the last pool without a match in this round.
 */
export function buildCrossPoolWinnerRound(
  poolIds: string[],
): KnockoutMatchDraft[] {
  const out: KnockoutMatchDraft[] = [];
  for (let i = 0; i + 1 < poolIds.length; i += 2) {
    const a = poolIds[i]!;
    const b = poolIds[i + 1]!;
    out.push({
      matchId: `tko-x-${a}-${b}`,
      roundIndex: 0,
      roundLabel: "Cross-pool (1st place)",
      order: out.length,
      homeEntryId: null,
      awayEntryId: null,
      homeSource: { poolId: a, place: 1 },
      awaySource: { poolId: b, place: 1 },
    });
  }
  return out;
}

export function mergeDrawState(
  existing: unknown,
  patch: Partial<TournamentDrawState>,
): TournamentDrawState {
  const base =
    typeof existing === "object" && existing !== null
      ? (existing as Record<string, unknown>)
      : {};
  const merged = {
    ...DEFAULT_TOURNAMENT_DRAW_STATE,
    ...base,
    ...patch,
  };
  return TournamentDrawStateSchema.parse(merged);
}

function poolIdAndLabel(index: number): { poolId: string; label: string } {
  if (index < 26) {
    const letter = String.fromCharCode(65 + index);
    return { poolId: `pool-${letter.toLowerCase()}`, label: `Pool ${letter}` };
  }
  return { poolId: `pool-${index}`, label: `Pool ${index + 1}` };
}

/** Entry IDs referenced by pools, knockout direct slots, and seed map keys. */
export function collectEntryIdsReferencedInDraw(draw: TournamentDrawState): string[] {
  const ids = new Set<string>();
  if (draw.seeds) {
    for (const k of Object.keys(draw.seeds)) ids.add(k);
  }
  for (const p of draw.pools ?? []) {
    for (const id of p.entryIds) ids.add(id);
  }
  for (const m of draw.knockoutMatches ?? []) {
    if (m.homeEntryId) ids.add(m.homeEntryId);
    if (m.awayEntryId) ids.add(m.awayEntryId);
  }
  return [...ids];
}

export async function validateDrawStateReferences(
  db: Db,
  tournamentId: string,
  draw: TournamentDrawState,
): Promise<{ ok: true } | { ok: false; message: string }> {
  return assertEntryIdsBelongToTournament(
    db,
    tournamentId,
    collectEntryIdsReferencedInDraw(draw),
  );
}

/**
 * Build a full draw from generator options. Replaces `pools` / `knockoutMatches` for the selected kind;
 * preserves `seeds` and `notes` from `preserve` unless you pass overrides in `patch`.
 */
export function generateTournamentDrawState(
  body: DrawGenerateInput,
  entryIds: string[],
  preserve: Pick<TournamentDrawState, "seeds" | "notes">,
  patch?: Partial<TournamentDrawState>,
): TournamentDrawState {
  const seeds = patch?.seeds ?? preserve.seeds;
  const notes = patch?.notes ?? preserve.notes;

  let ordered: string[];
  if (body.randomizeOrder) {
    ordered = shuffleInPlace([...new Set(entryIds)]);
  } else {
    ordered = orderEntryIdsBySeeds([...new Set(entryIds)], seeds);
  }

  if (body.kind === "snake_pools") {
    const poolCount = body.poolCount!;
    const rows = distributeSnakePools(ordered, poolCount);
    const pools = rows.map((ids, i) => {
      const { poolId, label } = poolIdAndLabel(i);
      return { poolId, label, entryIds: ids };
    });
    return TournamentDrawStateSchema.parse({
      format: "round_robin_pools",
      seeds,
      notes,
      pools,
    });
  }

  if (body.kind === "single_elimination") {
    const knockoutMatches = buildSingleEliminationFirstRound(ordered);
    return TournamentDrawStateSchema.parse({
      format: "single_elimination",
      seeds,
      notes,
      knockoutMatches,
    });
  }

  // pools_then_knockout
  const poolCount = body.poolCount!;
  const rows = distributeSnakePools(ordered, poolCount);
  const pools = rows.map((ids, i) => {
    const { poolId, label } = poolIdAndLabel(i);
    return { poolId, label, entryIds: ids };
  });
  const knockoutMatches = buildCrossPoolWinnerRound(pools.map((p) => p.poolId));
  return TournamentDrawStateSchema.parse({
    format: "pools_then_knockout",
    seeds,
    notes,
    pools,
    knockoutMatches,
  });
}

export async function loadEntryIdsForTournament(
  db: Db,
  tournamentId: string,
): Promise<string[]> {
  const rows = await db
    .collection("team_tournament_entries")
    .find({
      tournamentId,
      status: { $nin: ["withdrawn"] },
    })
    .project({ entryId: 1 })
    .toArray();
  return rows.map((r) => String(r.entryId)).filter(Boolean);
}

export async function assertEntryIdsBelongToTournament(
  db: Db,
  tournamentId: string,
  entryIds: string[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  const unique = [...new Set(entryIds)].filter(Boolean);
  if (unique.length === 0) return { ok: true };
  const n = await db.collection("team_tournament_entries").countDocuments({
    tournamentId,
    entryId: { $in: unique },
  });
  if (n !== unique.length) {
    return {
      ok: false,
      message: "One or more entry IDs are not part of this tournament.",
    };
  }
  return { ok: true };
}

export async function importSeedsFromLeagueStandings(
  db: Db,
  tournamentId: string,
  seasonCompetitionId: string,
  publishedOnly: boolean,
): Promise<Record<string, number>> {
  const sc = await db.collection("season_competitions").findOne({ seasonCompetitionId });
  if (!sc) {
    throw new Error("Season competition not found");
  }

  const entries = await db
    .collection("team_tournament_entries")
    .find({
      tournamentId,
      status: { $nin: ["withdrawn"] },
    })
    .project({ entryId: 1, teamId: 1 })
    .toArray();

  const bundle = await getSeasonCompetitionStandingsReadBundle({
    seasonCompetitionId,
    owningAssociationId: String(sc.owningAssociationId ?? ""),
    ladderRules: (sc.ladderRules ?? null) as LadderRules | null,
    requiresResultApproval: Boolean(sc.resultApprovalRequired),
    publishedOnly,
    includeRollups: false,
  });

  const posByTeam = new Map<string, number>();
  for (const row of bundle.standings) {
    posByTeam.set(row.teamId, row.pos);
  }

  const seeds: Record<string, number> = {};
  let fallback = 9000;
  for (const e of entries) {
    const entryId = String(e.entryId ?? "");
    const teamId = String(e.teamId ?? "");
    if (!entryId) continue;
    const pos = posByTeam.get(teamId);
    seeds[entryId] = pos != null ? pos : fallback++;
  }
  return seeds;
}
