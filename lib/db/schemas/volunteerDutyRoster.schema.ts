// O3 — Club volunteer duty roster (light CRM), separate from association_official_register.

import { z } from "zod";
import { VOLUNTEER_DUTY_KIND_IDS } from "@/lib/volunteerDuty/volunteerDutyKinds";

export const VolunteerDutyLeadStatusSchema = z.enum([
  "lead",
  "contacted",
  "active",
  "paused",
  "archived",
]);

export const VolunteerDutyLeadSourceSchema = z.enum(["pathway_web", "admin"]);

export const VolunteerDutyKindSchema = z.enum(VOLUNTEER_DUTY_KIND_IDS);

export const VolunteerDutyLeadDocSchema = z.object({
  leadId: z.string().min(1),
  clubId: z.string().min(1),
  clubSlug: z.string().min(1).optional(),
  displayName: z.string().min(1).max(200),
  email: z.string().email().max(320),
  phone: z.string().max(40).nullable().optional(),
  memberId: z.string().min(1).nullable().optional(),
  dutyKinds: z.array(VolunteerDutyKindSchema).min(1).max(20),
  message: z.string().max(2000).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  status: VolunteerDutyLeadStatusSchema,
  source: VolunteerDutyLeadSourceSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
});

export type VolunteerDutyLeadDoc = z.infer<typeof VolunteerDutyLeadDocSchema>;

/** Public interest form — honeypot `company` must be empty. */
export const PublicVolunteerDutyInterestSchema = z
  .object({
    displayName: z.string().min(1).max(200).trim(),
    email: z.string().email().max(320).trim(),
    phone: z.string().max(40).trim().optional(),
    dutyKinds: z.array(VolunteerDutyKindSchema).min(1).max(10),
    message: z.string().max(2000).trim().optional(),
    company: z.string().max(200).optional(),
  })
  .strict();

export const AdminVolunteerDutyLeadCreateSchema = z.object({
  displayName: z.string().min(1).max(200).trim(),
  email: z.string().email().max(320).trim(),
  phone: z.string().max(40).trim().optional(),
  memberId: z.string().min(1).nullable().optional(),
  dutyKinds: z.array(VolunteerDutyKindSchema).min(1).max(20),
  notes: z.string().max(4000).trim().optional(),
  status: VolunteerDutyLeadStatusSchema.optional(),
  message: z.string().max(2000).trim().optional(),
});

export const AdminVolunteerDutyLeadPatchSchema = z
  .object({
    displayName: z.string().min(1).max(200).trim().optional(),
    email: z.string().email().max(320).trim().optional(),
    phone: z.string().max(40).trim().nullable().optional(),
    memberId: z.string().min(1).nullable().optional(),
    dutyKinds: z.array(VolunteerDutyKindSchema).min(1).max(20).optional(),
    notes: z.string().max(4000).trim().nullable().optional(),
    status: VolunteerDutyLeadStatusSchema.optional(),
    message: z.string().max(2000).trim().nullable().optional(),
  })
  .strict();
