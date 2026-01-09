/**
 * Statistics Data Utilities
 *
 * Functions for loading and processing statistics data
 */

import matchStatsData from "../../data/statistics/match-stats.json";

/**
 * Get match statistics data
 */
export async function getMatchStatsData(): Promise<Record<string, any>> {
  return matchStatsData as Record<string, any>;
}

/**
 * Get statistics for a specific match
 */
export async function getMatchStats(matchId: string): Promise<any | null> {
  const stats = await getMatchStatsData();
  return stats[matchId] || null;
}

/**
 * Get player statistics (if available)
 */
export async function getPlayerStatistics(division?: string, season?: string) {
  // This would load from player-stats.json if it exists
  // For now, return empty array or mock data
  return [];
}

/**
 * Get team statistics (if available)
 */
export async function getTeamStatistics(division?: string, season?: string) {
  // This would load from team-stats.json if it exists
  // For now, return empty array or mock data
  return [];
}

/**
 * Get top scorers
 */
export async function getTopScorers(limit: number = 10) {
  // This would aggregate from match stats or player stats
  // For now, return empty array
  return [];
}

/**
 * Get top assists
 */
export async function getTopAssists(limit: number = 10) {
  // This would aggregate from match stats or player stats
  // For now, return empty array
  return [];
}
