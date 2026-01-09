/**
 * Data Layer Index
 *
 * Central export for all data utilities.
 * Import from here for consistency.
 *
 * @example
 * import { getMatches, getStandingsYears, getUmpireList } from '@/lib/data';
 */

// Match data utilities
export {
  getMatches,
  getMatchById,
  filterMatches,
  getDivisions,
  getRounds,
  getSeasons,
  getCurrentSeason,
  getMatchesByDateRange,
  getUpcomingMatches,
  getRecentMatches,
  getMatchesByClub,
} from "./matches";

// Standings data utilities
export {
  getStandingsYears,
  getDivisionsByYear,
  getDivisionStandings,
  getAllDivisions,
  getDivisionNames,
  getCurrentSeasonYear,
  divisionExistsInYear,
} from "./standings";

// Umpire data utilities
export {
  getUmpireList,
  getUmpireByNumber,
  getUmpireAllocations,
  getUmpireAllocationsMap,
  getUmpireAllocationForMatch,
  getUmpiresForMatch,
  getActiveUmpires,
  getUmpiresByLevel,
  getUmpiresByClub,
} from "./umpires";

// Statistics data utilities
export {
  getMatchStatsData,
  getMatchStats,
  getPlayerStatistics,
  getTeamStatistics,
  getTopScorers,
  getTopAssists,
} from "./stats";
