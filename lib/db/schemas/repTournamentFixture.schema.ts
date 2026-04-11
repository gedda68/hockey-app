// D4 — Representative tournament fixtures (pool play + future knockouts), separate from league_fixtures.

import { z } from "zod";
import {
  FixtureMatchStatusSchema,
  FixtureResultStatusSchema,
  FixtureResultTypeSchema,
} from "@/lib/db/schemas/leagueFixture.schema";

const IsoOrNull = z.union([z.string().min(1), z.null()]);

export const RepTournamentFixturePhaseSchema = z.enum(["pool", "knockout"]);

export const RepTournamentFixtureSchema = z
  .object({
    fixtureId: z.string().min(1),
    tournamentId: z.string().min(1),
    phase: RepTournamentFixturePhaseSchema,
    /** When generated from a multi-division draw. */
    divisionId: z.string().max(64).nullable().optional(),
    poolId: z.string().max(80).nullable().optional(),
    poolLabel: z.string().max(80).nullable().optional(),
    /** Round index within the pool (or knockout round later). */
    poolRound: z.number().int().min(1),
    /** Stable ordering across the tournament batch. */
    sequence: z.number().int().min(0),
    homeEntryId: z.string().min(1),
    awayEntryId: z.string().min(1),
    homeTeamId: z.string().min(1),
    awayTeamId: z.string().min(1),
    homeTeamName: z.string().max(200).optional(),
    awayTeamName: z.string().max(200).optional(),
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
  })
  .strict()
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "At least one field is required",
  });

export const RepTournamentFixturesGenerateBodySchema = z
  .object({
    doubleRound: z.boolean().optional(),
    replace: z.boolean().optional(),
  })
  .strict();

export type RepTournamentFixture = z.infer<typeof RepTournamentFixtureSchema>;
