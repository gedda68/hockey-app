// D4 — Representative tournament fixtures (pool play + knockouts from D3 skeletons).

import { z } from "zod";
import {
  FixtureMatchStatusSchema,
  FixtureResultStatusSchema,
  FixtureResultTypeSchema,
} from "@/lib/db/schemas/leagueFixture.schema";

const IsoOrNull = z.union([z.string().min(1), z.null()]);

export const RepTournamentFixturePhaseSchema = z.enum(["pool", "knockout"]);

const NullableEntryId = z.union([z.string().min(1), z.null()]);
const NullableTeamId = z.union([z.string().min(1), z.null()]);

export const RepTournamentFixtureSchema = z
  .object({
    fixtureId: z.string().min(1),
    tournamentId: z.string().min(1),
    phase: RepTournamentFixturePhaseSchema,
    /** Stable id from `TournamentDrawKnockoutMatchSchema.matchId` when generated from draw. */
    drawMatchId: z.string().max(120).nullable().optional(),
    bracketTag: z.string().max(40).nullable().optional(),
    knockoutRoundLabel: z.string().max(80).nullable().optional(),
    /** 0-based knockout round from draw; null for pool fixtures. */
    knockoutRoundIndex: z.number().int().min(0).nullable().optional(),
    matchOrder: z.number().int().min(0).nullable().optional(),
    /** Human-readable placeholders when teams are TBD (pool standings). */
    homeSourceLabel: z.string().max(160).nullable().optional(),
    awaySourceLabel: z.string().max(160).nullable().optional(),

    divisionId: z.string().max(64).nullable().optional(),
    poolId: z.string().max(80).nullable().optional(),
    poolLabel: z.string().max(80).nullable().optional(),
    poolRound: z.number().int().min(1),
    sequence: z.number().int().min(0),

    homeEntryId: NullableEntryId,
    awayEntryId: NullableEntryId,
    homeTeamId: NullableTeamId,
    awayTeamId: NullableTeamId,
    homeTeamName: z.string().max(200).nullable().optional(),
    awayTeamName: z.string().max(200).nullable().optional(),

    status: FixtureMatchStatusSchema.default("scheduled"),

    venueId: z.string().min(1).nullable().optional(),
    venueName: z.string().min(1).nullable().optional(),
    addressLine: z.string().nullable().optional(),
    scheduledStart: z.string().nullable().optional(),
    scheduledEnd: z.string().nullable().optional(),
    timezone: z.string().nullable().optional(),

    published: z.boolean().default(false),
    publishedAt: z.string().nullable().optional(),

    result: z
      .object({
        resultType: FixtureResultTypeSchema.default("normal"),
        homeScore: z.number().int().min(0).nullable().optional(),
        awayScore: z.number().int().min(0).nullable().optional(),
        shootoutHomeScore: z.number().int().min(0).nullable().optional(),
        shootoutAwayScore: z.number().int().min(0).nullable().optional(),
        forfeitingTeamId: z.string().min(1).nullable().optional(),
        notes: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    resultStatus: FixtureResultStatusSchema.nullable().optional(),
    resultSubmittedAt: z.string().nullable().optional(),
    resultSubmittedBy: z.string().nullable().optional(),
    resultApprovedAt: z.string().nullable().optional(),
    resultApprovedBy: z.string().nullable().optional(),

    createdAt: z.string(),
    createdBy: z.string().optional(),
    updatedAt: z.string().optional(),
    updatedBy: z.string().optional(),
  })
  .strict();

export const PatchRepTournamentFixtureBodySchema = z
  .object({
    venueId: z.string().min(1).nullable().optional(),
    venueName: z.string().min(1).nullable().optional(),
    addressLine: z.string().nullable().optional(),
    scheduledStart: IsoOrNull.optional(),
    scheduledEnd: IsoOrNull.optional(),
    timezone: z.string().nullable().optional(),
    published: z.boolean().optional(),
    status: FixtureMatchStatusSchema.optional(),
    /** Resolve TBD knockout slots once pool standings are known. */
    homeEntryId: NullableEntryId.optional(),
    awayEntryId: NullableEntryId.optional(),
    homeTeamId: NullableTeamId.optional(),
    awayTeamId: NullableTeamId.optional(),
    homeTeamName: z.union([z.string().max(200), z.null()]).optional(),
    awayTeamName: z.union([z.string().max(200), z.null()]).optional(),
    homeSourceLabel: z.union([z.string().max(160), z.null()]).optional(),
    awaySourceLabel: z.union([z.string().max(160), z.null()]).optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "At least one field is required",
  });

export const RepTournamentFixturesGenerateBodySchema = z
  .object({
    /** `pool_round_robin` (default) or `knockout_from_draw` (D3 skeleton rows). */
    mode: z.enum(["pool_round_robin", "knockout_from_draw"]).optional().default("pool_round_robin"),
    doubleRound: z.boolean().optional(),
    /** When true, only fixtures for the selected `mode` phase are deleted before insert. */
    replace: z.boolean().optional(),
  })
  .strict();

export type RepTournamentFixture = z.infer<typeof RepTournamentFixtureSchema>;
