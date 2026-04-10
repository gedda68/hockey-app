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

export const UmpireAllocationStatusSchema = z.enum([
  "assigned",
  "accepted",
  "declined",
]);

/** On-field events for player-level stats (E6). */
export const FixtureMatchEventKindSchema = z.enum([
  "goal",
  "green_card",
  "yellow_card",
  "red_card",
]);

export const FixtureMatchEventSchema = z
  .object({
    eventId: z.string().min(1).optional(),
    kind: FixtureMatchEventKindSchema,
    teamId: z.string().min(1),
    memberId: z.string().min(1),
    assistMemberId: z.string().min(1).nullable().optional(),
    period: z.number().int().min(1).max(99).nullable().optional(),
    minute: z.number().int().min(0).max(150).nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
  })
  .strict()
  .superRefine((e, ctx) => {
    if (e.kind !== "goal" && e.assistMemberId != null && e.assistMemberId !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: "assistMemberId is only valid for goal events",
        path: ["assistMemberId"],
      });
    }
  });

export const PatchMatchEventsBodySchema = z
  .object({
    events: z.array(FixtureMatchEventSchema).max(200),
  })
  .strict();

/** Umpire slots on a fixture (public fixtures / MatchList). */
export const FixtureUmpireSlotSchema = z.object({
  umpireType: z.string().min(1),
  umpireId: z.string().min(1),
  /** Tier/code used with association umpire payment schedule (e.g. level_2, national). */
  qualificationTier: z.string().min(1).nullable().optional(),
  /** F3 allocation workflow (optional; defaults to assigned when umpires are set). */
  allocationStatus: UmpireAllocationStatusSchema.optional(),
  dateAllocated: z.string().optional(),
  dateAccepted: z.string().nullable().optional(),
  dateDeclined: z.string().nullable().optional(),
  /** When an offer/assignment notification was sent (integrate email/push later). */
  dateNotified: z.string().nullable().optional(),
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

  /** Player-attributed events (goals, cards). Shown publicly when the fixture result is visible (E6). */
  matchEvents: z.array(FixtureMatchEventSchema).nullable().optional(),

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
export type FixtureMatchEvent = z.infer<typeof FixtureMatchEventSchema>;
export type PatchMatchEventsBody = z.infer<typeof PatchMatchEventsBodySchema>;
