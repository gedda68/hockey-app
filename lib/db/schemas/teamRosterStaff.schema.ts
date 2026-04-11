// Epic G — Coaching & team staff embedded on `teamRosters.teams[].staff[]`.

import { z } from "zod";

/** Canonical staff role codes (G1); `role` string remains the human-facing label. */
export const TeamStaffRoleCodeSchema = z.enum([
  "head_coach",
  "assistant_coach",
  "manager",
  "physio",
  "team_manager",
  "other",
]);

export type TeamStaffRoleCode = z.infer<typeof TeamStaffRoleCodeSchema>;

const IsoDateLike = z
  .string()
  .min(8)
  .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date");

export const PostTeamStaffBodySchema = z
  .object({
    role: z.string().min(1, "Role label is required"),
    memberId: z.string().min(1, "Member ID is required"),
    memberName: z.string().optional(),
    qualifications: z.array(z.string()).optional().default([]),
    staffRoleCode: TeamStaffRoleCodeSchema.optional(),
    /** Working with children / blue-card style reference (store minimally; G2). */
    wwccCardNumber: z.string().max(80).nullable().optional(),
    wwccExpiresAt: z.union([IsoDateLike, z.null()]).optional(),
    /** G3 — honoured when staff are exposed on public team pages. */
    showEmailOnPublicSite: z.boolean().optional().default(false),
    showPhoneOnPublicSite: z.boolean().optional().default(false),
  })
  .strict();

export type PostTeamStaffBody = z.infer<typeof PostTeamStaffBodySchema>;

export const PatchTeamStaffBodySchema = z
  .object({
    role: z.string().min(1).optional(),
    memberId: z.string().min(1).optional(),
    memberName: z.string().nullable().optional(),
    qualifications: z.array(z.string()).optional(),
    staffRoleCode: z.union([TeamStaffRoleCodeSchema, z.null()]).optional(),
    wwccCardNumber: z.string().max(80).nullable().optional(),
    wwccExpiresAt: z.union([IsoDateLike, z.null()]).optional(),
    showEmailOnPublicSite: z.boolean().optional(),
    showPhoneOnPublicSite: z.boolean().optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, {
    message: "At least one field is required",
  });

export type PatchTeamStaffBody = z.infer<typeof PatchTeamStaffBodySchema>;
