// Helpers for member umpire self-service (GET/PATCH my-umpire-assignments).

export type UmpireAssignmentRow = {
  fixtureId: string;
  seasonCompetitionId: string;
  owningAssociationId: string;
  slotIndex: number;
  umpireType: string;
  umpireId: string;
  allocationStatus?: string;
  isStandby?: boolean;
  scheduledStart?: string | null;
  venueName?: string | null;
  round?: number;
};

/**
 * `umpireId` values on fixtures that match this member: their member id plus
 * umpire numbers from active register rows linked to that member.
 */
export function umpireIdKeysFromRegister(
  memberId: string,
  registerRows: Array<{ umpireNumber?: unknown }>,
): Set<string> {
  const ids = new Set<string>([memberId.trim()]);
  for (const r of registerRows) {
    const n = r.umpireNumber;
    if (typeof n === "string" && n.trim()) ids.add(n.trim());
  }
  return ids;
}

/** Build assignment rows for slots where `umpireId` is in `idSet`. */
export function flattenAssignmentsFromFixtures(
  fixtures: unknown[],
  idSet: Set<string>,
): UmpireAssignmentRow[] {
  const assignments: UmpireAssignmentRow[] = [];
  for (const f of fixtures) {
    if (!f || typeof f !== "object") continue;
    const doc = f as Record<string, unknown>;
    const slots = (doc.umpires as unknown[] | null) ?? [];
    if (!Array.isArray(slots)) continue;
    slots.forEach((raw, slotIndex) => {
      const s = raw as {
        umpireId?: string;
        umpireType?: string;
        allocationStatus?: string;
        isStandby?: boolean;
      };
      if (!s?.umpireId || !idSet.has(String(s.umpireId))) return;
      assignments.push({
        fixtureId: String(doc.fixtureId),
        seasonCompetitionId: String(doc.seasonCompetitionId),
        owningAssociationId: String(doc.owningAssociationId ?? ""),
        slotIndex,
        umpireType: String(s.umpireType ?? ""),
        umpireId: String(s.umpireId),
        allocationStatus: s.allocationStatus,
        isStandby: Boolean(s.isStandby),
        scheduledStart: (doc.scheduledStart as string | null | undefined) ?? null,
        venueName: (doc.venueName as string | null | undefined) ?? null,
        round: typeof doc.round === "number" ? doc.round : undefined,
      });
    });
  }
  return assignments;
}

/** Merge allocation response fields onto an existing umpire slot document. */
export function mergeUmpireSlotAllocationStatus(
  slot: Record<string, unknown>,
  allocationStatus: "accepted" | "declined",
  nowIso: string,
): Record<string, unknown> {
  return {
    ...slot,
    allocationStatus,
    dateUpdated: nowIso,
    dateAccepted: allocationStatus === "accepted" ? nowIso : null,
    dateDeclined: allocationStatus === "declined" ? nowIso : null,
  };
}
