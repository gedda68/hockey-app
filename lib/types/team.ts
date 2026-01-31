// types/team.ts
// TypeScript types and interfaces for team management

// ============================================================================
// ENUMS
// ============================================================================

export enum AgeCategory {
  JUNIOR = "junior",
  SENIOR = "senior",
  MASTERS = "masters",
}

export enum RosterStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  INJURED = "injured",
  SUSPENDED = "suspended",
}

export enum TeamStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ARCHIVED = "archived",
}

export enum RegistrationType {
  REGISTERED = "registered", // Players/Participants - counted in limits
  ASSIGNED = "assigned", // Officials - not counted in limits
}

// ============================================================================
// ROLE CATEGORIES
// ============================================================================

export const PARTICIPANT_CATEGORIES = ["Participant", "Playing"];
export const OFFICIAL_CATEGORIES = ["Official", "Coaching"];

// ============================================================================
// DIVISION CONFIGURATION
// ============================================================================

export interface DivisionConfig {
  name: string; // "Division 1", "U18", "Masters 1"
  level: number; // 1 = highest, 2 = second highest, etc.
  shortName: string; // "Div1", "U18", "M1"
  description?: string; // Optional description
}

// Predefined division configurations
export const SENIOR_DIVISIONS: DivisionConfig[] = [
  {
    name: "Division 1",
    level: 1,
    shortName: "Div1",
    description: "Premier division",
  },
  {
    name: "Division 2",
    level: 2,
    shortName: "Div2",
    description: "Second division",
  },
  {
    name: "Division 3",
    level: 3,
    shortName: "Div3",
    description: "Third division",
  },
  {
    name: "Division 4",
    level: 4,
    shortName: "Div4",
    description: "Fourth division",
  },
  {
    name: "Division 5",
    level: 5,
    shortName: "Div5",
    description: "Fifth division",
  },
];

export const JUNIOR_DIVISIONS: DivisionConfig[] = [
  {
    name: "Under 18",
    level: 1,
    shortName: "U18",
    description: "18 years and under",
  },
  {
    name: "Under 16",
    level: 2,
    shortName: "U16",
    description: "16 years and under",
  },
  {
    name: "Under 14",
    level: 3,
    shortName: "U14",
    description: "14 years and under",
  },
  {
    name: "Under 12",
    level: 4,
    shortName: "U12",
    description: "12 years and under",
  },
  {
    name: "Under 10",
    level: 5,
    shortName: "U10",
    description: "10 years and under",
  },
];

export const MASTERS_DIVISIONS: DivisionConfig[] = [
  {
    name: "Masters 1",
    level: 1,
    shortName: "M1",
    description: "Premier masters",
  },
  {
    name: "Masters 2",
    level: 2,
    shortName: "M2",
    description: "Second masters",
  },
  {
    name: "Masters 3",
    level: 3,
    shortName: "M3",
    description: "Third masters",
  },
];

// ============================================================================
// TEAM ROSTER
// ============================================================================

export interface TeamRosterMember {
  memberId: string; // Link to member
  roleId: string; // Role ID (e.g., "role-player", "role-goalkeeper")
  roleCategory: string; // "Participant" or "Official"
  registrationType: RegistrationType; // "registered" or "assigned"

  // Optional fields
  position?: string; // "Forward", "Defense", "Goalkeeper", "Midfield"
  jerseyNumber?: number; // 1-99

  // Status
  status: RosterStatus; // "active", "inactive", "injured", "suspended"

  // Dates
  joinedDate: Date; // When added to team
  leftDate?: Date; // When removed from team (if inactive)

  // Metadata
  notes?: string; // Coach notes, special instructions
}

// ============================================================================
// TEAM LEADERSHIP
// ============================================================================

export interface TeamLeadership {
  captain?: string; // Member ID
  viceCaptains: string[]; // Up to 2 member IDs
}

// ============================================================================
// TEAM STATISTICS
// ============================================================================

export interface TeamStatistics {
  totalRegistered: number; // Players/Participants registered
  totalAssigned: number; // Officials assigned
  totalGoalkeepers: number; // Count of goalkeepers
  activeMembers: number; // Members with status "active"
  inactiveMembers: number; // Members with status "inactive"
  injuredMembers: number; // Members with status "injured"
}

// ============================================================================
// TEAM DOCUMENT (MongoDB)
// ============================================================================

export interface Team {
  // IDs
  _id?: string; // MongoDB ObjectId
  teamId: string; // "team-CHC-DIV1-2024"
  clubId: string; // Link to club

  // Basic Info
  name: string; // "Division 1", "U18 Girls", "Masters 1 Men"
  displayName: string; // "Commercial HC - Division 1"
  gender?: "male" | "female" | "mixed";

  // Age Category
  ageCategory: AgeCategory; // "junior", "senior", "masters"

  // Division (within age category)
  division: DivisionConfig;

  // Roster
  roster: TeamRosterMember[];

  // Leadership
  leadership: TeamLeadership;

  // Competition Info
  season: string; // "2024", "2024-2025"
  competition?: string; // "Brisbane Hockey League"
  grade?: string; // "A Grade", "B Grade"

  // Venue
  homeGround?: string; // "Perry Park"
  trainingVenue?: string; // "Commercial HC Grounds"
  trainingTimes?: string; // "Tuesday & Thursday 6:00 PM"

  // Status
  status: TeamStatus; // "active", "inactive", "archived"

  // Statistics (computed)
  statistics: TeamStatistics;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string; // User ID
  updatedBy?: string; // User ID
}

// ============================================================================
// MEMBER TEAM REGISTRATION (embedded in Member document)
// ============================================================================

export interface MemberTeamRegistration {
  teamId: string; // Link to team
  clubId: string; // Link to club

  // Team info (denormalized for quick access)
  teamName: string; // "Division 1"
  ageCategory: AgeCategory; // "junior", "senior", "masters"
  divisionLevel: number; // 1, 2, 3, etc.

  // Registration details
  roleId: string; // Role in this team
  registrationType: RegistrationType; // "registered" or "assigned"
  position?: string; // Position in team
  jerseyNumber?: number; // Jersey number

  // Leadership
  isCaptain: boolean;
  isViceCaptain: boolean;

  // Status
  status: RosterStatus; // "active", "inactive", "injured", "suspended"

  // Dates
  season: string; // "2024"
  joinedDate: Date;
  leftDate?: Date;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export interface TeamSizeValidation extends ValidationResult {
  currentPlayers?: number;
  maxPlayers?: number;
  currentGoalkeepers?: number;
  maxGoalkeepers?: number;
  minPlayers?: number;
}

export interface PlayingUpValidation extends ValidationResult {
  playerDivision?: number;
  playingInDivision?: number;
  divisionGap?: number;
  hasIntermediateDivision?: boolean;
}

export interface AgeCategoryValidation extends ValidationResult {
  existingRegistrations?: MemberTeamRegistration[];
  conflictingTeam?: string;
}

// ============================================================================
// TEAM LIMITS
// ============================================================================

export const TEAM_LIMITS = {
  MAX_PLAYERS: 18, // Maximum registered players (including goalkeepers)
  MIN_PLAYERS: 9, // Minimum registered players
  MAX_GOALKEEPERS: 2, // Maximum goalkeepers
  MAX_VICE_CAPTAINS: 2, // Maximum vice captains
  MAX_DIVISION_GAP: 2, // Maximum divisions player can play up (with conditions)
  MAX_DIVISION_GAP_NO_INTERMEDIATE: 2, // Max gap when no intermediate division
  MAX_DIVISION_GAP_WITH_INTERMEDIATE: 1, // Max gap when intermediate exists
} as const;

// ============================================================================
// QUERY TYPES
// ============================================================================

export interface TeamQuery {
  clubId?: string;
  ageCategory?: AgeCategory;
  season?: string;
  status?: TeamStatus;
  divisionLevel?: number;
}

export interface TeamRosterQuery {
  memberId?: string;
  roleCategory?: string;
  registrationType?: RegistrationType;
  status?: RosterStatus;
  position?: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateTeamRequest {
  clubId: string;
  name: string;
  gender?: "male" | "female" | "mixed";
  ageCategory: AgeCategory;
  division: DivisionConfig;
  season: string;
  competition?: string;
  grade?: string;
  homeGround?: string;
}

export interface UpdateTeamRequest {
  name?: string;
  gender?: "male" | "female" | "mixed";
  division?: DivisionConfig;
  season?: string;
  competition?: string;
  grade?: string;
  homeGround?: string;
  trainingVenue?: string;
  trainingTimes?: string;
  status?: TeamStatus;
}

export interface AddRosterMemberRequest {
  memberId: string;
  roleId: string;
  registrationType: RegistrationType;
  position?: string;
  jerseyNumber?: number;
  status?: RosterStatus;
}

export interface UpdateRosterMemberRequest {
  position?: string;
  jerseyNumber?: number;
  status?: RosterStatus;
  notes?: string;
}

export interface UpdateLeadershipRequest {
  captain?: string;
  viceCaptains?: string[];
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export type TeamWithMemberDetails = Team & {
  rosterWithDetails: Array<
    TeamRosterMember & {
      memberName: string;
      memberEmail: string;
      memberPhoto?: string;
    }
  >;
};

export type MemberWithTeams = {
  memberId: string;
  personalInfo: any;
  teamRegistrations: MemberTeamRegistration[];
};

// ============================================================================
// EXPORT ALL
// ============================================================================

export type {
  DivisionConfig,
  TeamRosterMember,
  TeamLeadership,
  TeamStatistics,
  Team,
  MemberTeamRegistration,
  ValidationResult,
  TeamSizeValidation,
  PlayingUpValidation,
  AgeCategoryValidation,
  TeamQuery,
  TeamRosterQuery,
  CreateTeamRequest,
  UpdateTeamRequest,
  AddRosterMemberRequest,
  UpdateRosterMemberRequest,
  UpdateLeadershipRequest,
  TeamWithMemberDetails,
  MemberWithTeams,
};
