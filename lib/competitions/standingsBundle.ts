// lib/competitions/standingsBundle.ts
// Cached standings + optional E5 rollups for public and admin APIs (E8).

import clientPromise from "@/lib/mongodb";
import {
  accumulateStandingsRowsFromFixtures,
  finalizeStandingsFromRowMap,
  loadLeagueFixturesForStandings,
  type LadderRules,
} from "./standings";
import { enrichRollupsFromRowMap } from "./seasonStatsRollup";
import {
  getStandingsBundleCached,
  type StandingsReadBundle,
} from "./standingsReadCache";

export async function getSeasonCompetitionStandingsReadBundle(input: {
  seasonCompetitionId: string;
  owningAssociationId: string;
  ladderRules: LadderRules | null;
  requiresResultApproval: boolean;
  publishedOnly: boolean;
  includeRollups: boolean;
}): Promise<StandingsReadBundle> {
  const {
    seasonCompetitionId,
    owningAssociationId,
    ladderRules,
    requiresResultApproval,
    publishedOnly,
    includeRollups,
  } = input;

  return getStandingsBundleCached(
    seasonCompetitionId,
    {
      publishedOnly,
      requiresResultApproval,
      ladderRules,
      includeRollups,
    },
    async () => {
      const client = await clientPromise;
      const db = client.db(process.env.DB_NAME || "hockey-app");
      const fixtures = await loadLeagueFixturesForStandings(
        db,
        seasonCompetitionId,
        publishedOnly,
      );
      const rowMap = accumulateStandingsRowsFromFixtures(
        fixtures,
        ladderRules,
        requiresResultApproval,
      );
      const standings = await finalizeStandingsFromRowMap(db, rowMap);
      const rollups = includeRollups
        ? await enrichRollupsFromRowMap({
            db,
            rowMap,
            seasonCompetitionId,
            owningAssociationId,
          })
        : undefined;
      return { standings, rollups };
    },
  );
}
