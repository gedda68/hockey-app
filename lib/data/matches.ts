/**
 * Matches Data Utilities
 *
 * Functions for loading and processing match data
 */

import matchesData from "../../data/matches/matches.json";
import type { Match, ViewType } from "../../types";

/**
 * Get all matches
 */
export async function getMatches(): Promise<Match[]> {
  return matchesData as Match[];
}

/**
 * Get matches by ID
 */
export async function getMatchById(
  matchId: string
): Promise<Match | undefined> {
  const matches = await getMatches();
  return matches.find((m) => m.matchId === matchId);
}

/**
 * Filter matches based on criteria
 */
export async function filterMatches({
  type,
  division,
  round,
  status,
  season,
}: {
  type?: ViewType;
  division?: string;
  round?: string;
  status?: string;
  season?: string;
}): Promise<Match[]> {
  let matches = await getMatches();

  // Filter by type (results/upcoming)
  if (type === "results") {
    matches = matches.filter((m) => m.status === "Final");
  } else if (type === "upcoming") {
    matches = matches.filter(
      (m) => m.status === "Scheduled" || m.status === "Live"
    );
  }

  // Filter by division
  if (division && division !== "All") {
    matches = matches.filter((m) => m.division === division);
  }

  // Filter by round
  if (round && round !== "All") {
    matches = matches.filter((m) => m.round === parseInt(round));
  }

  // Filter by status
  if (status && status !== "All") {
    matches = matches.filter((m) => m.status === status);
  }

  // Filter by season
  if (season) {
    matches = matches.filter((m) => m.season === parseInt(season));
  }

  return matches;
}

/**
 * Get all divisions from matches
 */
export async function getDivisions(type?: ViewType): Promise<string[]> {
  const matches = type ? await filterMatches({ type }) : await getMatches();
  const divisions = new Set(matches.map((m) => m.division));
  return ["All", ...Array.from(divisions).sort()];
}

/**
 * Get all rounds from matches
 */
export async function getRounds(type?: ViewType): Promise<string[]> {
  const matches = type ? await filterMatches({ type }) : await getMatches();
  const rounds = new Set(matches.map((m) => m.round));
  return [
    "All",
    ...Array.from(rounds)
      .sort((a, b) => a - b)
      .map(String),
  ];
}

/**
 * Get all seasons from matches
 */
export async function getSeasons(): Promise<
  { year: number; isCurrent: boolean }[]
> {
  const matches = await getMatches();
  const seasons = new Set(matches.map((m) => m.season));
  const currentYear = new Date().getFullYear();

  return Array.from(seasons)
    .sort((a, b) => b - a)
    .map((year) => ({
      year,
      isCurrent: year === currentYear,
    }));
}

/**
 * Get current season
 */
export async function getCurrentSeason(): Promise<
  { year: number; isCurrent: boolean } | undefined
> {
  const seasons = await getSeasons();
  return seasons.find((s) => s.isCurrent) || seasons[0];
}

/**
 * Get matches for a specific date range
 */
export async function getMatchesByDateRange(
  startDate: Date,
  endDate: Date
): Promise<Match[]> {
  const matches = await getMatches();
  return matches.filter((m) => {
    const matchDate = new Date(m.dateTime);
    return matchDate >= startDate && matchDate <= endDate;
  });
}

/**
 * Get upcoming matches (next N matches)
 */
export async function getUpcomingMatches(limit: number = 10): Promise<Match[]> {
  const now = new Date();
  const matches = await getMatches();

  return matches
    .filter((m) => new Date(m.dateTime) > now)
    .sort(
      (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    )
    .slice(0, limit);
}

/**
 * Get recent matches (last N matches)
 */
export async function getRecentMatches(limit: number = 10): Promise<Match[]> {
  const now = new Date();
  const matches = await getMatches();

  return matches
    .filter((m) => new Date(m.dateTime) <= now && m.status === "Final")
    .sort(
      (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
    )
    .slice(0, limit);
}

/**
 * Get matches by team/club
 */
export async function getMatchesByClub(clubName: string): Promise<Match[]> {
  const matches = await getMatches();
  return matches.filter(
    (m) => m.homeTeam.name === clubName || m.awayTeam.name === clubName
  );
}
