// lib/db/schemas/team.schema.ts
// MongoDB schemas for team management

import { z } from "zod";

// ============================================================================
// ENUMS AS ZOD SCHEMAS
// ============================================================================

export const AgeCategorySchema = z.enum(["junior", "senior", "masters"]);

export const RosterStatusSchema = z.enum([
  "active",
  "inactive",
  "injured",
  "suspended",
]);

export const TeamStatusSchema = z.enum(["active", "inactive", "archived"]);

export const RegistrationTypeSchema = z.enum(["registered", "assigned"]);

// ============================================================================
// DIVISION CONFIG SCHEMA
// ============================================================================

export const DivisionConfigSchema = z.object({
  name: z.string().min(1, "Division name is required"),
  level: z.number().int().min(1, "Division level must be at least 1"),
  shortName: z.string().min(1, "Short name is required"),
  description: z.string().optional(),
});

// ============================================================================
// TEAM ROSTER MEMBER SCHEMA
// ============================================================================

export const TeamRosterMemberSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
  roleId: z.string().min(1, "Role ID is required"),
  roleCategory: z.string().min(1, "Role category is required"),
  registrationType: RegistrationTypeSchema,

  // Optional fields
  position: z.string().optional(),
  jerseyNumber: z.number().int().min(1).max(99).optional(),

  // Status
  status: RosterStatusSchema.default("active"),

  // Dates
  joinedDate: z.date().default(() => new Date()),
  leftDate: z.date().optional(),

  // Metadata
  notes: z.string().optional(),
});

// ============================================================================
// TEAM LEADERSHIP SCHEMA
// ============================================================================

export const TeamLeadershipSchema = z.object({
  captain: z.string().optional(),
  viceCaptains: z
    .array(z.string())
    .max(2, "Maximum 2 vice captains allowed")
    .default([]),
});

// ============================================================================
// TEAM STATISTICS SCHEMA
// ============================================================================

export const TeamStatisticsSchema = z.object({
  totalRegistered: z.number().int().min(0).default(0),
  totalAssigned: z.number().int().min(0).default(0),
  totalGoalkeepers: z.number().int().min(0).default(0),
  activeMembers: z.number().int().min(0).default(0),
  inactiveMembers: z.number().int().min(0).default(0),
  injuredMembers: z.number().int().min(0).default(0),
});

// ============================================================================
// TEAM SCHEMA (MongoDB Document)
// ============================================================================

export const TeamSchema = z.object({
  // IDs
  _id: z.string().optional(),
  teamId: z.string().min(1, "Team ID is required"),
  clubId: z.string().min(1, "Club ID is required"),

  // Basic Info
  name: z.string().min(1, "Team name is required"),
  displayName: z.string().min(1, "Display name is required"),
  gender: z.enum(["male", "female", "mixed"]).optional(),

  // Age Category
  ageCategory: AgeCategorySchema,

  // Division
  division: DivisionConfigSchema,

  // Roster
  roster: z.array(TeamRosterMemberSchema).default([]),

  // Leadership
  leadership: TeamLeadershipSchema.default({ viceCaptains: [] }),

  // Competition Info
  season: z.string().min(1, "Season is required"),
  competition: z.string().optional(),
  grade: z.string().optional(),

  // Venue
  homeGround: z.string().optional(),
  trainingVenue: z.string().optional(),
  trainingTimes: z.string().optional(),

  // Status
  status: TeamStatusSchema.default("active"),

  // Statistics
  statistics: TeamStatisticsSchema.default({
    totalRegistered: 0,
    totalAssigned: 0,
    totalGoalkeepers: 0,
    activeMembers: 0,
    inactiveMembers: 0,
    injuredMembers: 0,
  }),

  // Metadata
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
});

// ============================================================================
// MEMBER TEAM REGISTRATION SCHEMA (embedded in Member)
// ============================================================================

export const MemberTeamRegistrationSchema = z.object({
  teamId: z.string().min(1, "Team ID is required"),
  clubId: z.string().min(1, "Club ID is required"),

  // Team info (denormalized)
  teamName: z.string().min(1, "Team name is required"),
  ageCategory: AgeCategorySchema,
  divisionLevel: z.number().int().min(1),

  // Registration details
  roleId: z.string().min(1, "Role ID is required"),
  registrationType: RegistrationTypeSchema,
  position: z.string().optional(),
  jerseyNumber: z.number().int().min(1).max(99).optional(),

  // Leadership
  isCaptain: z.boolean().default(false),
  isViceCaptain: z.boolean().default(false),

  // Status
  status: RosterStatusSchema.default("active"),

  // Dates
  season: z.string().min(1, "Season is required"),
  joinedDate: z.date().default(() => new Date()),
  leftDate: z.date().optional(),
});

// ============================================================================
// API REQUEST SCHEMAS
// ============================================================================

export const CreateTeamRequestSchema = z.object({
  clubId: z.string().min(1, "Club ID is required"),
  name: z.string().min(1, "Team name is required"),
  gender: z.enum(["male", "female", "mixed"]).optional(),
  ageCategory: AgeCategorySchema,
  division: DivisionConfigSchema,
  season: z.string().min(1, "Season is required"),
  competition: z.string().optional(),
  grade: z.string().optional(),
  homeGround: z.string().optional(),
});

export const UpdateTeamRequestSchema = z.object({
  name: z.string().min(1).optional(),
  gender: z.enum(["male", "female", "mixed"]).optional(),
  division: DivisionConfigSchema.optional(),
  season: z.string().min(1).optional(),
  competition: z.string().optional(),
  grade: z.string().optional(),
  homeGround: z.string().optional(),
  trainingVenue: z.string().optional(),
  trainingTimes: z.string().optional(),
  status: TeamStatusSchema.optional(),
});

export const AddRosterMemberRequestSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
  roleId: z.string().min(1, "Role ID is required"),
  registrationType: RegistrationTypeSchema,
  position: z.string().optional(),
  jerseyNumber: z.number().int().min(1).max(99).optional(),
  status: RosterStatusSchema.optional(),
});

export const UpdateRosterMemberRequestSchema = z.object({
  position: z.string().optional(),
  jerseyNumber: z.number().int().min(1).max(99).optional(),
  status: RosterStatusSchema.optional(),
  notes: z.string().optional(),
});

export const UpdateLeadershipRequestSchema = z.object({
  captain: z.string().optional(),
  viceCaptains: z
    .array(z.string())
    .max(2, "Maximum 2 vice captains allowed")
    .optional(),
});

// ============================================================================
// MONGODB COLLECTION SCHEMA
// ============================================================================

/**
 * MongoDB Collection: teams
 *
 * Indexes:
 * 1. { teamId: 1 } - unique
 * 2. { clubId: 1, ageCategory: 1, season: 1 }
 * 3. { clubId: 1, status: 1 }
 * 4. { "roster.memberId": 1 }
 * 5. { season: 1, status: 1 }
 */

export const TEAM_INDEXES = [
  { key: { teamId: 1 }, unique: true },
  { key: { clubId: 1, ageCategory: 1, season: 1 } },
  { key: { clubId: 1, status: 1 } },
  { key: { "roster.memberId": 1 } },
  { key: { season: 1, status: 1 } },
] as const;

// ============================================================================
// MEMBER COLLECTION UPDATE
// ============================================================================

/**
 * Add to existing Member schema:
 *
 * teamRegistrations: MemberTeamRegistrationSchema[]
 *
 * Additional indexes needed:
 * 1. { "teamRegistrations.teamId": 1 }
 * 2. { "teamRegistrations.clubId": 1, "teamRegistrations.ageCategory": 1, "teamRegistrations.status": 1 }
 */

export const MEMBER_TEAM_INDEXES = [
  { key: { "teamRegistrations.teamId": 1 } },
  {
    key: {
      "teamRegistrations.clubId": 1,
      "teamRegistrations.ageCategory": 1,
      "teamRegistrations.status": 1,
    },
  },
] as const;

// ============================================================================
// TYPE EXPORTS (inferred from Zod schemas)
// ============================================================================

export type Team = z.infer<typeof TeamSchema>;
export type TeamRosterMember = z.infer<typeof TeamRosterMemberSchema>;
export type TeamLeadership = z.infer<typeof TeamLeadershipSchema>;
export type TeamStatistics = z.infer<typeof TeamStatisticsSchema>;
export type DivisionConfig = z.infer<typeof DivisionConfigSchema>;
export type MemberTeamRegistration = z.infer<
  typeof MemberTeamRegistrationSchema
>;

export type CreateTeamRequest = z.infer<typeof CreateTeamRequestSchema>;
export type UpdateTeamRequest = z.infer<typeof UpdateTeamRequestSchema>;
export type AddRosterMemberRequest = z.infer<
  typeof AddRosterMemberRequestSchema
>;
export type UpdateRosterMemberRequest = z.infer<
  typeof UpdateRosterMemberRequestSchema
>;
export type UpdateLeadershipRequest = z.infer<
  typeof UpdateLeadershipRequestSchema
>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate team ID
 * Format: team-{clubSlug}-{divisionShort}-{season}
 * Example: team-chc-div1-2024
 */
export function generateTeamId(
  clubSlug: string,
  divisionShortName: string,
  season: string
): string {
  return `team-${clubSlug}-${divisionShortName.toLowerCase()}-${season}`;
}

/**
 * Generate display name
 * Format: {clubName} - {teamName}
 * Example: "Commercial HC - Division 1"
 */
export function generateDisplayName(
  clubName: string,
  teamName: string
): string {
  return `${clubName} - ${teamName}`;
}

/**
 * Calculate team statistics from roster
 */
export function calculateTeamStatistics(
  roster: TeamRosterMember[]
): TeamStatistics {
  const registered = roster.filter((r) => r.registrationType === "registered");
  const assigned = roster.filter((r) => r.registrationType === "assigned");
  const goalkeepers = roster.filter(
    (r) => r.registrationType === "registered" && r.roleId === "role-goalkeeper"
  );

  return {
    totalRegistered: registered.length,
    totalAssigned: assigned.length,
    totalGoalkeepers: goalkeepers.length,
    activeMembers: roster.filter((r) => r.status === "active").length,
    inactiveMembers: roster.filter((r) => r.status === "inactive").length,
    injuredMembers: roster.filter((r) => r.status === "injured").length,
  };
}

/**
 * Validate team statistics against limits
 */
export function validateTeamLimits(stats: TeamStatistics): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check maximum players
  if (stats.totalRegistered > 18) {
    errors.push(
      `Maximum 18 registered players exceeded (current: ${stats.totalRegistered})`
    );
  }

  // Check maximum goalkeepers
  if (stats.totalGoalkeepers > 2) {
    errors.push(
      `Maximum 2 goalkeepers exceeded (current: ${stats.totalGoalkeepers})`
    );
  }

  // Check minimum players (warning, not error)
  if (stats.totalRegistered < 9) {
    warnings.push(
      `Minimum 9 registered players required (current: ${stats.totalRegistered})`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
