// D3 — Tournament draw: pools, knockout, cross-pool finals; manual seeds + standings import.
// Multi-division: each division has its own pool count (1+), entry list, and playoff skeleton options.

import { z } from "zod";

export const TournamentDrawStructureSchema = z.enum([
  /** Top-level `pools` / `knockoutMatches` (original single-table draw). */
  "legacy_flat",
  /** `divisions[]` owns pool layout and knockouts per division. */
  "multi_division",
]);

export const TournamentDrawFormatSchema = z.enum([
  "none",
  /** Round-robin within pools (pairings via `lib/competitions/roundRobin.ts` in a follow-up). */
  "round_robin_pools",
  "single_elimination",
  /** Pools then one crossover round pairing pool winners (place 1). */
  "pools_then_knockout",
  /** At least one division in `divisions` (see `structure`). */
  "multi_division",
]);

export const TournamentDrawPoolSourceSchema = z.object({
  poolId: z.string().min(1),
  /** 1 = first place in pool standings (convention). */
  place: z.number().int().min(1).max(32),
});

export const TournamentDrawKnockoutMatchSchema = z.object({
  matchId: z.string().min(1),
  roundIndex: z.number().int().min(0),
  roundLabel: z.string().max(80).optional(),
  order: z.number().int().min(0),
  homeEntryId: z.string().min(1).nullable().optional(),
  awayEntryId: z.string().min(1).nullable().optional(),
  homeSource: TournamentDrawPoolSourceSchema.optional(),
  awaySource: TournamentDrawPoolSourceSchema.optional(),
  /** When set, match belongs to this division (multi_division draws). */
  divisionId: z.string().max(64).optional(),
  /** e.g. `tier-1-qf`, `losers-5-8` for parallel brackets. */
  bracketTag: z.string().max(40).optional(),
});

export const TournamentDrawPoolSchema = z.object({
  poolId: z.string().min(1),
  label: z.string().min(1).max(40),
  entryIds: z.array(z.string().min(1)).max(64),
});

/** How pool play is intended to run for this division. */
export const TournamentDrawDivisionPoolPhaseSchema = z.enum([
  /** One pool — full round-robin across the division. */
  "single_pool_round_robin",
  /** Two or more pools — round-robin within each pool, then configured cross-overs. */
  "multi_pool_round_robin",
]);

/**
 * Declarative “what happens after pool play” (UI + future fixture engines).
 * Knockout *skeleton* rows are generated separately via `division_playoff_skeleton`.
 */
export const TournamentDrawAfterPoolsSchema = z.enum([
  "undecided",
  "pool_play_only",
  /** One pool: optional semis + placing games (fixtures not auto-built yet). */
  "single_pool_semis_and_placings",
  "single_pool_placings_only",
  /** e.g. 1v1, 2v2 across paired pools (same finishing place). */
  "cross_pool_same_position",
  /** Top two from each of four pools → four QF matches (see generator pairing). */
  "cross_pool_quarters_top_two",
  /** Two pools, top two each → semis A1vB2, B1vA2 style. */
  "cross_pool_semis_two_pools",
  /** First place only cross, then bracket (legacy simple cross). */
  "cross_pool_winners_only",
]);

export const TournamentDrawDivisionSchema = z
  .object({
    divisionId: z.string().min(1).max(64),
    label: z.string().min(1).max(80),
    /** Soft cap / planning hint; not enforced by draw validation. */
    maxTeams: z.number().int().min(1).max(128).nullable().optional(),
    /** Entries in this division (disjoint from other divisions). */
    entryIds: z.array(z.string().min(1)).max(128),
    poolPhase: TournamentDrawDivisionPoolPhaseSchema.optional(),
    afterPools: TournamentDrawAfterPoolsSchema.optional(),
    pools: z.array(TournamentDrawPoolSchema).max(32).optional(),
    knockoutMatches: z.array(TournamentDrawKnockoutMatchSchema).max(512).optional(),
  })
  .strict();

/** Body: explicit template for `division_playoff_skeleton` generation. */
export const DrawPlayoffTemplateSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("none") }),
  z.object({
    type: z.literal("same_place_parallel"),
    /** Pair pools (0–1), (2–3), … and match same place up to maxPlace. */
    maxPlace: z.number().int().min(1).max(16),
  }),
  z.object({
    type: z.literal("qf_top_two_four_pools"),
    pairing: z.enum(["a1_b2_b1_a2_c1_d2_d1_c2"]),
  }),
  z.object({ type: z.literal("semis_top_two_two_pools") }),
  z.object({ type: z.literal("pool_winners_cross_pairs") }),
]);

export const TournamentDrawStateSchema = z
  .object({
    structure: TournamentDrawStructureSchema.default("legacy_flat"),
    format: TournamentDrawFormatSchema,
    /** Lower seed number = stronger (1 = top). Keys: `team_tournament_entries.entryId`. */
    seeds: z.record(z.string(), z.number().int().min(1).max(9999)).optional(),
    pools: z.array(TournamentDrawPoolSchema).max(32).optional(),
    knockoutMatches: z.array(TournamentDrawKnockoutMatchSchema).max(512).optional(),
    divisions: z.array(TournamentDrawDivisionSchema).max(16).optional(),
    /** Optional pointer for a future “prior year” seeding import. */
    priorYearTournamentId: z.string().min(1).max(64).nullable().optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

export const PatchTournamentDrawStateSchema = TournamentDrawStateSchema.partial();

export const DrawGenerateBodySchema = z
  .object({
    kind: z.enum([
      "snake_pools",
      "single_elimination",
      "pools_then_knockout",
      "division_ranked_snake_pools",
      "division_playoff_skeleton",
    ]),
    poolCount: z.number().int().min(1).max(16).optional(),
    /** Shuffle team order before assignment (ignores seeds unless `false`). */
    randomizeOrder: z.boolean().optional().default(false),
    /** For `division_ranked_snake_pools`: which divisions to (re)build and their pool counts. */
    divisions: z
      .array(
        z.object({
          divisionId: z.string().min(1),
          poolCount: z.number().int().min(1).max(16),
        }),
      )
      .max(16)
      .optional(),
    divisionId: z.string().min(1).optional(),
    playoffTemplate: DrawPlayoffTemplateSchema.optional(),
  })
  .strict()
  .superRefine((b, ctx) => {
    if (b.kind === "snake_pools" && (b.poolCount == null || b.poolCount < 1)) {
      ctx.addIssue({
        code: "custom",
        message: "poolCount (1–16) is required for snake_pools",
        path: ["poolCount"],
      });
    }
    if (b.kind === "pools_then_knockout") {
      if (b.poolCount == null || b.poolCount < 2) {
        ctx.addIssue({
          code: "custom",
          message: "poolCount must be 2–16 for pools_then_knockout",
          path: ["poolCount"],
        });
      }
    }
    if (b.kind === "division_ranked_snake_pools") {
      if (!b.divisions?.length) {
        ctx.addIssue({
          code: "custom",
          message: "divisions[] with divisionId and poolCount is required",
          path: ["divisions"],
        });
      }
    }
    if (b.kind === "division_playoff_skeleton") {
      if (!b.divisionId?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "divisionId is required",
          path: ["divisionId"],
        });
      }
      if (!b.playoffTemplate) {
        ctx.addIssue({
          code: "custom",
          message: "playoffTemplate is required",
          path: ["playoffTemplate"],
        });
      }
    }
  });

export const DrawImportSeedsBodySchema = z
  .object({
    seasonCompetitionId: z.string().min(1),
    /** When true, teams missing from standings get a large seed (weaker). */
    publishedFixturesOnly: z.boolean().optional().default(true),
  })
  .strict();

export type TournamentDrawState = z.infer<typeof TournamentDrawStateSchema>;
export type TournamentDrawDivision = z.infer<typeof TournamentDrawDivisionSchema>;
export type DrawPlayoffTemplate = z.infer<typeof DrawPlayoffTemplateSchema>;
