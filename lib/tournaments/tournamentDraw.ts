// D3 — Pool assignment (snake), single-elim first round, cross-pool finals, multi-division layouts.

import type { Db } from "mongodb";
import type {
  DrawPlayoffTemplate,
  TournamentDrawState,
} from "@/lib/db/schemas/repTournamentDraw.schema";
import {
  DrawGenerateBodySchema,
  TournamentDrawStateSchema,
  type TournamentDrawKnockoutMatchSchema,
} from "@/lib/db/schemas/repTournamentDraw.schema";
import type { z } from "zod";
import { getSeasonCompetitionStandingsReadBundle } from "@/lib/competitions/standingsBundle";
import type { LadderRules } from "@/lib/competitions/standings";

export const DEFAULT_TOURNAMENT_DRAW_STATE: TournamentDrawState = {
  structure: "legacy_flat",
  format: "none",
};

export type KnockoutMatchDraft = z.infer<typeof TournamentDrawKnockoutMatchSchema>;
export type DrawGenerateInput = z.infer<typeof DrawGenerateBodySchema>;

export function slugDivisionId(divisionId: string): string {
  const s = divisionId.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return s.slice(0, 48) || "div";
}

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

/**
 * Representative-style ordering: best seed first; unseeded bucket after seeded;
 * within the same numeric seed, alphabetical by `teamNameByEntryId` then entry id.
 */
export function orderEntryIdsForRepSeeding(
  entryIds: string[],
  seeds: Record<string, number> | undefined,
  teamNameByEntryId?: Record<string, string>,
): string[] {
  const UNSEEDED = 50_000;
  return [...new Set(entryIds)].sort((a, b) => {
    const ha = Object.prototype.hasOwnProperty.call(seeds ?? {}, a);
    const hb = Object.prototype.hasOwnProperty.call(seeds ?? {}, b);
    const sa = ha ? seeds![a]! : UNSEEDED;
    const sb = hb ? seeds![b]! : UNSEEDED;
    if (sa !== sb) return sa - sb;
    const na = (teamNameByEntryId?.[a] ?? "").toLowerCase();
    const nb = (teamNameByEntryId?.[b] ?? "").toLowerCase();
    if (na !== nb) return na.localeCompare(nb);
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
 * `poolCount === 1` puts everyone in a single pool.
 */
export function distributeSnakePools(
  entryIdsOrdered: string[],
  poolCount: number,
): string[][] {
  if (poolCount < 1) throw new Error("poolCount must be at least 1");
  if (poolCount === 1) return [[...entryIdsOrdered]];
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

function buildCrossPoolWinnerRoundWithDivision(
  poolIds: string[],
  divisionSlug: string,
): KnockoutMatchDraft[] {
  return buildCrossPoolWinnerRound(poolIds).map((m) => ({
    ...m,
    matchId: `d-${divisionSlug}-${m.matchId}`,
  }));
}

/**
 * Pair pools (0–1), (2–3), … For each pair, emit `maxPlace` matches: same place vs same place.
 */
export function buildSamePlaceParallelMatches(
  poolIds: string[],
  maxPlace: number,
  divisionSlug: string,
): KnockoutMatchDraft[] {
  if (poolIds.length % 2 !== 0) {
    throw new Error("same_place_parallel requires an even number of pools");
  }
  const out: KnockoutMatchDraft[] = [];
  let order = 0;
  for (let pair = 0; pair + 1 < poolIds.length; pair += 2) {
    const a = poolIds[pair]!;
    const b = poolIds[pair + 1]!;
    for (let p = 1; p <= maxPlace; p++) {
      out.push({
        matchId: `d-${divisionSlug}-sp-${pair}-${p}`,
        roundIndex: 0,
        roundLabel: `Cross pool (place ${p})`,
        order: order++,
        homeEntryId: null,
        awayEntryId: null,
        homeSource: { poolId: a, place: p },
        awaySource: { poolId: b, place: p },
      });
    }
  }
  return out;
}

/**
 * Four pools, top two from each → four quarter-finals:
 * A1 v B2, B1 v A2, C1 v D2, D1 v C2 (pools ordered A,B,C,D).
 */
export function buildQFFourPoolsTopTwoInterleaved(
  poolIds: string[],
  divisionSlug: string,
): KnockoutMatchDraft[] {
  if (poolIds.length !== 4) {
    throw new Error("qf_top_two_four_pools requires exactly four pools");
  }
  const [A, B, C, D] = poolIds;
  return [
    {
      matchId: `d-${divisionSlug}-qf-0`,
      roundIndex: 0,
      roundLabel: "Quarter final",
      order: 0,
      homeEntryId: null,
      awayEntryId: null,
      homeSource: { poolId: A!, place: 1 },
      awaySource: { poolId: B!, place: 2 },
    },
    {
      matchId: `d-${divisionSlug}-qf-1`,
      roundIndex: 0,
      roundLabel: "Quarter final",
      order: 1,
      homeEntryId: null,
      awayEntryId: null,
      homeSource: { poolId: B!, place: 1 },
      awaySource: { poolId: A!, place: 2 },
    },
    {
      matchId: `d-${divisionSlug}-qf-2`,
      roundIndex: 0,
      roundLabel: "Quarter final",
      order: 2,
      homeEntryId: null,
      awayEntryId: null,
      homeSource: { poolId: C!, place: 1 },
      awaySource: { poolId: D!, place: 2 },
    },
    {
      matchId: `d-${divisionSlug}-qf-3`,
      roundIndex: 0,
      roundLabel: "Quarter final",
      order: 3,
      homeEntryId: null,
      awayEntryId: null,
      homeSource: { poolId: D!, place: 1 },
      awaySource: { poolId: C!, place: 2 },
    },
  ];
}

/** Two pools, places 1–2 each → semis A1 v B2 and B1 v A2. */
export function buildSemisTwoPoolsTopTwo(
  poolIds: string[],
  divisionSlug: string,
): KnockoutMatchDraft[] {
  if (poolIds.length !== 2) {
    throw new Error("semis_top_two_two_pools requires exactly two pools");
  }
  const [A, B] = poolIds;
  return [
    {
      matchId: `d-${divisionSlug}-sf-0`,
      roundIndex: 0,
      roundLabel: "Semi final",
      order: 0,
      homeEntryId: null,
      awayEntryId: null,
      homeSource: { poolId: A!, place: 1 },
      awaySource: { poolId: B!, place: 2 },
    },
    {
      matchId: `d-${divisionSlug}-sf-1`,
      roundIndex: 0,
      roundLabel: "Semi final",
      order: 1,
      homeEntryId: null,
      awayEntryId: null,
      homeSource: { poolId: B!, place: 1 },
      awaySource: { poolId: A!, place: 2 },
    },
  ];
}

function poolIdAndLabel(index: number): { poolId: string; label: string } {
  if (index < 26) {
    const letter = String.fromCharCode(65 + index);
    return { poolId: `pool-${letter.toLowerCase()}`, label: `Pool ${letter}` };
  }
  return { poolId: `pool-${index}`, label: `Pool ${index + 1}` };
}

function poolIdAndLabelForDivision(
  divisionSlug: string,
  index: number,
): { poolId: string; label: string } {
  const { poolId, label } = poolIdAndLabel(index);
  return { poolId: `d-${divisionSlug}-${poolId}`, label };
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

/** Entry IDs referenced by pools, knockout direct slots, seed map keys, and divisions. */
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
  for (const d of draw.divisions ?? []) {
    for (const id of d.entryIds) ids.add(id);
    for (const p of d.pools ?? []) {
      for (const id of p.entryIds) ids.add(id);
    }
    for (const m of d.knockoutMatches ?? []) {
      if (m.homeEntryId) ids.add(m.homeEntryId);
      if (m.awayEntryId) ids.add(m.awayEntryId);
    }
  }
  return [...ids];
}

export function assertDivisionsEntryDisjoint(
  draw: TournamentDrawState,
): { ok: true } | { ok: false; message: string } {
  if (draw.structure !== "multi_division" || !draw.divisions?.length) return { ok: true };
  const seen = new Set<string>();
  for (const d of draw.divisions) {
    for (const id of d.entryIds) {
      if (seen.has(id)) {
        return {
          ok: false,
          message: `Entry "${id}" appears in more than one division.`,
        };
      }
      seen.add(id);
    }
  }
  return { ok: true };
}

export async function validateDrawStateReferences(
  db: Db,
  tournamentId: string,
  draw: TournamentDrawState,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const disjoint = assertDivisionsEntryDisjoint(draw);
  if (!disjoint.ok) return disjoint;
  return assertEntryIdsBelongToTournament(
    db,
    tournamentId,
    collectEntryIdsReferencedInDraw(draw),
  );
}

export function applyDivisionRankedSnakePools(
  draw: TournamentDrawState,
  specs: { divisionId: string; poolCount: number }[],
  opts: { randomizeOrder: boolean; teamNameByEntryId?: Record<string, string> },
): TournamentDrawState {
  const nameMap = opts.teamNameByEntryId ?? {};
  const seeds = draw.seeds;
  const divList = draw.divisions ?? [];
  if (!divList.length) {
    throw new Error("draw.divisions must be set for division_ranked_snake_pools");
  }

  const byId = new Map(divList.map((d) => [d.divisionId, { ...d }]));
  for (const spec of specs) {
    const div = byId.get(spec.divisionId);
    if (!div) {
      throw new Error(`Unknown division: ${spec.divisionId}`);
    }
    const ordered = opts.randomizeOrder
      ? shuffleInPlace([...new Set(div.entryIds)])
      : orderEntryIdsForRepSeeding(div.entryIds, seeds, nameMap);
    const rows = distributeSnakePools(ordered, spec.poolCount);
    const slug = slugDivisionId(spec.divisionId);
    div.pools = rows.map((ids, i) => {
      const { poolId, label } = poolIdAndLabelForDivision(slug, i);
      return { poolId, label, entryIds: ids };
    });
    div.poolPhase =
      spec.poolCount === 1 ? "single_pool_round_robin" : "multi_pool_round_robin";
    byId.set(spec.divisionId, div);
  }

  const divisions = divList.map((d) => byId.get(d.divisionId) ?? d);
  return TournamentDrawStateSchema.parse({
    ...draw,
    structure: "multi_division",
    format: "multi_division",
    divisions,
  });
}

export function applyDivisionPlayoffSkeleton(
  draw: TournamentDrawState,
  divisionId: string,
  template: DrawPlayoffTemplate,
): TournamentDrawState {
  const divList = draw.divisions ?? [];
  const div = divList.find((d) => d.divisionId === divisionId);
  if (!div) {
    throw new Error(`Unknown division: ${divisionId}`);
  }
  const poolIds = (div.pools ?? []).map((p) => p.poolId);
  const slug = slugDivisionId(divisionId);
  let matches: KnockoutMatchDraft[] = [];

  switch (template.type) {
    case "none":
      matches = [];
      break;
    case "same_place_parallel":
      matches = buildSamePlaceParallelMatches(poolIds, template.maxPlace, slug);
      break;
    case "qf_top_two_four_pools":
      matches = buildQFFourPoolsTopTwoInterleaved(poolIds, slug);
      break;
    case "semis_top_two_two_pools":
      matches = buildSemisTwoPoolsTopTwo(poolIds, slug);
      break;
    case "pool_winners_cross_pairs":
      matches = buildCrossPoolWinnerRoundWithDivision(poolIds, slug);
      break;
    default:
      break;
  }

  const tagged = matches.map((m) => ({ ...m, divisionId }));
  const divisions = divList.map((d) =>
    d.divisionId === divisionId ? { ...d, knockoutMatches: tagged } : d,
  );

  return TournamentDrawStateSchema.parse({
    ...draw,
    structure: "multi_division",
    format: "multi_division",
    divisions,
  });
}

/**
 * Build a full draw from generator options. Replaces top-level `pools` / `knockoutMatches` for the selected kind;
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
      structure: "legacy_flat",
      format: "round_robin_pools",
      seeds,
      notes,
      pools,
    });
  }

  if (body.kind === "single_elimination") {
    const knockoutMatches = buildSingleEliminationFirstRound(ordered);
    return TournamentDrawStateSchema.parse({
      structure: "legacy_flat",
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
    structure: "legacy_flat",
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

export async function loadTeamNameByEntryId(
  db: Db,
  tournamentId: string,
): Promise<Record<string, string>> {
  const rows = await db
    .collection("team_tournament_entries")
    .find({
      tournamentId,
      status: { $nin: ["withdrawn"] },
    })
    .project({ entryId: 1, teamName: 1 })
    .toArray();
  const out: Record<string, string> = {};
  for (const r of rows) {
    const id = String(r.entryId ?? "");
    if (!id) continue;
    out[id] = String(r.teamName ?? "");
  }
  return out;
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
