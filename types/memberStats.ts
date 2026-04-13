/**
 * Deep stats collections (MongoDB):
 *   member_playing_history — per-appearance / per-event ledger for a member
 *   coach_team_analytics    — season rollups per coach + team
 *
 * Suggested indexes:
 *   member_playing_history: { memberId: 1, seasonYear: -1, date: -1 }
 *   coach_team_analytics:   { coachUserId: 1, seasonYear: -1 }
 *   coach_team_analytics:   { coachMemberId: 1, seasonYear: -1 }
 */

export type PlayingHistoryEventType =
  | "fixture"
  | "friendly"
  | "training"
  | "representative"
  | "other";

export type MatchResult = "win" | "loss" | "draw" | "unknown";

export interface MemberPlayingHistoryRow {
  historyId: string;
  memberId: string;
  clubId?: string;
  teamId?: string;
  seasonYear: string;
  eventType: PlayingHistoryEventType;
  /** ISO date */
  date: string;
  competitionId?: string;
  fixtureId?: string;
  opponentName?: string;
  result?: MatchResult;
  goals?: number;
  assists?: number;
  greenCards?: number;
  yellowCards?: number;
  redCards?: number;
  minutesPlayed?: number;
  notes?: string;
  source?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CoachTeamAnalyticsRow {
  analyticsId: string;
  coachUserId?: string;
  coachMemberId?: string;
  teamId: string;
  clubId: string;
  seasonYear: string;
  gamesCoached: number;
  wins: number;
  losses: number;
  draws: number;
  goalsFor?: number;
  goalsAgainst?: number;
  trainingSessions?: number;
  rosterSizeAvg?: number;
  updatedAt: Date;
}

export interface PlayingHistorySummary {
  totalEvents: number;
  bySeason: Record<
    string,
    {
      games: number;
      goals: number;
      assists: number;
      minutesPlayed: number;
      wins: number;
      losses: number;
      draws: number;
    }
  >;
  byEventType: Partial<Record<PlayingHistoryEventType, number>>;
  recent: MemberPlayingHistoryRow[];
}

export interface CoachAnalyticsSummary {
  rows: CoachTeamAnalyticsRow[];
  totals: {
    gamesCoached: number;
    wins: number;
    losses: number;
    draws: number;
    goalsFor: number;
    goalsAgainst: number;
    trainingSessions: number;
  };
}
