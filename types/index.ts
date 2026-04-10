// Centralized application types for the Hockey App.
// Replace scattered partial types with a single source of truth.
// Keep this file focused on data shapes used across the app.

export type ViewType = "results" | "upcoming";
export type StatusType = "All" | "Live" | "Final" | "Scheduled";

/** Umpire row stored on `league_fixtures.umpires` (aligned with demo JSON shape). */
export interface FixtureUmpireSlot {
  umpireType: string;
  umpireId: string;
  qualificationTier?: string | null;
  allocationStatus?: "assigned" | "accepted" | "declined";
  dateAllocated?: string;
  dateAccepted?: string | null;
  dateDeclined?: string | null;
  dateNotified?: string | null;
  dateUpdated?: string;
}

/** Stored on `league_fixtures.matchEvents` (E6). */
export type FixtureMatchEventKind =
  | "goal"
  | "green_card"
  | "yellow_card"
  | "red_card";

export interface FixtureMatchEventPublic {
  eventId: string;
  kind: FixtureMatchEventKind;
  teamId: string;
  memberId: string;
  assistMemberId?: string | null;
  period?: number | null;
  minute?: number | null;
  notes?: string | null;
}

// Match Types
export interface Match {
  matchId: string;
  /** Canonical competition context for filtering (E2–E4). */
  seasonCompetitionId?: string;
  /** Maps to `data/umpires/umpire-allocations.json` matchId for migration / demos. */
  legacyMatchId?: string;
  /** When set, overrides legacy JSON for this fixture’s umpire row in the UI map. */
  fixtureUmpires?: FixtureUmpireSlot[];
  division: string;
  round: string | number;
  status: StatusType | string;
  homeTeam: string;
  homeTeamIcon?: string;
  awayTeam: string;
  awayTeamIcon?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  homeShootOutScore?: number | null;
  awayShootOutScore?: number | null;
  dateTime: string; // ISO string
  location?: string;
  isFeatureGame?: boolean;
  venueId?: string;
  notes?: string;
  /** Player-attributed events when the fixture result is public (E6). */
  matchEvents?: FixtureMatchEventPublic[];
}

// Standings / Team Types
export interface Team {
  pos?: number;
  club: string;
  icon?: string;
  /** Club brand colours — enriched from the clubs collection at load time */
  primaryColor?: string;
  secondaryColor?: string;
  pts: number;
  // prefer canonical names; keep legacy aliases optional for compatibility
  played?: number; // canonical
  p?: number; // legacy alias
  won?: number;
  w?: number;
  drawn?: number;
  d?: number;
  lost?: number;
  l?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  gd?: number; // goal difference numeric shorthand
  goalDifference?: number; // verbose alternative
}

export interface Division {
  divisionName: string;
  year?: string | number;
  slug?: string;
  teams: Team[];
}

// Umpire Types
export interface Umpire {
  umpireType: string;
  umpireId: string;
  dateAllocated: string; // ISO
  dateAccepted: string | null;
  dateUpdated?: string;
}

export interface UmpireDetails {
  umpireName: string;
  umpireNumber: string;
  club: string;
  gender?: "male" | "female" | "other";
  dateOfBirth?: string;
  umpireLevel?: string;
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
  time: number; // minute or seconds depending on source
  type?: string; // "field", "penalty", etc.
  goalType?: string;
  assistBy?: string | null;
}

export interface Card {
  team: string;
  playerNum: string;
  playerName: string;
  time: number;
  type: string; // "yellow", "red" or reason
  cardType?: string;
}

export interface ShootoutAttempt {
  playerNum: string;
  playerName: string;
  type?: string; // e.g., "penalty", "stroke"
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
  playerNum?: string;
  playerName?: string;
  time: number;
  type: "GOAL" | "CARD" | string;
  cardType?: string;
  goalType?: string;
  details?: string;
}

// Season Types
export interface Season {
  year: number;
  isCurrent: boolean;
}

// Player / Club types
export interface PlayerClubHistoryItem {
  clubId?: string;
  clubName: string;
  startDate?: string;
  endDate?: string | null;
  position?: string;
}

export interface EmergencyContact {
  name: string;
  relationship?: string;
  phone: string;
}

export interface PlayerEntity {
  _id?: string;
  playerId: string;
  userId?: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  currentClubId?: string;
  clubHistory?: PlayerClubHistoryItem[];
  email?: string;
  phone?: string;
  emergencyContact?: EmergencyContact;
  position?: string; // Forward, Midfield, Defence, Goalkeeper
  preferredFoot?: "left" | "right" | "both";
  jerseyNumber?: number;
  nominations?: Array<{
    ageGroup?: string;
    season?: string | number;
    team?: string;
  }>;
  isActive?: boolean;
  status?: {
    active: boolean;
    reason?: string;
    updatedAt?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

// Clubs
export interface ClubContact {
  role?: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface Club {
  title: string;
  description?: string;
  icon?: string;
  iconSrc?: string;
  href?: string;
  slug?: string;
  address?: string;
  color?: string;
  bgColor?: string;
  about?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  contacts?: ClubContact[];
}
