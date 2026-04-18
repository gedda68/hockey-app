// lib/db/schemas/competitionAwards.schema.ts
// Per-match and end-of-competition awards for leagues (season competitions) and rep tournaments.

import { z } from "zod";

export const CompetitionAwardContextSchema = z.enum(["league", "tournament"]);

export const CompetitionAwardTypeSchema = z.enum([
  "player_of_match",
  "player_of_competition",
  "top_goal_scorer",
  "rookie",
  "goalkeeper",
]);

export const AwardsLabelsSchema = z
  .object({
    playerOfMatch: z.string().min(1).max(80).optional(),
    playerOfCompetition: z.string().min(1).max(80).optional(),
    topGoalScorer: z.string().min(1).max(80).optional(),
    rookie: z.string().min(1).max(80).optional(),
    goalkeeper: z.string().min(1).max(80).optional(),
  })
  .strict();

export const CreateCompetitionAwardBodySchema = z
  .object({
    awardType: CompetitionAwardTypeSchema,
    /** Required when awardType is player_of_match. */
    fixtureId: z.string().min(1).nullable().optional(),
    memberId: z.string().min(1),
    teamId: z.union([z.string().min(1), z.null()]).optional(),
    notes: z.union([z.string().max(500), z.null()]).optional(),
  })
  .strict()
  .superRefine((body, ctx) => {
    if (body.awardType === "player_of_match") {
      const fid = body.fixtureId;
      if (fid == null || fid === "") {
        ctx.addIssue({
          code: "custom",
          message: "fixtureId is required for player_of_match",
          path: ["fixtureId"],
        });
      }
      const tid = body.teamId;
      if (tid == null || typeof tid !== "string" || !tid.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "teamId is required for player_of_match (home or away team)",
          path: ["teamId"],
        });
      }
    } else if (body.fixtureId != null && body.fixtureId !== "") {
      ctx.addIssue({
        code: "custom",
        message: "fixtureId must be empty for this award type",
        path: ["fixtureId"],
      });
    }
  });

export const PatchCompetitionAwardBodySchema = z
  .object({
    memberId: z.string().min(1).optional(),
    teamId: z.union([z.string().min(1), z.null()]).optional(),
    notes: z.union([z.string().max(500), z.null()]).optional(),
    awardLabelSnapshot: z.string().min(1).max(120).optional(),
  })
  .strict();

export type CompetitionAwardContext = z.infer<typeof CompetitionAwardContextSchema>;
export type CompetitionAwardType = z.infer<typeof CompetitionAwardTypeSchema>;
export type AwardsLabels = z.infer<typeof AwardsLabelsSchema>;
