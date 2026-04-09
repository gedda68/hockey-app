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

/** ISO 8601 datetime string or null to clear. */
const IsoOrNull = z.union([z.string().min(1), z.null()]);

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
  })
  .strict()
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "At least one field is required",
  });

export type PatchLeagueFixtureBody = z.infer<typeof PatchLeagueFixtureBodySchema>;
