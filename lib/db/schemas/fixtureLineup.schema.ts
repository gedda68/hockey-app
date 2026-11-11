// lib/db/schemas/fixtureLineup.schema.ts
// `fixture_lineups` — who played for a team in one league fixture, with the
// shirt number worn in that match. One document per (fixtureId, teamId).
//
// Used by the public match centre to show shirt numbers next to timeline
// events, and as the source for match-day squads.

import { z } from "zod";

export const FIXTURE_LINEUPS_COLLECTION = "fixture_lineups";

export const FixtureLineupPlayerSchema = z
  .object({
    memberId: z.string().min(1),
    shirtNumber: z.number().int().min(0).max(999).nullable(),
    isGoalkeeper: z.boolean().default(false),
    isCaptain: z.boolean().default(false),
  })
  .strict();

export const FixtureLineupStaffSchema = z
  .object({
    memberId: z.string().min(1),
    role: z.string().min(1).max(60), // "Coach", "Manager", …
  })
  .strict();

export const FixtureLineupSchema = z.object({
  lineupId: z.string().min(1),
  fixtureId: z.string().min(1),
  seasonCompetitionId: z.string().min(1),
  teamId: z.string().min(1),
  players: z.array(FixtureLineupPlayerSchema).max(40),
  staff: z.array(FixtureLineupStaffSchema).max(20).default([]),
  source: z.enum(["altius", "manual"]).default("manual"),
  updatedAt: z.union([z.date(), z.string()]),
  createdAt: z.union([z.date(), z.string()]).optional(),
});

export type FixtureLineup = z.infer<typeof FixtureLineupSchema>;
export type FixtureLineupPlayer = z.infer<typeof FixtureLineupPlayerSchema>;
