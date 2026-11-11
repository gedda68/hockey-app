// lib/db/schemas/fixtureTeamStats.schema.ts
// `fixture_team_stats` — team-level numbers for one league fixture that aren't
// attributable to a player: penalty corners awarded (per period), and optional
// circle entries / shots / possession. One document per (fixtureId, teamId).
//
// Penalty corner and penalty stroke GOALS stay player events in
// league_fixtures.matchEvents; this collection records what was AWARDED.

import { z } from "zod";

export const FIXTURE_TEAM_STATS_COLLECTION = "fixture_team_stats";

/** A count split by period (quarters or halves). `null` = not recorded. */
export const PeriodCountSchema = z
  .object({
    total: z.number().int().min(0),
    byPeriod: z.array(z.number().int().min(0).nullable()).max(8),
  })
  .strict();

export const FixtureTeamStatsSchema = z.object({
  statsId: z.string().min(1),
  fixtureId: z.string().min(1),
  seasonCompetitionId: z.string().min(1),
  teamId: z.string().min(1),
  /** Minute each period ends, e.g. [17, 34, 51, 68] for quarters or [30, 60] for halves. */
  periodEndMinutes: z.array(z.number().int().min(1).max(200)).max(8),
  penaltyCornersAwarded: PeriodCountSchema.nullable(),
  /** Not recorded by Altius; available for manual entry. */
  penaltyStrokesAwarded: PeriodCountSchema.nullable().default(null),
  circleEntries: PeriodCountSchema.nullable().default(null),
  shots: PeriodCountSchema.nullable().default(null),
  shotsOnTarget: PeriodCountSchema.nullable().default(null),
  possessionPct: z.number().min(0).max(100).nullable().default(null),
  source: z.enum(["altius", "manual"]).default("manual"),
  updatedAt: z.union([z.date(), z.string()]),
  createdAt: z.union([z.date(), z.string()]).optional(),
});

export type FixtureTeamStats = z.infer<typeof FixtureTeamStatsSchema>;
export type PeriodCount = z.infer<typeof PeriodCountSchema>;
