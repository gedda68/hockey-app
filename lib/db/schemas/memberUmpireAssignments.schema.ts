// PATCH body for /api/member/my-umpire-assignments (F3 self-service).

import { z } from "zod";

export const PatchMyUmpireAssignmentBodySchema = z
  .object({
    fixtureId: z.string().min(1),
    seasonCompetitionId: z.string().min(1),
    slotIndex: z.number().int().min(0),
    allocationStatus: z.enum(["accepted", "declined"]),
  })
  .strict();

export type PatchMyUmpireAssignmentBody = z.infer<
  typeof PatchMyUmpireAssignmentBodySchema
>;
