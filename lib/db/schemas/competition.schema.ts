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
});

