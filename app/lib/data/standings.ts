import { promises as fs } from "fs";
import path from "path";
import type { Division, Team } from "../../types";

interface StandingsData {
  lastUpdated: string;
  seasons: {
    [year: string]: {
      [divisionName: string]: {
        slug: string;
        teams: Team[];
      };
    };
  };
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
 * Get available years from standings
 */
export async function getStandingsYears(): Promise<string[]> {
  const data = await getStandingsData();
  return Object.keys(data.seasons).sort().reverse(); // Most recent first
}

/**
 * Get all division names across all years
 */
export async function getDivisionNames(): Promise<string[]> {
  const data = await getStandingsData();
  const divisionSet = new Set<string>();

  Object.values(data.seasons).forEach((yearData) => {
    Object.keys(yearData).forEach((divName) => divisionSet.add(divName));
  });

  return Array.from(divisionSet);
}

/**
 * Get standings for a specific division and year
 */
export async function getDivisionStandings(
  divisionName: string,
  year?: string
): Promise<Division | null> {
  const data = await getStandingsData();

  // If no year specified, get most recent year
  if (!year) {
    const years = await getStandingsYears();
    year = years[0];
  }

  // Check if year and division exist
  if (!data.seasons[year] || !data.seasons[year][divisionName]) {
    return null;
  }

  const divisionData = data.seasons[year][divisionName];

  return {
    divisionName,
    year,
    slug: divisionData.slug,
    teams: divisionData.teams,
  };
}

/**
 * Get all divisions for a specific year
 */
export async function getDivisionsByYear(year: string): Promise<Division[]> {
  const data = await getStandingsData();

  if (!data.seasons[year]) {
    return [];
  }

  const divisions: Division[] = [];
  const yearData = data.seasons[year];

  Object.entries(yearData).forEach(([divName, divData]) => {
    divisions.push({
      divisionName: divName,
      year,
      slug: divData.slug,
      teams: divData.teams,
    });
  });

  return divisions;
}

/**
 * Get all divisions with standings (across all years)
 */
export async function getAllDivisions(): Promise<Division[]> {
  const data = await getStandingsData();
  const divisions: Division[] = [];

  Object.entries(data.seasons).forEach(([year, yearData]) => {
    Object.entries(yearData).forEach(([divName, divData]) => {
      divisions.push({
        divisionName: divName,
        year,
        slug: divData.slug,
        teams: divData.teams,
      });
    });
  });

  return divisions;
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
