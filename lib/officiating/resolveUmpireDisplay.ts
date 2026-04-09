// lib/officiating/resolveUmpireDisplay.ts
// Map fixture `umpireId` strings to display names via official register + members.

import type { Db } from "mongodb";

const REG_COL = "association_official_register";

export type UmpireDisplayResolution = {
  displayName: string;
  memberId?: string;
  source: "register" | "member";
};

/**
 * Build a lookup from umpire id (as stored on fixtures / payment lines) to display info.
 */
export async function resolveUmpireDisplayMap(
  db: Db,
  associationId: string,
  umpireIds: string[],
): Promise<Map<string, UmpireDisplayResolution>> {
  const map = new Map<string, UmpireDisplayResolution>();
  const unique = [...new Set(umpireIds.map((s) => String(s).trim()).filter(Boolean))];
  if (unique.length === 0) return map;

  const regs = await db
    .collection(REG_COL)
    .find({
      associationId,
      isActive: { $ne: false },
      $or: [
        { umpireNumber: { $in: unique } },
        { memberId: { $in: unique } },
      ],
    })
    .toArray();

  for (const r of regs) {
    const displayName = String(r.displayName ?? "").trim();
    if (!displayName) continue;
    const memberId = r.memberId != null ? String(r.memberId) : undefined;
    const res: UmpireDisplayResolution = {
      displayName,
      memberId,
      source: "register",
    };
    if (r.umpireNumber != null && String(r.umpireNumber).trim()) {
      map.set(String(r.umpireNumber).trim(), res);
    }
    if (r.memberId != null && String(r.memberId).trim()) {
      map.set(String(r.memberId).trim(), res);
    }
  }

  const remaining = unique.filter((id) => !map.has(id));
  if (remaining.length === 0) return map;

  const members = await db
    .collection("members")
    .find({ memberId: { $in: remaining } })
    .project({ memberId: 1, personalInfo: 1 })
    .toArray();

  for (const m of members) {
    const mid = String(m.memberId ?? "");
    const pi = m.personalInfo as
      | { displayName?: string; firstName?: string; lastName?: string }
      | undefined;
    const name =
      (pi?.displayName?.trim() ||
        `${pi?.firstName ?? ""} ${pi?.lastName ?? ""}`.trim()) ||
      mid;
    if (mid) {
      map.set(mid, {
        displayName: name,
        memberId: mid,
        source: "member",
      });
    }
  }

  return map;
}
