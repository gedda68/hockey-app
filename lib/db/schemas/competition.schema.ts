// lib/db/schemas/competition.schema.ts
// Canonical league competition + season binding (association-owned).

import { z } from "zod";

export const CompetitionStatusSchema = z.enum([
  "draft",
  "published",
  "in_progress",
  "completed",
  "archived",
]);

/**
 * Competition: the durable definition (format, sport, owner).
 * SeasonCompetition: the season-specific instance that teams enter and fixtures/results belong to.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

/** Dated window (inclusive dates) — used for calendar blockouts and special-match slots. */
export const SeasonCalendarWindowSchema = z
  .object({
    startDate: isoDate,
    endDate: isoDate,
    label: z.string().max(120).optional(),
  })
  .refine((p) => p.endDate >= p.startDate, {
    message: "endDate must be on or after startDate",
    path: ["endDate"],
  });

/** @deprecated Use SeasonCalendarWindowSchema — kept for stable import names. */
export const SeasonBlockoutPeriodSchema = SeasonCalendarWindowSchema;

export const ClubNominatedVenueSchema = z.object({
  clubId: z.string().min(1),
  venueName: z.string().min(1).max(200),
  addressLine: z.string().max(300).optional(),
  notes: z.string().max(500).optional(),
});

/** How the post-ladder finals series is played (bracket / series length). */
export const FinalsSeriesFormatSchema = z.enum([
  "single_elimination",
  "double_elimination",
  "page_playoff",
  "best_of_3_series",
  "best_of_5_series",
  "best_of_3_then_best_of_5_grand_final",
  "round_robin_finals_pool",
  "custom",
]);

/**
 * How many teams qualify for finals from the ladder, based on entered team count.
 * Example: threshold 10 — fewer than 10 teams → top `qualifierCountBelowThreshold`;
 * 10 or more teams → top `qualifierCountAtOrAboveThreshold`.
 */
export const FinalsSeriesConfigSchema = z.object({
  teamCountThreshold: z.number().int().min(2).max(99).default(10),
  qualifierCountBelowThreshold: z.number().int().min(2).max(24).default(4),
  qualifierCountAtOrAboveThreshold: z.number().int().min(2).max(24).default(5),
  seriesFormat: FinalsSeriesFormatSchema.default("single_elimination"),
  seriesFormatNotes: z.string().max(500).optional(),
});

export const CompetitionSchema = z.object({
  _id: z.string().optional(),

  competitionId: z.string().min(1),
  owningAssociationId: z.string().min(1),

  name: z.string().min(1),
  sport: z.string().default("hockey"),

  // Optional metadata / scope
  geographyScope: z
    .object({
      region: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),

  status: CompetitionStatusSchema.default("draft"),

  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
});

export const SeasonCompetitionSchema = z.object({
  _id: z.string().optional(),

  seasonCompetitionId: z.string().min(1),
  competitionId: z.string().min(1),
  owningAssociationId: z.string().min(1),

  // Canonical season marker (keep string to match existing season usage)
  season: z.string().min(1), // e.g. "2026"

  // Optional: format/dimensions
  divisions: z
    .array(
      z.object({
        divisionId: z.string().min(1),
        name: z.string().min(1),
        grade: z.string().optional(),
        gender: z.enum(["male", "female", "mixed"]).optional(),
        ageCategory: z.enum(["junior", "senior", "masters"]).optional(),
      }),
    )
    .default([]),

  // Results/ladders configuration (E3/E4)
  resultApprovalRequired: z.boolean().default(false),
  ladderRules: z
    .object({
      pointsWin: z.number().int().default(3),
      pointsDraw: z.number().int().default(1),
      pointsLoss: z.number().int().default(0),
      pointsForfeitWin: z.number().int().default(3),
      pointsForfeitLoss: z.number().int().default(0),
      /** Regulation draw decided by shootout (or extra time then shootout). */
      pointsShootoutWin: z.number().int().default(2),
      pointsShootoutLoss: z.number().int().default(1),
      /**
       * Optional override for post-regulation wins (defaults to shootout points).
       * Standings use these when a draw is broken by shootout scores on the result.
       */
      pointsOvertimeWin: z.number().int().optional(),
      pointsOvertimeLoss: z.number().int().optional(),
      /**
       * When both set, ladder GF/GA for forfeit results use these instead of stored
       * scores (so boards stay consistent if results omit goals).
       */
      forfeitWinnerGoals: z.number().int().min(0).max(99).optional(),
      forfeitLoserGoals: z.number().int().min(0).max(99).optional(),
      // tie-break order
      tieBreakers: z
        .array(z.enum(["points", "gd", "gf", "h2h"]))
        .default(["points", "gd", "gf"]),
      includeAbandonedInPlayed: z.boolean().default(false),
    })
    .default({
      pointsWin: 3,
      pointsDraw: 1,
      pointsLoss: 0,
      pointsForfeitWin: 3,
      pointsForfeitLoss: 0,
      pointsShootoutWin: 2,
      pointsShootoutLoss: 1,
      tieBreakers: ["points", "gd", "gf"],
      includeAbandonedInPlayed: false,
    }),

  /**
   * When true, a full season draw is home-and-away (double round-robin).
   * Fixture generation still accepts an explicit `doubleRound` flag; this is the saved preference.
   */
  homeAndAway: z.boolean().default(false),

  /** Association-wide calendar blockouts (holidays, school breaks, venue closures). */
  blockoutPeriods: z.array(SeasonCalendarWindowSchema).max(40).default([]),

  /**
   * Reserved windows for showcase / special fixtures (e.g. mid-season top-two game).
   * Same shape as blockouts; kept separate so schedulers can treat them differently from “no play” dates.
   */
  specialMatchPeriods: z.array(SeasonCalendarWindowSchema).max(20).default([]),

  /** Ladder → finals: how many teams qualify and what bracket/series format applies. */
  finalsSeries: FinalsSeriesConfigSchema.default({
    teamCountThreshold: 10,
    qualifierCountBelowThreshold: 4,
    qualifierCountAtOrAboveThreshold: 5,
    seriesFormat: "single_elimination",
  }),

  /** League home ground per club (may differ from club postal address). */
  clubNominatedVenues: z.array(ClubNominatedVenueSchema).max(120).default([]),

  /** Optional logo for this season league (URL or site path). */
  logoUrl: z.string().max(2048).optional(),
  /** Optional display label (e.g. “2026 Men’s Premier”) — falls back to competition name + season. */
  displayName: z.string().max(160).optional(),

  status: CompetitionStatusSchema.default("draft"),

  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
});

export type Competition = z.infer<typeof CompetitionSchema>;
export type SeasonCompetition = z.infer<typeof SeasonCompetitionSchema>;

export const CreateCompetitionRequestSchema = z.object({
  owningAssociationId: z.string().min(1),
  name: z.string().min(1),
  sport: z.string().optional(),
  geographyScope: CompetitionSchema.shape.geographyScope.optional(),
});

export const CreateSeasonCompetitionRequestSchema = z.object({
  competitionId: z.string().min(1),
  owningAssociationId: z.string().min(1),
  season: z.string().min(1),
  divisions: SeasonCompetitionSchema.shape.divisions.optional(),
  ladderRules: SeasonCompetitionSchema.shape.ladderRules.optional(),
  resultApprovalRequired: z.boolean().optional(),
  logoUrl: z.string().max(2048).optional(),
  displayName: z.string().max(160).optional(),
  homeAndAway: z.boolean().optional(),
  blockoutPeriods: z.array(SeasonCalendarWindowSchema).max(40).optional(),
  specialMatchPeriods: z.array(SeasonCalendarWindowSchema).max(20).optional(),
  finalsSeries: FinalsSeriesConfigSchema.optional(),
  clubNominatedVenues: z.array(ClubNominatedVenueSchema).max(120).optional(),
});

export type FinalsSeriesFormat = z.infer<typeof FinalsSeriesFormatSchema>;
export type FinalsSeriesConfig = z.infer<typeof FinalsSeriesConfigSchema>;
export type SeasonCalendarWindow = z.infer<typeof SeasonCalendarWindowSchema>;
