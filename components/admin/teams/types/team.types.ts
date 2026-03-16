// components/admin/teams/types/team.types.ts
// Team types adapted from representative roster system

export interface Player {
  id: string;
  name: string;
  number?: string;
  position?: string;
  dateOfBirth?: string;
  playerId?: string; // Link to player database
}

export interface Staff {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  memberId?: string; // Link to member database
}

export interface Team {
  name: string; // "Gold", "Silver", "Premier", "Team 1"
  players: Player[];
  coach?: Staff;
  assistantCoach?: Staff;
  manager?: Staff;
}

export interface TeamRoster {
  id?: string;
  clubId: string;
  clubName?: string; // Populated from club lookup
  clubColors?: {
    // ✅ Populated from club lookup
    primary: string;
    secondary: string;
    tertiary?: string;
  };
  clubLogo?: string; // ✅ Populated from club lookup

  // Team Classification
  category: "junior" | "senior" | "masters" | "social";
  division: string; // "U12", "U14", "Open", "O35", "O40"
  gender: "mens" | "womens" | "boys" | "girls" | "mixed";
  grade?: string; // "A", "B", "Premier", "Division 1"

  // Season
  season: string; // "2026", "2026-2027"

  // Teams in this roster
  teams: Team[];

  // Unallocated/Shadow Players
  shadowPlayers: Player[];

  // Withdrawn Players
  withdrawn: Player[];

  // Metadata
  lastUpdated: string;
  createdAt?: string;
  updatedAt?: string;
}

// Team categories
export const TEAM_CATEGORIES = [
  "junior",
  "senior",
  "masters",
  "social",
] as const;

export const CATEGORY_LABELS: Record<(typeof TEAM_CATEGORIES)[number], string> =
  {
    junior: "Junior",
    senior: "Senior",
    masters: "Masters",
    social: "Social",
  };

// Gender options
export const GENDERS = ["mens", "womens", "boys", "girls", "mixed"] as const;

export const GENDER_LABELS: Record<(typeof GENDERS)[number], string> = {
  mens: "Men's",
  womens: "Women's",
  boys: "Boys",
  girls: "Girls",
  mixed: "Mixed",
};

// Junior divisions
export const JUNIOR_DIVISIONS = [
  "U6",
  "U8",
  "U10",
  "U12",
  "U14",
  "U16",
  "U18",
] as const;

// Senior divisions
export const SENIOR_DIVISIONS = [
  "Open",
  "Premier",
  "Division 1",
  "Division 2",
  "Division 3",
] as const;

// Masters divisions
export const MASTERS_DIVISIONS = [
  "O35",
  "O40",
  "O45",
  "O50",
  "O55",
  "O60",
  "O65",
] as const;

// Grades
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

// Staff roles
export type StaffRole = "coach" | "assistantCoach" | "manager";

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  coach: "Head Coach",
  assistantCoach: "Assistant Coach",
  manager: "Team Manager",
};

// Editing types
export interface EditingPlayer {
  clubId: string;
  category: string;
  division: string;
  gender: string;
  teamName: string;
  playerIndex: number;
  player: Player;
}

export interface EditingStaff {
  clubId: string;
  category: string;
  division: string;
  gender: string;
  teamName: string;
  role: StaffRole;
  staff: Staff;
}

export interface EditingShadowPlayer {
  clubId: string;
  category: string;
  division: string;
  gender: string;
  playerIndex: number;
  player: Player;
}

export interface AddPlayerModal {
  clubId: string;
  category: string;
  division: string;
  gender: string;
  teamName: string;
}
