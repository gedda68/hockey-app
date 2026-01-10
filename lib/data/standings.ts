/**
 * Standings Data Functions
 *
 * Load standings data from /data folder
 */

// Direct import from /data folder
import standingsData from "../../data/standings/standings.json";

// Types
interface StandingsTeam {
  pos: number;
  club: string;
  icon: string;
  p: number; // played
  w: number; // wins
  d: number; // draws
  l: number; // losses
  gd: number; // goal difference
  pts: number; // points
}

interface Division {
  divisionName: string;
  slug: string;
  teams: StandingsTeam[];
}

/**
 * Get all available years
 */
export async function getStandingsYears(): Promise<string[]> {
  try {
    const data = standingsData as any;
    const seasons = data.seasons || {};
    return Object.keys(seasons).sort((a, b) => parseInt(b) - parseInt(a));
  } catch (error) {
    console.error("Failed to load standings years:", error);
    return [];
  }
}

/**
 * Get divisions for a specific year
 */
export async function getDivisionsByYear(year: string): Promise<Division[]> {
  try {
    const data = standingsData as any;
    const yearData = data.seasons?.[year];

    if (!yearData) {
      return [];
    }

    const divisions: Division[] = [];

    for (const [divisionName, divisionData] of Object.entries(yearData)) {
      const division = divisionData as any;
      divisions.push({
        divisionName,
        slug: division.slug || divisionName.toLowerCase().replace(/\s+/g, "-"),
        teams: division.teams || [],
      });
    }

    return divisions;
  } catch (error) {
    console.error("Failed to load divisions:", error);
    return [];
  }
}

/**
 * Get standings for a specific division and year
 */
export async function getDivisionStandings(
  year: string,
  divisionName: string
): Promise<Division | null> {
  try {
    const divisions = await getDivisionsByYear(year);
    return divisions.find((d) => d.divisionName === divisionName) || null;
  } catch (error) {
    console.error("Failed to load division standings:", error);
    return null;
  }
}

/**
 * Get all divisions across all years
 */
export async function getAllDivisions(): Promise<string[]> {
  try {
    const data = standingsData as any;
    const seasons = data.seasons || {};
    const divisionSet = new Set<string>();

    for (const yearData of Object.values(seasons)) {
      const year = yearData as any;
      for (const divisionName of Object.keys(year)) {
        divisionSet.add(divisionName);
      }
    }

    return Array.from(divisionSet).sort();
  } catch (error) {
    console.error("Failed to load all divisions:", error);
    return [];
  }
}

/**
 * Get top teams across all divisions
 */
export async function getTopTeams(limit: number = 5): Promise<StandingsTeam[]> {
  try {
    const years = await getStandingsYears();
    if (years.length === 0) return [];

    const latestYear = years[0];
    const divisions = await getDivisionsByYear(latestYear);

    const allTeams: StandingsTeam[] = [];
    divisions.forEach((division) => {
      allTeams.push(...division.teams);
    });

    // Sort by points, then goal difference
    allTeams.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      return b.gd - a.gd;
    });

    return allTeams.slice(0, limit);
  } catch (error) {
    console.error("Failed to load top teams:", error);
    return [];
  }
}

/**
 * Get team's standings across all divisions
 */
export async function getTeamStandings(teamName: string): Promise<
  {
    year: string;
    division: string;
    standing: StandingsTeam;
  }[]
> {
  try {
    const data = standingsData as any;
    const seasons = data.seasons || {};
    const results: {
      year: string;
      division: string;
      standing: StandingsTeam;
    }[] = [];

    for (const [year, yearData] of Object.entries(seasons)) {
      const divisions = yearData as any;
      for (const [divisionName, divisionData] of Object.entries(divisions)) {
        const division = divisionData as any;
        const team = division.teams?.find(
          (t: StandingsTeam) => t.club === teamName
        );

        if (team) {
          results.push({
            year,
            division: divisionName,
            standing: team,
          });
        }
      }
    }

    return results.sort((a, b) => parseInt(b.year) - parseInt(a.year));
  } catch (error) {
    console.error("Failed to load team standings:", error);
    return [];
  }
}

/**
 * Get current season standings
 */
export async function getCurrentSeasonStandings(): Promise<Division[]> {
  try {
    const years = await getStandingsYears();
    if (years.length === 0) return [];

    return getDivisionsByYear(years[0]);
  } catch (error) {
    console.error("Failed to load current season standings:", error);
    return [];
  }
}
