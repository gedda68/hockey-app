// components/admin/teams/types/team.types.ts
// Complete TypeScript interfaces for Teams Management

export interface Coach {
  id: string;
  name: string;
  role: "head_coach" | "assistant_coach" | "manager" | "trainer";
  email?: string;
  phone?: string;
  linkedMemberId?: string;
  certifications?: string[];
  assignedDate: string;
}

export interface TeamPlayer {
  playerId: string;
  jerseyNumber?: string;
  position?: string;
  joinedDate: string;
  status: "active" | "injured" | "suspended" | "inactive";
  isCaptain?: boolean;
  isViceCaptain?: boolean;
}

export interface TrainingSchedule {
  id: string;
  dayOfWeek: string; // "Monday", "Tuesday", etc.
  startTime: string; // "18:00"
  endTime: string; // "19:30"
  venue: string;
  notes?: string;
}

export interface Team {
  // Identity
  teamId: string;
  name: string; // "U12 Girls Gold"
  displayName?: string; // "BHA U12 Girls Gold"
  clubId: string;
  clubName?: string; // Populated from club lookup

  // Classification
  division: string; // "U12", "U14", "U16", "U18", "Senior"
  gender: "male" | "female" | "mixed";
  ageGroup: string; // "Under 12", "Under 14", "Open"
  season: string; // "2026", "2026-2027"
  grade?: string; // "A", "B", "C", "Gold", "Silver"

  // Colors & Branding
  colors: {
    primary: string; // "#003366"
    secondary: string; // "#FFD700"
    tertiary?: string;
  };
  logo?: string; // URL to team logo

  // People
  coaches: Coach[];
  players: TeamPlayer[];

  // Venues
  homeGround: string;
  homeGroundAddress?: string;
  trainingVenue?: string;
  trainingSchedule: TrainingSchedule[];

  // Competition
  competitionId?: string;
  competitionName?: string;

  // Status
  active: boolean;
  registrationStatus: "pending" | "registered" | "withdrawn";

  // Stats (optional)
  stats?: {
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
  };

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  lastUpdatedBy?: string;
}

export interface TeamFormData extends Omit<
  Team,
  "teamId" | "createdAt" | "updatedAt"
> {
  teamId?: string;
}

// Division options
export const DIVISIONS = [
  "U6",
  "U8",
  "U10",
  "U12",
  "U14",
  "U16",
  "U18",
  "U21",
  "Senior",
  "Masters",
  "Veterans",
] as const;

// Gender options
export const GENDERS = ["male", "female", "mixed"] as const;

// Grade options
export const GRADES = [
  "A",
  "B",
  "C",
  "D",
  "Gold",
  "Silver",
  "Bronze",
  "Premier",
  "Division 1",
  "Division 2",
  "Division 3",
] as const;

// Coach role options
export const COACH_ROLES = [
  "head_coach",
  "assistant_coach",
  "manager",
  "trainer",
] as const;

// Coach role labels
export const COACH_ROLE_LABELS: Record<(typeof COACH_ROLES)[number], string> = {
  head_coach: "Head Coach",
  assistant_coach: "Assistant Coach",
  manager: "Team Manager",
  trainer: "Trainer",
};

// Player status options
export const PLAYER_STATUSES = [
  "active",
  "injured",
  "suspended",
  "inactive",
] as const;

// Days of week
export const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

// Registration status
export const REGISTRATION_STATUSES = [
  "pending",
  "registered",
  "withdrawn",
] as const;
