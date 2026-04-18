import type { FinalsSeriesConfig } from "@/lib/db/schemas/competition.schema";

/**
 * How many ladder teams qualify for finals for a given entered team count.
 * Uses strict inequality on the threshold: teamCount &lt; threshold → below branch;
 * teamCount ≥ threshold → at-or-above branch. Capped so we never exceed teamCount.
 */
export function ladderFinalistCount(teamCount: number, finals: FinalsSeriesConfig): number {
  if (teamCount < 2) return 0;
  const raw =
    teamCount < finals.teamCountThreshold
      ? finals.qualifierCountBelowThreshold
      : finals.qualifierCountAtOrAboveThreshold;
  return Math.min(raw, teamCount);
}
