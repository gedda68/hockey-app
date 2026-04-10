// D3 — Tournament draw: pools, knockout, cross-pool finals; manual seeds + standings import.

import { z } from "zod";

export const TournamentDrawFormatSchema = z.enum([
  "none",
  /** Round-robin within pools (pairings via `lib/competitions/roundRobin.ts` in a follow-up). */
  "round_robin_pools",
  "single_elimination",
  /** Pools then one crossover round pairing pool winners (place 1). */
  "pools_then_knockout",
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
});

export const TournamentDrawPoolSchema = z.object({
  poolId: z.string().min(1),
  label: z.string().min(1).max(40),
  entryIds: z.array(z.string().min(1)).max(64),
});

export const TournamentDrawStateSchema = z
  .object({
    format: TournamentDrawFormatSchema,
    /** Lower seed number = stronger (1 = top). Keys: `team_tournament_entries.entryId`. */
    seeds: z.record(z.string(), z.number().int().min(1).max(999)).optional(),
    pools: z.array(TournamentDrawPoolSchema).max(32).optional(),
    knockoutMatches: z.array(TournamentDrawKnockoutMatchSchema).max(512).optional(),
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
    ]),
    poolCount: z.number().int().min(2).max(16).optional(),
    /** Shuffle team order before assignment (ignores seeds unless `false`). */
    randomizeOrder: z.boolean().optional().default(false),
  })
  .strict()
  .superRefine((b, ctx) => {
    if (
      (b.kind === "snake_pools" || b.kind === "pools_then_knockout") &&
      (b.poolCount == null || b.poolCount < 2)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "poolCount (2–16) is required for pool-based generation",
        path: ["poolCount"],
      });
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
