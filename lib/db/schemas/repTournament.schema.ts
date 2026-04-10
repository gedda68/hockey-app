// D1 — Representative tournament host: association vs club + branding association for RBAC.

import { z } from "zod";

export const TournamentHostTypeSchema = z.enum(["association", "club"]);

export const RepTournamentHostFieldsSchema = z.object({
  hostType: TournamentHostTypeSchema,
  hostId: z.string().min(1),
  /**
   * Association used for branding and parent-level RBAC. Defaults: association host → hostId;
   * club host → club.parentAssociationId (must match if explicitly sent).
   */
  brandingAssociationId: z.string().min(1).optional(),
});

export const CreateRepTournamentBodySchema = z
  .object({
    season: z.string().min(1),
    ageGroup: z.string().min(1),
    gender: z.enum(["male", "female", "mixed"]).optional(),
    title: z.string().min(1),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    location: z.string().min(1),
    additionalInfo: z.string().optional(),
    nominationFee: z.number().nonnegative().optional(),
    hostType: TournamentHostTypeSchema.optional(),
    hostId: z.string().min(1).optional(),
    brandingAssociationId: z.string().min(1).optional(),
  })
  .strict();

export const PatchRepTournamentBodySchema = CreateRepTournamentBodySchema.partial();

export type TournamentHostType = z.infer<typeof TournamentHostTypeSchema>;
