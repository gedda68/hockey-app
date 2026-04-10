// lib/db/schemas/officialRegister.schema.ts
// F1 — Association official register (names, qualification codes, level, expiry).

import { z } from "zod";

export const OfficialAllocationAvailabilitySchema = z.enum([
  "available",
  "limited",
  "unavailable",
]);

export const OfficialRegisterRecordSchema = z.object({
  officialRecordId: z.string().min(1),
  associationId: z.string().min(1),
  displayName: z.string().min(1),
  /** If set, fixture `umpireId` may equal this member id. */
  memberId: z.string().min(1).nullable().optional(),
  /** If set, fixture `umpireId` may match this umpire number string. */
  umpireNumber: z.string().min(1).nullable().optional(),
  /**
   * Home club for conflict-of-interest (F2): cannot officiate matches where either
   * team belongs to this club unless assignment override is recorded on the fixture.
   */
  primaryClubId: z.string().min(1).nullable().optional(),
  /** Accepting new allocations (F2). `limited` = warn only; `unavailable` = block without override. */
  allocationAvailability: OfficialAllocationAvailabilitySchema.default("available"),
  availabilityNote: z.string().max(500).nullable().optional(),
  /** If set and still in the future, treated as unavailable for allocations. */
  unavailableUntil: z.string().nullable().optional(),
  qualificationCodes: z.array(z.string()).default([]),
  levelLabel: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
});

export type OfficialRegisterRecord = z.infer<typeof OfficialRegisterRecordSchema>;

export const PostOfficialRegisterBodySchema = z
  .object({
    displayName: z.string().min(1),
    memberId: z.string().min(1).nullable().optional(),
    umpireNumber: z.string().min(1).nullable().optional(),
    primaryClubId: z.string().min(1).nullable().optional(),
    allocationAvailability: OfficialAllocationAvailabilitySchema.optional(),
    availabilityNote: z.string().max(500).nullable().optional(),
    unavailableUntil: z.string().nullable().optional(),
    qualificationCodes: z.array(z.string()).optional().default([]),
    levelLabel: z.string().nullable().optional(),
    expiresAt: z.string().nullable().optional(),
    isActive: z.boolean().optional().default(true),
  })
  .refine((d) => Boolean(d.memberId?.trim()) || Boolean(d.umpireNumber?.trim()), {
    message: "Provide memberId and/or umpireNumber to match fixture allocations",
  });

export type PostOfficialRegisterBody = z.infer<
  typeof PostOfficialRegisterBodySchema
>;

export const PatchOfficialRegisterBodySchema = z
  .object({
    displayName: z.string().min(1).optional(),
    memberId: z.string().min(1).nullable().optional(),
    umpireNumber: z.string().min(1).nullable().optional(),
    primaryClubId: z.string().min(1).nullable().optional(),
    allocationAvailability: OfficialAllocationAvailabilitySchema.optional(),
    availabilityNote: z.string().max(500).nullable().optional(),
    unavailableUntil: z.string().nullable().optional(),
    qualificationCodes: z.array(z.string()).optional(),
    levelLabel: z.string().nullable().optional(),
    expiresAt: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, {
    message: "At least one field is required",
  });

export type PatchOfficialRegisterBody = z.infer<
  typeof PatchOfficialRegisterBodySchema
>;
