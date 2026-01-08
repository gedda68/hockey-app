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
 * Get standings for a specific division
 */
export async function getDivisionStandings(
  divisionName: string
): Promise<Division | null> {
  const data = await getStandingsData();
  return data.divisions.find((d) => d.divisionName === divisionName) || null;
}

/**
 * Get division names only
 */
export async function getDivisionNames(): Promise<string[]> {
  const divisions = await getAllDivisions();
  return divisions.map((d) => d.divisionName);
}

/**
 * Get top N teams from a division
 */
export async function getTopTeams(
  divisionName: string,
  limit: number = 5
): Promise<Team[]> {
  const division = await getDivisionStandings(divisionName);
  if (!division) return [];

  return division.teams.sort((a, b) => a.pos - b.pos).slice(0, limit);
}

/**
 * Get team by club name from a division
 */
export async function getTeamByClub(
  divisionName: string,
  clubName: string
): Promise<Team | null> {
  const division = await getDivisionStandings(divisionName);
  if (!division) return null;

  return division.teams.find((t) => t.club === clubName) || null;
}

/**
 * Get team position in division
 */
export async function getTeamPosition(
  divisionName: string,
  clubName: string
): Promise<number | null> {
  const team = await getTeamByClub(divisionName, clubName);
  return team?.pos || null;
}

/**
 * Sort division standings by a specific field
 */
export async function sortStandings(
  divisionName: string,
  sortBy: "pos" | "pts" | "played" | "goalDifference" = "pos",
  order: "asc" | "desc" = "asc"
): Promise<Team[]> {
  const division = await getDivisionStandings(divisionName);
  if (!division) return [];

  const teams = [...division.teams];
  teams.sort((a, b) => {
    const aValue = a[sortBy] || 0;
    const bValue = b[sortBy] || 0;
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
  count: number = 3
): Promise<Team[]> {
  const division = await getDivisionStandings(divisionName);
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
export async function getStandingsStats(divisionName: string) {
  const division = await getDivisionStandings(divisionName);
  if (!division || !division.teams.length) return null;

  const teams = division.teams;
  const totalGoals = teams.reduce((sum, t) => sum + (t.goalsFor || 0), 0);
  const avgGoalsPerTeam = totalGoals / teams.length;
  const highestScorer = teams.reduce((max, t) =>
    (t.goalsFor || 0) > (max.goalsFor || 0) ? t : max
  );
  const bestDefense = teams.reduce((min, t) =>
    (t.goalsAgainst || 0) < (min.goalsAgainst || 0) ? t : min
  );

  return {
    totalTeams: teams.length,
    totalGoals,
    avgGoalsPerTeam: Math.round(avgGoalsPerTeam * 10) / 10,
    highestScorer: {
      club: highestScorer.club,
      goals: highestScorer.goalsFor,
    },
    bestDefense: {
      club: bestDefense.club,
      goalsAgainst: bestDefense.goalsAgainst,
    },
  };
}
