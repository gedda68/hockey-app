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

/** Accepts string codes or legacy `{ name }` objects from the admin UI. */
const QualificationsInputSchema = z.preprocess((val) => {
  if (!Array.isArray(val)) return [];
  return val.map((item) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object" && "name" in item) {
      const n = (item as { name: unknown }).name;
      return typeof n === "string" ? n : "";
    }
    return "";
  });
}, z.array(z.string()).default([]));

const OptionalQualificationsInputSchema = z.preprocess((val) => {
  if (val === undefined) return undefined;
  if (!Array.isArray(val)) return [];
  return val.map((item) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object" && "name" in item) {
      const n = (item as { name: unknown }).name;
      return typeof n === "string" ? n : "";
    }
    return "";
  });
}, z.array(z.string()).optional());

export const PostTeamStaffBodySchema = z
  .object({
    role: z.string().min(1, "Role label is required"),
    memberId: z.string().min(1, "Member ID is required"),
    memberName: z.string().optional(),
    qualifications: QualificationsInputSchema.optional().default([]),
    staffRoleCode: TeamStaffRoleCodeSchema.optional(),
    /** Working with children / blue-card style reference (store minimally; G2). */
    wwccCardNumber: z.string().max(80).nullable().optional(),
    wwccExpiresAt: z.union([IsoDateLike, z.null()]).optional(),
    /** G3 — honoured when staff are exposed on public team pages. */
    showEmailOnPublicSite: z.boolean().optional().default(false),
    showPhoneOnPublicSite: z.boolean().optional().default(false),
  });

export type PostTeamStaffBody = z.infer<typeof PostTeamStaffBodySchema>;

export const PatchTeamStaffBodySchema = z
  .object({
    role: z.string().min(1).optional(),
    memberId: z.string().min(1).optional(),
    memberName: z.string().nullable().optional(),
    qualifications: OptionalQualificationsInputSchema.optional(),
    staffRoleCode: z.union([TeamStaffRoleCodeSchema, z.null()]).optional(),
    wwccCardNumber: z.string().max(80).nullable().optional(),
    wwccExpiresAt: z.union([IsoDateLike, z.null()]).optional(),
    showEmailOnPublicSite: z.boolean().optional(),
    showPhoneOnPublicSite: z.boolean().optional(),
  }).refine((o) => Object.keys(o).length > 0, {
    message: "At least one field is required",
  });

export type PatchTeamStaffBody = z.infer<typeof PatchTeamStaffBodySchema>;
