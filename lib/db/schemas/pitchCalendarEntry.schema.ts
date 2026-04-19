// Epic V3 — Non-league pitch blocks shown on the public venue week calendar (training vs private).

import { z } from "zod";

export const PitchCalendarDisplayKindSchema = z.enum(["training", "private"]);

export const PitchCalendarTrainingOrganizerSchema = z.enum(["club", "association"]);

export const PitchCalendarEntryDocSchema = z
  .object({
    entryId: z.string().min(1),
    associationId: z.string().min(1),
    venueId: z.string().min(1),
    pitchId: z.string().min(1),
    scheduledStart: z.string().min(1),
    scheduledEnd: z.string().nullable().optional(),
    displayKind: PitchCalendarDisplayKindSchema,
    trainingOrganizer: PitchCalendarTrainingOrganizerSchema.optional(),
    trainingClubId: z.string().min(1).nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    createdBy: z.string().optional(),
    updatedBy: z.string().optional(),
  })
  .strict()
  .superRefine((row, ctx) => {
    if (row.displayKind === "private") {
      if (row.trainingOrganizer != null) {
        ctx.addIssue({
          code: "custom",
          message: "trainingOrganizer must be absent for private",
          path: ["trainingOrganizer"],
        });
      }
      if (row.trainingClubId != null && row.trainingClubId !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: "trainingClubId must be absent for private",
          path: ["trainingClubId"],
        });
      }
      return;
    }
    if (!row.trainingOrganizer) {
      ctx.addIssue({
        code: "custom",
        message: "trainingOrganizer required for training",
        path: ["trainingOrganizer"],
      });
      return;
    }
    if (row.trainingOrganizer === "club" && !String(row.trainingClubId ?? "").trim()) {
      ctx.addIssue({
        code: "custom",
        message: "trainingClubId required for club training",
        path: ["trainingClubId"],
      });
    }
  });

export const CreatePitchCalendarEntryBodySchema = z
  .object({
    venueId: z.string().min(1),
    pitchId: z.string().min(1),
    scheduledStart: z.string().min(1),
    scheduledEnd: z.string().nullable().optional(),
    displayKind: PitchCalendarDisplayKindSchema,
    trainingOrganizer: PitchCalendarTrainingOrganizerSchema.optional(),
    trainingClubId: z.string().min(1).nullable().optional(),
  })
  .strict()
  .superRefine((b, ctx) => {
    if (b.displayKind === "private") {
      if (b.trainingOrganizer != null) {
        ctx.addIssue({
          code: "custom",
          message: "trainingOrganizer must not be set for private entries",
          path: ["trainingOrganizer"],
        });
      }
      if (b.trainingClubId != null && b.trainingClubId !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: "trainingClubId must not be set for private entries",
          path: ["trainingClubId"],
        });
      }
      return;
    }
    if (!b.trainingOrganizer) {
      ctx.addIssue({
        code: "custom",
        message: "trainingOrganizer is required when displayKind is training",
        path: ["trainingOrganizer"],
      });
      return;
    }
    if (b.trainingOrganizer === "club" && !String(b.trainingClubId ?? "").trim()) {
      ctx.addIssue({
        code: "custom",
        message: "trainingClubId is required when trainingOrganizer is club",
        path: ["trainingClubId"],
      });
    }
    if (b.trainingOrganizer === "association" && String(b.trainingClubId ?? "").trim()) {
      ctx.addIssue({
        code: "custom",
        message: "trainingClubId must be empty when trainingOrganizer is association",
        path: ["trainingClubId"],
      });
    }
  });

export type PitchCalendarEntryDoc = z.infer<typeof PitchCalendarEntryDocSchema>;
export type CreatePitchCalendarEntryBody = z.infer<typeof CreatePitchCalendarEntryBodySchema>;
