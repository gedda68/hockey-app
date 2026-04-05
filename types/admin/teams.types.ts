// app/admin/teams/types/teams.types.ts
// Updated type definitions - FIXED GENDERS

export type UnavailableType = "injury" | "personal" | "holiday" | "work" | "other";

export interface Player {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  number?: string;
  playerId?: string;
  dateOfBirth?: string;
  age?: number;
  eligible?: boolean;
  reason?: string; // Reason for ineligibility (legacy)
  // Structured unavailability
  unavailableType?: UnavailableType;
  unavailableFrom?: string;   // ISO date — when they became unavailable
  unavailableWeeks?: number;  // Total weeks out
  unavailableUntil?: string;  // ISO date — calculated: from + weeks
  unavailableNote?: string;   // Additional note (e.g. "torn hamstring")
}

export interface Staff {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  memberId?: string;
}

export interface Team {
  name: string;
  players: Player[];
  coach?: Staff;
  assistantCoach?: Staff;
  manager?: Staff;
}

export interface TeamRoster {
  id?: string;
  clubId: string;
  clubName?: string;
  clubColors?: {
    primary: string;
    secondary: string;
    tertiary?: string;
  };
  clubLogo?: string;
  category: "junior" | "senior" | "masters" | "social";
  division: string;
  gender: "male" | "female" | "mixed"; // UPDATED: male, female, mixed
  season: string;
  teams: Team[];
  shadowPlayers: Player[]; // Emergency/Reserve players
  withdrawn: Player[]; // Unavailable players
  lastUpdated?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface EditingPlayer {
  rosterId: string;
  teamIndex?: number;
  playerIndex: number;
  player: Player;
  type: "team" | "emergency" | "unavailable";
}

export interface EditingStaff {
  rosterId: string;
  teamIndex: number;
  role: "coach" | "assistantCoach" | "manager";
  staff: Staff;
}

export interface AddPlayerModalData {
  rosterId: string;
  teamIndex?: number;
  type: "team" | "emergency" | "unavailable";
}

export const TEAM_CATEGORIES = [
  "junior",
  "senior",
  "masters",
  "social",
] as const;
export const GENDERS = ["male", "female", "mixed"] as const; // UPDATED

export const JUNIOR_DIVISIONS = ["U6", "U8", "U10", "U12", "U14", "U16", "U18"];

export const SENIOR_DIVISIONS = [
  "Open",
  "Premier",
  "Division 1",
  "Division 2",
  "Division 3",
  "BHL1",
  "BHL2",
  "BHL3",
  "BHL4",
  "BHL5",
  "BHL6",
  "BHL7",
];

export const MASTERS_DIVISIONS = [
  "O35",
  "O40",
  "O45",
  "O50",
  "O55",
  "O60",
  "O65",
];

export const POSITIONS = [
  "Goalkeeper",
  "Defender",
  "Midfielder",
  "Forward",
  "Striker",
  "Wing",
  "Sweeper",
  "Centre Back",
  "Full Back",
];
