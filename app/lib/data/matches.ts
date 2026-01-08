import { promises as fs } from "fs";
import path from "path";
import type { Match, Season } from "../../types";

interface MatchesData {
  lastUpdated: string;
  seasons: Season[];
  upcoming: Match[];
  results: Match[];
}

/**
 * Get all matches data from JSON file
 */
export async function getMatchesData(): Promise<MatchesData> {
  const matchesPath = path.join(process.cwd(), "public/data/matches.json");
  const data = await fs.readFile(matchesPath, "utf8");
  return JSON.parse(data);
}

/**
 * Get upcoming matches
 */
export async function getUpcomingMatches(): Promise<Match[]> {
  const data = await getMatchesData();
  return data.upcoming || [];
}

/**
 * Get match results (past matches)
 */
export async function getMatchResults(): Promise<Match[]> {
  const data = await getMatchesData();
  return data.results || [];
}

/**
 * Get a single match by ID
 */
export async function getMatchById(matchId: string): Promise<Match | null> {
  const data = await getMatchesData();
  const allMatches = [...(data.upcoming || []), ...(data.results || [])];
  return allMatches.find((m) => m.matchId === matchId) || null;
}

/**
 * Get matches filtered by division
 */
export async function getMatchesByDivision(
  division: string,
  type: "upcoming" | "results" = "results"
): Promise<Match[]> {
  const matches =
    type === "upcoming" ? await getUpcomingMatches() : await getMatchResults();

  if (division === "All") return matches;
  return matches.filter((m) => m.division === division);
}

/**
 * Get matches filtered by round
 */
export async function getMatchesByRound(
  round: string,
  type: "upcoming" | "results" = "results"
): Promise<Match[]> {
  const matches =
    type === "upcoming" ? await getUpcomingMatches() : await getMatchResults();

  if (round === "All") return matches;
  return matches.filter((m) => m.round === round);
}

/**
 * Get matches filtered by status
 */
export async function getMatchesByStatus(
  status: string,
  type: "upcoming" | "results" = "results"
): Promise<Match[]> {
  const matches =
    type === "upcoming" ? await getUpcomingMatches() : await getMatchResults();

  if (status === "All") return matches;

  return matches.filter((match) => {
    if (status === "Live") {
      return (
        match.status?.toLowerCase().includes("live") ||
        match.status?.toLowerCase().includes("progress")
      );
    } else if (status === "Final") {
      return match.status?.toLowerCase().includes("final");
    } else if (status === "Scheduled") {
      return match.status === "Scheduled";
    }
    return match.status === status;
  });
}

/**
 * Get all unique divisions from matches
 */
export async function getDivisions(
  type: "upcoming" | "results" = "results"
): Promise<string[]> {
  const matches =
    type === "upcoming" ? await getUpcomingMatches() : await getMatchResults();

  const divisions = new Set(matches.map((m) => m.division).filter(Boolean));
  return ["All", ...Array.from(divisions)];
}

/**
 * Get all unique rounds from matches
 */
export async function getRounds(
  type: "upcoming" | "results" = "results"
): Promise<string[]> {
  const matches =
    type === "upcoming" ? await getUpcomingMatches() : await getMatchResults();

  const rounds = new Set(matches.map((m) => m.round).filter(Boolean));
  return ["All", ...Array.from(rounds)];
}

/**
 * Get available seasons
 */
export async function getSeasons(): Promise<Season[]> {
  const data = await getMatchesData();
  return data.seasons || [];
}

/**
 * Get current season
 */
export async function getCurrentSeason(): Promise<Season | null> {
  const seasons = await getSeasons();
  return seasons.find((s) => s.isCurrent) || null;
}

/**
 * Filter matches with multiple criteria
 */
export async function filterMatches(filters: {
  type?: "upcoming" | "results";
  division?: string;
  round?: string;
  status?: string;
}): Promise<Match[]> {
  const { type = "results", division, round, status } = filters;

  let matches =
    type === "upcoming" ? await getUpcomingMatches() : await getMatchResults();

  // Apply division filter
  if (division && division !== "All") {
    matches = matches.filter((m) => m.division === division);
  }

  // Apply round filter
  if (round && round !== "All") {
    matches = matches.filter((m) => m.round === round);
  }

  // Apply status filter
  if (status && status !== "All") {
    matches = matches.filter((match) => {
      if (status === "Live") {
        return (
          match.status?.toLowerCase().includes("live") ||
          match.status?.toLowerCase().includes("progress")
        );
      } else if (status === "Final") {
        return match.status?.toLowerCase().includes("final");
      } else if (status === "Scheduled") {
        return match.status === "Scheduled";
      }
      return match.status === status;
    });
  }

  return matches;
}
