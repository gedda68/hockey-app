// D1 — Representative tournament host: association vs club + branding association for RBAC.

import { z } from "zod";
import { AwardsLabelsSchema } from "@/lib/db/schemas/competitionAwards.schema";

export const TournamentHostTypeSchema = z.enum(["association", "club"]);

/** D2 — Who may enter, caps, deadlines, team entry fee (cents). */
export const TournamentEntryEligibilitySchema = z.enum([
  /** Clubs whose `parentAssociationId` matches tournament `brandingAssociationId`. */
  "branding_association_clubs",
  /** `hostType` must be `association`; club parent must match `hostId`. */
  "host_association_clubs",
  /** `hostType` must be `club`; only that club's teams. */
  "host_club_only",
  /** Only clubs listed in `allowedClubIds`. */
  "explicit_clubs",
]);

export const TournamentEntryRulesSchema = z
  .object({
    entryEligibility: TournamentEntryEligibilitySchema.default(
      "branding_association_clubs",
    ),
    allowedClubIds: z.array(z.string().min(1)).max(500).optional().default([]),
    maxTeams: z.union([z.number().int().positive().max(5000), z.null()]).optional(),
    /** Inclusive start (YYYY-MM-DD or ISO); null clears. */
    entryOpensAt: z.union([z.string().min(4), z.null()]).optional(),
    /** Inclusive last day entries accepted (calendar date). */
    entryClosesAt: z.union([z.string().min(4), z.null()]).optional(),
    /** Last day a team may withdraw (calendar date). */
    withdrawalDeadline: z.union([z.string().min(4), z.null()]).optional(),
    /** Suggested team entry fee in cents (optional seed on team entry create). */
    entryFeeCents: z.number().int().nonnegative().max(1_000_000_000).nullable().optional(),
  })
  .strict();

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
    entryRules: TournamentEntryRulesSchema.optional(),
    /** When true, rep fixture results stay `submitted` until `results.approve`. */
    resultApprovalRequired: z.boolean().optional(),
    /** Declared champion (`team_tournament_entries.entryId`); null clears. */
    championEntryId: z.union([z.string().min(1), z.null()]).optional(),
    /** Denormalised for public display; set when `championEntryId` is saved. */
    championTeamName: z.union([z.string().min(1).max(200), z.null()]).optional(),
    /** Custom display names for standard competition awards (public + admin). */
    awardsLabels: AwardsLabelsSchema.optional(),
  })
  .strict();

export const PatchRepTournamentBodySchema = CreateRepTournamentBodySchema.partial();

export type TournamentHostType = z.infer<typeof TournamentHostTypeSchema>;
