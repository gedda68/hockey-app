/**
 * Data Layer Index
 *
 * Central export file for all data functions
 */

// Export all matches functions
export {
  getMatches,
  getMatchById,
  getMatchesByDivision,
  getMatchesBySeason,
  getMatchesByStatus,
  getUpcomingMatches,
  getCompletedMatches,
  getFeatureGames,
  getDivisions,
  getSeasons,
  getRounds,
  getCurrentSeason,
  getMatchesForTeam,
  getRecentMatches,
  filterMatches,
  getMatchStatsData,
} from "./matches";

// Export all umpires functions
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

// Export standings functions
export {
  getStandingsYears,
  getDivisionsByYear,
  getDivisionStandings,
  getAllDivisions,
  getTopTeams,
  getTeamStandings,
  getCurrentSeasonStandings,
} from "./standings";

// Export clubs functions
export {
  getClubs,
  getClubBySlug,
  getClubSlugs,
  searchClubs,
  getClubContacts,
  getClubsWithSocial,
  getFeaturedClubs,
} from "./clubs";

// Export types
export type { Club, ClubContact } from "./clubs";

// You can add more exports as you create more data modules
export * from "./stats";
// export * from './events';
// export * from './fixtures';
