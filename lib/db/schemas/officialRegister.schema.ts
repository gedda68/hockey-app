// lib/db/schemas/officialRegister.schema.ts
// F1 — Association official register (names, qualification codes, level, expiry).

import { z } from "zod";

/** Placeholder validation until a national register API exists (F1 follow-up). */
export const NationalRegisterIdSchema = z
  .string()
  .max(64)
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9\-/.]{2,63}$/,
    "National register id: 4–64 chars, letters/digits and -/. only",
  );

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
  /** Region / zone label for reporting (e.g. "QLD — Brisbane"). */
  homeRegion: z.string().max(120).nullable().optional(),
  /** External accreditation id (state/national body); format is a local placeholder. */
  nationalRegisterId: z.union([NationalRegisterIdSchema, z.null()]).optional(),
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
    homeRegion: z.string().max(120).nullable().optional(),
    nationalRegisterId: z.union([NationalRegisterIdSchema, z.null()]).optional(),
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
    homeRegion: z.union([z.string().max(120), z.null()]).optional(),
    nationalRegisterId: z.union([NationalRegisterIdSchema, z.null()]).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, {
    message: "At least one field is required",
  });

export const BulkOfficialRegisterImportSchema = z
  .object({
    records: z.array(PostOfficialRegisterBodySchema).min(1).max(100),
  })
  .strict();

export type PatchOfficialRegisterBody = z.infer<
  typeof PatchOfficialRegisterBodySchema
>;
