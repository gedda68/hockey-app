import type { Db } from "mongodb";
import type {
  CoachAnalyticsSummary,
  CoachTeamAnalyticsRow,
  MemberPlayingHistoryRow,
  PlayingHistorySummary,
  PlayingHistoryEventType,
} from "@/types/memberStats";

const HISTORY = "member_playing_history";
const COACH_ANALYTICS = "coach_team_analytics";

export async function listPlayingHistoryForMember(
  db: Db,
  memberId: string,
  limit = 200,
): Promise<MemberPlayingHistoryRow[]> {
  const rows = await db
    .collection(HISTORY)
    .find({ memberId })
    .sort({ date: -1 })
    .limit(limit)
    .toArray();
  return rows as unknown as MemberPlayingHistoryRow[];
}

export function summarizePlayingHistory(
  rows: MemberPlayingHistoryRow[],
): PlayingHistorySummary {
  const bySeason: PlayingHistorySummary["bySeason"] = {};
  const byEventType: Partial<Record<PlayingHistoryEventType, number>> = {};

  for (const r of rows) {
    byEventType[r.eventType] = (byEventType[r.eventType] ?? 0) + 1;
    const sy = r.seasonYear || "unknown";
    if (!bySeason[sy]) {
      bySeason[sy] = {
        games: 0,
        goals: 0,
        assists: 0,
        minutesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
      };
    }
    const b = bySeason[sy];
    if (r.eventType === "fixture" || r.eventType === "friendly" || r.eventType === "representative") {
      b.games += 1;
    }
    b.goals += r.goals ?? 0;
    b.assists += r.assists ?? 0;
    b.minutesPlayed += r.minutesPlayed ?? 0;
    if (r.result === "win") b.wins += 1;
    if (r.result === "loss") b.losses += 1;
    if (r.result === "draw") b.draws += 1;
  }

  return {
    totalEvents: rows.length,
    bySeason,
    byEventType,
    recent: rows.slice(0, 15),
  };
}

export async function listCoachAnalyticsForStaff(
  db: Db,
  coachUserId: string,
  limit = 50,
): Promise<CoachTeamAnalyticsRow[]> {
  const rows = await db
    .collection(COACH_ANALYTICS)
    .find({ coachUserId })
    .sort({ seasonYear: -1, updatedAt: -1 })
    .limit(limit)
    .toArray();
  return rows as unknown as CoachTeamAnalyticsRow[];
}

export async function listCoachAnalyticsForMemberCoach(
  db: Db,
  coachMemberId: string,
  limit = 50,
): Promise<CoachTeamAnalyticsRow[]> {
  const rows = await db
    .collection(COACH_ANALYTICS)
    .find({ coachMemberId })
    .sort({ seasonYear: -1, updatedAt: -1 })
    .limit(limit)
    .toArray();
  return rows as unknown as CoachTeamAnalyticsRow[];
}

export function summarizeCoachAnalytics(
  rows: CoachTeamAnalyticsRow[],
): CoachAnalyticsSummary["totals"] {
  return rows.reduce(
    (acc, r) => ({
      gamesCoached: acc.gamesCoached + (r.gamesCoached ?? 0),
      wins: acc.wins + (r.wins ?? 0),
      losses: acc.losses + (r.losses ?? 0),
      draws: acc.draws + (r.draws ?? 0),
      goalsFor: acc.goalsFor + (r.goalsFor ?? 0),
      goalsAgainst: acc.goalsAgainst + (r.goalsAgainst ?? 0),
      trainingSessions: acc.trainingSessions + (r.trainingSessions ?? 0),
    }),
    {
      gamesCoached: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      trainingSessions: 0,
    },
  );
}
