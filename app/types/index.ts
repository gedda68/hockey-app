// Match Types
export interface Match {
  matchId: string;
  division: string;
  round: string;
  status: string;
  homeTeam: string;
  homeTeamIcon: string;
  awayTeam: string;
  awayTeamIcon: string;
  homeScore?: number;
  awayScore?: number;
  homeShootOutScore?: number;
  awayShootOutScore?: number;
  dateTime: string;
  location: string;
  isFeatureGame?: boolean;
}

// Standings Types
export interface Team {
  pos: number;
  club: string;
  icon: string;
  pts: number;
  played?: number;
  won?: number;
  drawn?: number;
  lost?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  goalDifference?: number;
}

export interface Division {
  divisionName: string;
  teams: Team[];
}

// Umpire Types
export interface Umpire {
  umpireType: string;
  umpireId: string;
  dateAllocated: string;
  dateAccepted: string | null;
  dateUpdated: string;
}

export interface UmpireDetails {
  umpireName: string;
  umpireNumber: string;
  club: string;
  gender?: string;
  dateOfBirth?: string;
  umpireLevel: string;
  isActive: boolean;
}

export interface UmpireAllocation {
  matchId: string;
  umpires: Umpire[];
}

// Match Stats Types
export interface Goal {
  team: string;
  playerNum: string;
  playerName: string;
  time: number;
  type: string;
}

export interface Card {
  team: string;
  playerNum: string;
  playerName: string;
  time: number;
  type: string;
}

export interface ShootoutAttempt {
  playerNum: string;
  playerName: string;
  type: string;
  result: "Goal" | "Miss";
}

export interface MatchStats {
  goals?: Goal[];
  cards?: Card[];
  shootout?: {
    home: ShootoutAttempt[];
    away: ShootoutAttempt[];
  } | null;
}

export interface TimelineEvent {
  team: string;
  playerNum: string;
  playerName: string;
  time: number;
  type: "GOAL" | "CARD";
  cardType?: string;
  goalType?: string;
}

// Season Types
export interface Season {
  year: number;
  isCurrent: boolean;
}

// Filter Types
export type ViewType = "results" | "upcoming";
export type StatusType = "All" | "Live" | "Final" | "Scheduled";
