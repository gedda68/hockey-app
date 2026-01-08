import { promises as fs } from "fs";
import path from "path";
import type { Division, Team } from "../../types";

interface StandingsData {
  divisions: Division[];
}

/**
 * Get all standings data from JSON file
 */
export async function getStandingsData(): Promise<StandingsData> {
  const standingsPath = path.join(process.cwd(), "public/data/standings.json");
  const data = await fs.readFile(standingsPath, "utf8");
  return JSON.parse(data);
}

/**
 * Get all divisions with standings
 */
export async function getAllDivisions(): Promise<Division[]> {
  const data = await getStandingsData();
  return data.divisions || [];
}

/**
 * Get standings for a specific division and year
 */
export async function getDivisionStandings(
  divisionName: string,
  year?: string
): Promise<Division | null> {
  const data = await getStandingsData();

  // Filter by division name
  let divisions = data.divisions.filter((d) => d.divisionName === divisionName);

  // If year specified, filter by year
  if (year) {
    divisions = divisions.filter((d) => d.year === year);
  }

  // Return the most recent if multiple found, or the first match
  return divisions[0] || null;
}

/**
 * Get all divisions for a specific year
 */
export async function getDivisionsByYear(year: string): Promise<Division[]> {
  const data = await getStandingsData();
  return data.divisions.filter((d) => d.year === year);
}

/**
 * Get division names only
 */
export async function getDivisionNames(): Promise<string[]> {
  const divisions = await getAllDivisions();
  const uniqueNames = new Set(divisions.map((d) => d.divisionName));
  return Array.from(uniqueNames);
}

/**
 * Get available years from standings
 */
export async function getStandingsYears(): Promise<string[]> {
  const divisions = await getAllDivisions();
  const years = new Set(divisions.map((d) => d.year).filter(Boolean));
  return Array.from(years).sort().reverse(); // Most recent first
}

/**
 * Get top N teams from a division
 */
export async function getTopTeams(
  divisionName: string,
  year?: string,
  limit: number = 5
): Promise<Team[]> {
  const division = await getDivisionStandings(divisionName, year);
  if (!division) return [];

  return division.teams.sort((a, b) => a.pos - b.pos).slice(0, limit);
}

/**
 * Get team by club name from a division
 */
export async function getTeamByClub(
  divisionName: string,
  clubName: string,
  year?: string
): Promise<Team | null> {
  const division = await getDivisionStandings(divisionName, year);
  if (!division) return null;

  return division.teams.find((t) => t.club === clubName) || null;
}

/**
 * Get team position in division
 */
export async function getTeamPosition(
  divisionName: string,
  clubName: string,
  year?: string
): Promise<number | null> {
  const team = await getTeamByClub(divisionName, clubName, year);
  return team?.pos || null;
}

/**
 * Sort division standings by a specific field
 */
export async function sortStandings(
  divisionName: string,
  sortBy: "pos" | "pts" | "p" | "gd" = "pos",
  order: "asc" | "desc" = "asc",
  year?: string
): Promise<Team[]> {
  const division = await getDivisionStandings(divisionName, year);
  if (!division) return [];

  const teams = [...division.teams];
  teams.sort((a, b) => {
    const aValue = (a[sortBy] as number) || 0;
    const bValue = (b[sortBy] as number) || 0;
    return order === "asc" ? aValue - bValue : bValue - aValue;
  });

  return teams;
}

/**
 * Get teams in promotion/relegation zones
 */
export async function getZoneTeams(
  divisionName: string,
  zone: "promotion" | "relegation",
  count: number = 3,
  year?: string
): Promise<Team[]> {
  const division = await getDivisionStandings(divisionName, year);
  if (!division) return [];

  const sortedTeams = division.teams.sort((a, b) => a.pos - b.pos);

  if (zone === "promotion") {
    return sortedTeams.slice(0, count);
  } else {
    return sortedTeams.slice(-count);
  }
}

/**
 * Calculate standings statistics
 */
export async function getStandingsStats(divisionName: string, year?: string) {
  const division = await getDivisionStandings(divisionName, year);
  if (!division || !division.teams.length) return null;

  const teams = division.teams;

  // Calculate total goals (using gd and working backwards)
  const totalPlayed = teams.reduce((sum, t) => sum + (t.p || 0), 0);
  const avgPointsPerGame =
    teams.reduce((sum, t) => sum + (t.pts || 0), 0) / totalPlayed || 0;

  const topTeam = teams.reduce((max, t) =>
    (t.pts || 0) > (max.pts || 0) ? t : max
  );

  const bestGoalDiff = teams.reduce((max, t) =>
    (t.gd || 0) > (max.gd || 0) ? t : max
  );

  return {
    totalTeams: teams.length,
    totalMatches: totalPlayed,
    avgPointsPerGame: Math.round(avgPointsPerGame * 10) / 10,
    topTeam: {
      club: topTeam.club,
      points: topTeam.pts,
    },
    bestGoalDiff: {
      club: bestGoalDiff.club,
      goalDiff: bestGoalDiff.gd,
    },
  };
}
