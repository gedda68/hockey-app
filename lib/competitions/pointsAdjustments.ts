// Manual ladder points adjustments (penalties / bonuses), stored on the
// season competition as `pointsAdjustments` and applied on top of results.

import type { TeamStandingsAccumulator } from "./standings";

export interface PointsAdjustment {
  adjustmentId: string;
  teamId: string;
  /** Positive adds points, negative deducts. */
  points: number;
  reason: string;
  createdAt: string;
  createdBy: string;
}

export function applyPointsAdjustments(
  rowMap: Map<string, TeamStandingsAccumulator>,
  adjustments: PointsAdjustment[] | null | undefined,
): void {
  for (const a of adjustments ?? []) {
    if (!a?.teamId || !Number.isFinite(a.points)) continue;
    let row = rowMap.get(a.teamId);
    if (!row) {
      row = { teamId: a.teamId, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
      rowMap.set(a.teamId, row);
    }
    row.pts += a.points;
  }
}
