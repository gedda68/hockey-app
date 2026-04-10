// lib/competitions/standingsReadCache.ts
// Short TTL cache for standings + rollups (E8). Invalidated when results/fixtures change.

import type { StandingsRow } from "./standings";
import type {
  AssociationRollupSummary,
  ClubRollupRow,
  TeamRollupRow,
} from "./seasonStatsRollup";

export type StandingsReadBundle = {
  standings: StandingsRow[];
  rollups?: {
    teams: TeamRollupRow[];
    clubs: ClubRollupRow[];
    association: AssociationRollupSummary;
  };
};

const TTL_MS = 120_000;
const store = new Map<string, { expiresAt: number; value: StandingsReadBundle }>();

function cacheKey(seasonCompetitionId: string, variant: Record<string, unknown>): string {
  return `sc:${seasonCompetitionId}:${JSON.stringify(variant)}`;
}

/**
 * Read-through cache for expensive standings + optional E5 rollups.
 */
export async function getStandingsBundleCached(
  seasonCompetitionId: string,
  variant: {
    publishedOnly: boolean;
    requiresResultApproval: boolean;
    ladderRules: unknown;
    includeRollups: boolean;
  },
  fetcher: () => Promise<StandingsReadBundle>,
): Promise<StandingsReadBundle> {
  const key = cacheKey(seasonCompetitionId, variant);
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) return hit.value;

  const value = await fetcher();
  store.set(key, { expiresAt: now + TTL_MS, value });
  return value;
}

/** Drop all cached entries for a season competition (call after result/fixture/generate changes). */
export function invalidateStandingsBundleCache(seasonCompetitionId: string): void {
  const prefix = `sc:${seasonCompetitionId}:`;
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}
