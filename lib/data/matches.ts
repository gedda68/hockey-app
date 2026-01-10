/**
 * Matches Data Functions
 *
 * Load match data from /data folder
 */

// Direct import from /data folder
import matchesData from "../../data/matches/matches.json";

// Types
interface MatchRaw {
  matchId: string;
  round: string;
  division: string;
  dateTime: string;
  location: string;
  homeTeam: string;
  homeTeamIcon: string;
  awayTeam: string;
  awayTeamIcon: string;
  homeScore?: number;
  awayScore?: number;
  homeShootOutScore?: number;
  awayShootOutScore?: number;
  status: string;
  isFeatureGame?: boolean;
}

interface Match {
  matchId: string;
  season: number;
  round: number;
  division: string;
  dateTime: string;
  venue: string;
  homeTeam: {
    name: string;
    icon: string;
  };
  awayTeam: {
    name: string;
    icon: string;
  };
  score?: {
    home: number;
    away: number;
  };
  shootoutScore?: {
    home: number;
    away: number;
  };
  status: string;
  isFeatureGame?: boolean;
}

/**
 * Extract season from matchId (e.g., "2025BHL1001" -> 2025)
 */
function extractSeasonFromMatchId(matchId: string): number {
  const match = matchId.match(/^(\d{4})/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return new Date().getFullYear();
}

/**
 * Extract round number from round string
 */
function extractRoundNumber(roundStr: string): number {
  const match = roundStr.match(/\d+/);
  if (match) {
    return parseInt(match[0], 10);
  }
  // Handle special rounds
  if (roundStr.toLowerCase().includes("semi")) return 98;
  if (roundStr.toLowerCase().includes("final")) return 99;
  return 0;
}

/**
 * Transform raw match data to app format
 */
function transformMatch(raw: MatchRaw): Match {
  const season = extractSeasonFromMatchId(raw.matchId);
  const round = extractRoundNumber(raw.round);

  return {
    matchId: raw.matchId,
    season,
    round,
    division: raw.division,
    dateTime: raw.dateTime,
    venue: raw.location,
    homeTeam: {
      name: raw.homeTeam,
      icon: raw.homeTeamIcon,
    },
    awayTeam: {
      name: raw.awayTeam,
      icon: raw.awayTeamIcon,
    },
    score:
      raw.homeScore !== undefined && raw.awayScore !== undefined
        ? {
            home: raw.homeScore,
            away: raw.awayScore,
          }
        : undefined,
    shootoutScore:
      raw.homeShootOutScore !== undefined && raw.awayShootOutScore !== undefined
        ? {
            home: raw.homeShootOutScore,
            away: raw.awayShootOutScore,
          }
        : undefined,
    status: raw.status,
    isFeatureGame: raw.isFeatureGame,
  };
}

/**
 * Get all matches (upcoming + results)
 */
export async function getMatches(): Promise<Match[]> {
  try {
    const data = matchesData as any;

    const upcoming = data.upcoming || [];
    const results = data.results || [];
    const allMatches = [...upcoming, ...results];

    return allMatches.map((m: MatchRaw) => transformMatch(m));
  } catch (error) {
    console.error("Failed to load matches:", error);
    return [];
  }
}

/**
 * Get match by ID
 */
export async function getMatchById(
  matchId: string
): Promise<Match | undefined> {
  const matches = await getMatches();
  return matches.find((m) => m.matchId === matchId);
}

/**
 * Get matches by division
 */
export async function getMatchesByDivision(division: string): Promise<Match[]> {
  const matches = await getMatches();
  return matches.filter((m) => m.division === division);
}

/**
 * Get matches by season
 */
export async function getMatchesBySeason(season: number): Promise<Match[]> {
  const matches = await getMatches();
  return matches.filter((m) => m.season === season);
}

/**
 * Get matches by status
 */
export async function getMatchesByStatus(status: string): Promise<Match[]> {
  const matches = await getMatches();
  return matches.filter((m) => m.status === status);
}

/**
 * Get upcoming matches
 */
export async function getUpcomingMatches(): Promise<Match[]> {
  const matches = await getMatches();
  const now = new Date();

  return matches
    .filter((m) => {
      const matchDate = new Date(m.dateTime);
      return matchDate > now || m.status === "Scheduled";
    })
    .sort(
      (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    );
}

/**
 * Get completed matches (results)
 */
export async function getCompletedMatches(): Promise<Match[]> {
  const matches = await getMatches();

  return matches
    .filter((m) => m.status.toLowerCase().includes("final"))
    .sort(
      (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
    );
}

/**
 * Get feature games
 */
export async function getFeatureGames(): Promise<Match[]> {
  const matches = await getMatches();
  return matches.filter((m) => m.isFeatureGame);
}

/**
 * Get all divisions
 */
export async function getDivisions(): Promise<string[]> {
  const matches = await getMatches();
  const divisions = new Set(matches.map((m) => m.division));
  return Array.from(divisions).sort();
}

/**
 * Get all seasons
 */
export async function getSeasons(): Promise<number[]> {
  const matches = await getMatches();

  if (!Array.isArray(matches) || matches.length === 0) {
    // Return current year as fallback
    return [new Date().getFullYear()];
  }

  const seasons = new Set(matches.map((m) => m.season));
  const currentYear = new Date().getFullYear();

  return Array.from(seasons)
    .filter((s) => s && s >= 2020 && s <= currentYear + 1)
    .sort((a, b) => b - a);
}

/**
 * Get all rounds
 */
export async function getRounds(): Promise<string[]> {
  const matches = await getMatches();
  const rounds = new Set<number>();

  matches.forEach((m) => {
    if (m.round > 0 && m.round < 90) {
      rounds.add(m.round);
    }
  });

  return Array.from(rounds)
    .sort((a, b) => a - b)
    .map((r) => r.toString());
}

/**
 * Get current season
 */
export async function getCurrentSeason(): Promise<number> {
  const data = matchesData as any;

  if (data && data.seasons) {
    const current = data.seasons.find((s: any) => s.isCurrent);
    if (current) {
      return current.year;
    }
  }

  return new Date().getFullYear();
}

/**
 * Get matches for a team
 */
export async function getMatchesForTeam(teamName: string): Promise<Match[]> {
  const matches = await getMatches();

  return matches.filter(
    (m) => m.homeTeam.name === teamName || m.awayTeam.name === teamName
  );
}

/**
 * Get recent matches (last 10)
 */
export async function getRecentMatches(limit: number = 10): Promise<Match[]> {
  const matches = await getCompletedMatches();
  return matches.slice(0, limit);
}

/**
 * Filter matches by multiple criteria
 */
export async function filterMatches(filters: {
  division?: string;
  season?: number;
  round?: string;
  status?: string;
}): Promise<Match[]> {
  let matches = await getMatches();

  if (filters.division) {
    matches = matches.filter((m) => m.division === filters.division);
  }

  if (filters.season) {
    matches = matches.filter((m) => m.season === filters.season);
  }

  if (filters.round) {
    matches = matches.filter((m) => m.round.toString() === filters.round);
  }

  if (filters.status) {
    matches = matches.filter((m) => m.status === filters.status);
  }

  return matches;
}

/**
 * Get match stats data (placeholder - returns empty for now)
 */
export async function getMatchStatsData(): Promise<any> {
  // This would typically load from matchstats.json
  // For now, return empty object to prevent errors
  return {
    topScorers: [],
    topAssists: [],
    teamStats: [],
  };
}
