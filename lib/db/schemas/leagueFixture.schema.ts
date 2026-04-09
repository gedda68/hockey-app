// lib/db/schemas/leagueFixture.schema.ts
// League fixtures: scheduling, venue, publish to public (E2).

import { z } from "zod";

export const FixtureMatchStatusSchema = z.enum([
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "postponed",
]);

export const FixtureResultTypeSchema = z.enum([
  "normal",
  "forfeit",
  "abandoned",
]);

export const FixtureResultStatusSchema = z.enum([
  "draft",
  "submitted",
  "approved",
  "rejected",
]);

/** ISO 8601 datetime string or null to clear. */
const IsoOrNull = z.union([z.string().min(1), z.null()]);

/** Umpire slots on a fixture (public fixtures / MatchList). */
export const FixtureUmpireSlotSchema = z.object({
  umpireType: z.string().min(1),
  umpireId: z.string().min(1),
  /** Tier/code used with association umpire payment schedule (e.g. level_2, national). */
  qualificationTier: z.string().min(1).nullable().optional(),
  dateAllocated: z.string().optional(),
  dateAccepted: z.string().nullable().optional(),
  dateUpdated: z.string().optional(),
});

export const LeagueFixtureSchema = z.object({
  fixtureId: z.string().min(1),
  seasonCompetitionId: z.string().min(1),
  competitionId: z.string().min(1),
  owningAssociationId: z.string().min(1),
  round: z.number().int().min(1),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
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

  /** Optional link to legacy demo JSON `umpire-allocations.json` matchId. */
  legacyMatchId: z.string().nullable().optional(),
  /** Umpires allocated to this fixture (live data). */
  umpires: z.array(FixtureUmpireSlotSchema).nullable().optional(),
  /** Match tier for honoraria lookup (association-defined codes, e.g. league, finals). */
  matchLevel: z.string().min(1).optional(),

  createdAt: z.string(),
  createdBy: z.string().optional(),
  updatedAt: z.string().optional(),
  updatedBy: z.string().optional(),
});

export type LeagueFixture = z.infer<typeof LeagueFixtureSchema>;

export const PatchLeagueFixtureBodySchema = z
  .object({
    venueId: z.string().min(1).nullable().optional(),
    venueName: z.string().min(1).nullable().optional(),
    addressLine: z.string().nullable().optional(),
    scheduledStart: IsoOrNull.optional(),
    scheduledEnd: IsoOrNull.optional(),
    timezone: z.string().nullable().optional(),
    published: z.boolean().optional(),
    status: FixtureMatchStatusSchema.optional(),
    legacyMatchId: z.string().min(1).nullable().optional(),
    umpires: z.array(FixtureUmpireSlotSchema).nullable().optional(),
    matchLevel: z.union([z.string().min(1), z.null()]).optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "At least one field is required",
  });

export type PatchLeagueFixtureBody = z.infer<typeof PatchLeagueFixtureBodySchema>;
