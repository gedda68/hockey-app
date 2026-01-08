import { promises as fs } from "fs";
import path from "path";
import type { MatchStats, Goal, Card } from "../../types";

interface StatsData {
  stats: Record<string, MatchStats>;
}

/**
 * Get all match stats from JSON file
 */
export async function getMatchStatsData(): Promise<Record<string, MatchStats>> {
  const statsPath = path.join(process.cwd(), "data/matchstats.json");
  const data = await fs.readFile(statsPath, "utf8");
  const parsed: StatsData = JSON.parse(data);
  return parsed.stats || {};
}

/**
 * Get stats for a specific match
 */
export async function getStatsForMatch(
  matchId: string
): Promise<MatchStats | null> {
  const allStats = await getMatchStatsData();
  return allStats[matchId] || null;
}

/**
 * Get goals for a specific match
 */
export async function getGoalsForMatch(matchId: string): Promise<Goal[]> {
  const stats = await getStatsForMatch(matchId);
  return stats?.goals || [];
}

/**
 * Get cards for a specific match
 */
export async function getCardsForMatch(matchId: string): Promise<Card[]> {
  const stats = await getStatsForMatch(matchId);
  return stats?.cards || [];
}

/**
 * Get shootout data for a specific match
 */
export async function getShootoutForMatch(matchId: string) {
  const stats = await getStatsForMatch(matchId);
  return stats?.shootout || null;
}

/**
 * Get goals by team
 */
export async function getGoalsByTeam(
  matchId: string,
  teamName: string
): Promise<Goal[]> {
  const goals = await getGoalsForMatch(matchId);
  return goals.filter((g) => g.team === teamName);
}

/**
 * Get cards by team
 */
export async function getCardsByTeam(
  matchId: string,
  teamName: string
): Promise<Card[]> {
  const cards = await getCardsForMatch(matchId);
  return cards.filter((c) => c.team === teamName);
}

/**
 * Get goals by player
 */
export async function getGoalsByPlayer(
  matchId: string,
  playerName: string
): Promise<Goal[]> {
  const goals = await getGoalsForMatch(matchId);
  return goals.filter((g) => g.playerName === playerName);
}

/**
 * Get timeline events (goals + cards) for a match
 */
export async function getTimelineEvents(matchId: string) {
  const stats = await getStatsForMatch(matchId);
  if (!stats) return [];

  const goalEvents = (stats.goals || []).map((g) => ({
    ...g,
    eventType: "GOAL" as const,
    minute: g.time,
  }));

  const cardEvents = (stats.cards || []).map((c) => ({
    ...c,
    eventType: "CARD" as const,
    minute: c.time,
  }));

  return [...goalEvents, ...cardEvents].sort((a, b) => a.minute - b.minute);
}

/**
 * Get total goals for a team across all matches
 */
export async function getTotalGoalsByTeam(teamName: string): Promise<number> {
  const allStats = await getMatchStatsData();
  let totalGoals = 0;

  Object.values(allStats).forEach((matchStats) => {
    const teamGoals =
      matchStats.goals?.filter((g) => g.team === teamName) || [];
    totalGoals += teamGoals.length;
  });

  return totalGoals;
}

/**
 * Get top scorers across all matches
 */
export async function getTopScorers(limit: number = 10) {
  const allStats = await getMatchStatsData();
  const scorerMap = new Map<
    string,
    { player: string; goals: number; team: string }
  >();

  Object.values(allStats).forEach((matchStats) => {
    matchStats.goals?.forEach((goal) => {
      const key = `${goal.playerName}-${goal.team}`;
      const existing = scorerMap.get(key);

      if (existing) {
        existing.goals++;
      } else {
        scorerMap.set(key, {
          player: goal.playerName,
          goals: 1,
          team: goal.team,
        });
      }
    });
  });

  return Array.from(scorerMap.values())
    .sort((a, b) => b.goals - a.goals)
    .slice(0, limit);
}

/**
 * Get card statistics
 */
export async function getCardStats() {
  const allStats = await getMatchStatsData();
  const cardCounts = { green: 0, yellow: 0, red: 0 };

  Object.values(allStats).forEach((matchStats) => {
    matchStats.cards?.forEach((card) => {
      const cardType = card.type.toLowerCase();
      if (cardType === "green") cardCounts.green++;
      else if (cardType === "yellow") cardCounts.yellow++;
      else if (cardType === "red") cardCounts.red++;
    });
  });

  return cardCounts;
}

/**
 * Get matches with shootouts
 */
export async function getShootoutMatches(): Promise<string[]> {
  const allStats = await getMatchStatsData();

  return Object.entries(allStats)
    .filter(([_, stats]) => stats.shootout !== null)
    .map(([matchId]) => matchId);
}

/**
 * Calculate goal scoring patterns
 */
export async function getGoalScoringPatterns() {
  const allStats = await getMatchStatsData();
  const timeRanges = {
    "0-15": 0,
    "16-30": 0,
    "31-45": 0,
    "46-60": 0,
    "60+": 0,
  };

  Object.values(allStats).forEach((matchStats) => {
    matchStats.goals?.forEach((goal) => {
      if (goal.time <= 15) timeRanges["0-15"]++;
      else if (goal.time <= 30) timeRanges["16-30"]++;
      else if (goal.time <= 45) timeRanges["31-45"]++;
      else if (goal.time <= 60) timeRanges["46-60"]++;
      else timeRanges["60+"]++;
    });
  });

  return timeRanges;
}
