// lib/validation/team-validation.ts
// Comprehensive team validation functions - all business rules

import type {
  Team,
  TeamRosterMember,
  MemberTeamRegistration,
  TeamStatistics,
  ValidationResult,
  TeamSizeValidation,
  PlayingUpValidation,
  AgeCategoryValidation,
} from "@/types/team";

// ============================================================================
// CONSTANTS
// ============================================================================

export const TEAM_LIMITS = {
  MAX_PLAYERS: 18, // Maximum registered players (including goalkeepers)
  MIN_PLAYERS: 9, // Minimum registered players
  MAX_GOALKEEPERS: 2, // Maximum goalkeepers
  MAX_VICE_CAPTAINS: 2, // Maximum vice captains
  MAX_DIVISION_GAP: 2, // Maximum divisions a player can play up
} as const;

const PARTICIPANT_CATEGORIES = ["Participant", "Playing"];
const OFFICIAL_CATEGORIES = ["Official", "Coaching"];
const ALLOWED_TEAM_CATEGORIES = [
  ...PARTICIPANT_CATEGORIES,
  ...OFFICIAL_CATEGORIES,
];

// ============================================================================
// 1. TEAM SIZE VALIDATION
// ============================================================================

/**
 * Validate team roster size limits
 * - Max 18 registered players (including goalkeepers)
 * - Max 2 goalkeepers
 * - Min 9 registered players
 */
export function validateTeamSize(
  roster: TeamRosterMember[]
): TeamSizeValidation {
  const registered = roster.filter((r) => r.registrationType === "registered");
  const goalkeepers = roster.filter(
    (r) => r.registrationType === "registered" && r.roleId === "role-goalkeeper"
  );

  const currentPlayers = registered.length;
  const currentGoalkeepers = goalkeepers.length;

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check maximum players
  if (currentPlayers > TEAM_LIMITS.MAX_PLAYERS) {
    errors.push(
      `Maximum ${TEAM_LIMITS.MAX_PLAYERS} registered players exceeded (current: ${currentPlayers})`
    );
  }

  // Check maximum goalkeepers
  if (currentGoalkeepers > TEAM_LIMITS.MAX_GOALKEEPERS) {
    errors.push(
      `Maximum ${TEAM_LIMITS.MAX_GOALKEEPERS} goalkeepers exceeded (current: ${currentGoalkeepers})`
    );
  }

  // Check minimum players (warning, not error)
  if (currentPlayers < TEAM_LIMITS.MIN_PLAYERS) {
    warnings.push(
      `Minimum ${TEAM_LIMITS.MIN_PLAYERS} registered players required (current: ${currentPlayers})`
    );
  }

  return {
    valid: errors.length === 0,
    error: errors.length > 0 ? errors.join("; ") : undefined,
    warnings,
    currentPlayers,
    maxPlayers: TEAM_LIMITS.MAX_PLAYERS,
    currentGoalkeepers,
    maxGoalkeepers: TEAM_LIMITS.MAX_GOALKEEPERS,
    minPlayers: TEAM_LIMITS.MIN_PLAYERS,
  };
}

/**
 * Check if adding a new member would exceed team limits
 */
export function canAddMemberToTeam(
  currentRoster: TeamRosterMember[],
  newMember: {
    roleId: string;
    registrationType: "registered" | "assigned";
  }
): TeamSizeValidation {
  // Assigned officials don't count towards limits
  if (newMember.registrationType === "assigned") {
    return {
      valid: true,
      currentPlayers: currentRoster.filter(
        (r) => r.registrationType === "registered"
      ).length,
      maxPlayers: TEAM_LIMITS.MAX_PLAYERS,
      currentGoalkeepers: currentRoster.filter(
        (r) =>
          r.registrationType === "registered" && r.roleId === "role-goalkeeper"
      ).length,
      maxGoalkeepers: TEAM_LIMITS.MAX_GOALKEEPERS,
      minPlayers: TEAM_LIMITS.MIN_PLAYERS,
    };
  }

  // Simulate adding the member
  const simulatedRoster = [...currentRoster, newMember as TeamRosterMember];
  return validateTeamSize(simulatedRoster);
}

// ============================================================================
// 2. AGE CATEGORY VALIDATION
// ============================================================================

/**
 * Validate age category registration rules
 * - Cannot be registered in same age category twice at same club
 * - Cannot be registered in same age category across different clubs
 * - Can be registered in different age categories (junior + senior, etc.)
 */
export function validateAgeCategory(
  memberId: string,
  newTeam: {
    teamId: string;
    clubId: string;
    ageCategory: "junior" | "senior" | "masters";
  },
  existingRegistrations: MemberTeamRegistration[],
  registrationType: "registered" | "assigned"
): AgeCategoryValidation {
  // Only validate for registered players, not assigned officials
  if (registrationType === "assigned") {
    return { valid: true };
  }

  // Filter only active registered players
  const activeRegistered = existingRegistrations.filter(
    (reg) => reg.status === "active" && reg.registrationType === "registered"
  );

  // Check same club, same age category
  const sameClubSameCategory = activeRegistered.find(
    (reg) =>
      reg.clubId === newTeam.clubId && reg.ageCategory === newTeam.ageCategory
  );

  if (sameClubSameCategory) {
    return {
      valid: false,
      error: `Member is already registered in another ${newTeam.ageCategory} team at this club`,
      existingRegistrations: activeRegistered,
      conflictingTeam: sameClubSameCategory.teamName,
    };
  }

  // Check different club, same age category
  const otherClubSameCategory = activeRegistered.find(
    (reg) =>
      reg.clubId !== newTeam.clubId && reg.ageCategory === newTeam.ageCategory
  );

  if (otherClubSameCategory) {
    return {
      valid: false,
      error: `Member is already registered in a ${newTeam.ageCategory} team at another club`,
      existingRegistrations: activeRegistered,
      conflictingTeam: otherClubSameCategory.teamName,
    };
  }

  return { valid: true, existingRegistrations: activeRegistered };
}

/**
 * Get all age category conflicts for a member
 */
export function getAgeCategoryConflicts(
  existingRegistrations: MemberTeamRegistration[]
): {
  conflicts: Array<{
    ageCategory: string;
    teams: string[];
    clubIds: string[];
  }>;
  hasConflicts: boolean;
} {
  const activeRegistered = existingRegistrations.filter(
    (reg) => reg.status === "active" && reg.registrationType === "registered"
  );

  // Group by age category
  const byCategory = activeRegistered.reduce((acc, reg) => {
    if (!acc[reg.ageCategory]) {
      acc[reg.ageCategory] = [];
    }
    acc[reg.ageCategory].push(reg);
    return acc;
  }, {} as Record<string, MemberTeamRegistration[]>);

  // Find conflicts (more than one team in same category)
  const conflicts = Object.entries(byCategory)
    .filter(([_, regs]) => regs.length > 1)
    .map(([ageCategory, regs]) => ({
      ageCategory,
      teams: regs.map((r) => r.teamName),
      clubIds: regs.map((r) => r.clubId),
    }));

  return {
    conflicts,
    hasConflicts: conflicts.length > 0,
  };
}

// ============================================================================
// 3. PLAYING UP VALIDATION
// ============================================================================

/**
 * Validate if a player can "play up" to a higher division
 * Rules:
 * - Can play 1 division up: Always allowed
 * - Can play 2 divisions up: Only if no intermediate division exists
 * - Cannot play 3+ divisions up
 */
export function validatePlayingUp(
  playerRegisteredDivision: number, // Division player is registered in
  playingInDivision: number, // Division player wants to play in
  clubDivisions: number[], // All division levels club has in this age category
  ageCategory: "junior" | "senior" | "masters"
): PlayingUpValidation {
  // Playing in same division or lower - always allowed (for practice/friendlies)
  const divisionGap = playerRegisteredDivision - playingInDivision;

  if (divisionGap <= 0) {
    return {
      valid: true,
      playerDivision: playerRegisteredDivision,
      playingInDivision,
      divisionGap: Math.abs(divisionGap),
    };
  }

  // Playing 1 division up - always allowed
  if (divisionGap === 1) {
    return {
      valid: true,
      playerDivision: playerRegisteredDivision,
      playingInDivision,
      divisionGap,
    };
  }

  // Playing 2 divisions up - only if no intermediate division
  if (divisionGap === 2) {
    const intermediateDivision = playerRegisteredDivision - 1;
    const hasIntermediate = clubDivisions.includes(intermediateDivision);

    if (!hasIntermediate) {
      return {
        valid: true,
        playerDivision: playerRegisteredDivision,
        playingInDivision,
        divisionGap,
        hasIntermediateDivision: false,
      };
    }

    return {
      valid: false,
      error: `Cannot play 2 divisions up when intermediate division exists (${getDivisionName(
        intermediateDivision,
        ageCategory
      )})`,
      playerDivision: playerRegisteredDivision,
      playingInDivision,
      divisionGap,
      hasIntermediateDivision: true,
    };
  }

  // Playing 3+ divisions up - never allowed
  return {
    valid: false,
    error: `Cannot play ${divisionGap} divisions up (maximum 2 divisions allowed)`,
    playerDivision: playerRegisteredDivision,
    playingInDivision,
    divisionGap,
  };
}

/**
 * Get division name for error messages
 */
function getDivisionName(level: number, ageCategory: string): string {
  if (ageCategory === "junior") {
    const ages = [18, 16, 14, 12, 10, 8];
    return `U${ages[level - 1] || level}`;
  } else if (ageCategory === "masters") {
    return `Masters ${level}`;
  } else {
    return `Division ${level}`;
  }
}

/**
 * Get all divisions a player is allowed to play in
 */
export function getAllowedDivisions(
  playerRegisteredDivision: number,
  clubDivisions: number[],
  ageCategory: "junior" | "senior" | "masters"
): {
  allowedDivisions: number[];
  details: Array<{
    division: number;
    allowed: boolean;
    reason: string;
  }>;
} {
  const sortedDivisions = [...clubDivisions].sort((a, b) => a - b);
  const details = sortedDivisions.map((division) => {
    const validation = validatePlayingUp(
      playerRegisteredDivision,
      division,
      clubDivisions,
      ageCategory
    );

    return {
      division,
      allowed: validation.valid,
      reason: validation.valid ? "Allowed" : validation.error || "Not allowed",
    };
  });

  return {
    allowedDivisions: details.filter((d) => d.allowed).map((d) => d.division),
    details,
  };
}

// ============================================================================
// 4. ROLE CATEGORY VALIDATION
// ============================================================================

/**
 * Validate that role category is allowed in teams
 * Only Participant, Playing, Official, and Coaching roles can be in teams
 */
export function validateRoleCategory(
  roleId: string,
  roleCategory: string
): ValidationResult {
  if (!ALLOWED_TEAM_CATEGORIES.includes(roleCategory)) {
    return {
      valid: false,
      error: `Only ${ALLOWED_TEAM_CATEGORIES.join(
        ", "
      )} roles can be added to teams. This role is ${roleCategory}.`,
    };
  }

  return { valid: true };
}

/**
 * Determine if role should be registered or assigned
 */
export function determineRegistrationType(
  roleCategory: string
): "registered" | "assigned" {
  if (PARTICIPANT_CATEGORIES.includes(roleCategory)) {
    return "registered";
  }
  if (OFFICIAL_CATEGORIES.includes(roleCategory)) {
    return "assigned";
  }
  // Default to assigned for safety
  return "assigned";
}

// ============================================================================
// 5. LEADERSHIP VALIDATION
// ============================================================================

/**
 * Validate team leadership (captain and vice captains)
 */
export function validateLeadership(
  captain: string | undefined,
  viceCaptains: string[],
  roster: TeamRosterMember[]
): ValidationResult {
  const rosterMemberIds = roster.map((r) => r.memberId);
  const errors: string[] = [];

  // Validate captain
  if (captain && !rosterMemberIds.includes(captain)) {
    errors.push("Captain must be a member of the team roster");
  }

  // Validate vice captains count
  if (viceCaptains.length > TEAM_LIMITS.MAX_VICE_CAPTAINS) {
    errors.push(
      `Maximum ${TEAM_LIMITS.MAX_VICE_CAPTAINS} vice captains allowed`
    );
  }

  // Validate vice captains are in roster
  for (const vc of viceCaptains) {
    if (!rosterMemberIds.includes(vc)) {
      errors.push(`Vice captain ${vc} must be a member of the team roster`);
    }
  }

  // Check for duplicates
  const uniqueVCs = new Set(viceCaptains);
  if (uniqueVCs.size !== viceCaptains.length) {
    errors.push("Vice captains list contains duplicates");
  }

  // Captain cannot also be vice captain
  if (captain && viceCaptains.includes(captain)) {
    errors.push("Captain cannot also be a vice captain");
  }

  return {
    valid: errors.length === 0,
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
}

/**
 * Check if member can be removed from roster (not captain or vice captain)
 */
export function canRemoveMemberFromRoster(
  memberId: string,
  captain: string | undefined,
  viceCaptains: string[]
): ValidationResult {
  if (captain === memberId) {
    return {
      valid: false,
      error:
        "Cannot remove captain from roster. Please assign a new captain first.",
    };
  }

  if (viceCaptains.includes(memberId)) {
    return {
      valid: false,
      error:
        "Cannot remove vice captain from roster. Please remove from leadership first.",
    };
  }

  return { valid: true };
}

// ============================================================================
// 6. JERSEY NUMBER VALIDATION
// ============================================================================

/**
 * Validate jersey number is unique within team and in valid range
 */
export function validateJerseyNumber(
  jerseyNumber: number | undefined,
  roster: TeamRosterMember[],
  excludeMemberId?: string
): ValidationResult {
  if (!jerseyNumber) {
    return { valid: true }; // Jersey number is optional
  }

  // Check range (1-99)
  if (jerseyNumber < 1 || jerseyNumber > 99) {
    return {
      valid: false,
      error: "Jersey number must be between 1 and 99",
    };
  }

  // Check uniqueness
  const existingMember = roster.find(
    (r) => r.jerseyNumber === jerseyNumber && r.memberId !== excludeMemberId
  );

  if (existingMember) {
    return {
      valid: false,
      error: `Jersey number ${jerseyNumber} is already assigned to ${existingMember.memberId}`,
    };
  }

  return { valid: true };
}

/**
 * Get available jersey numbers
 */
export function getAvailableJerseyNumbers(
  roster: TeamRosterMember[]
): number[] {
  const usedNumbers = new Set(
    roster.map((r) => r.jerseyNumber).filter((n) => n !== undefined)
  );

  const available: number[] = [];
  for (let i = 1; i <= 99; i++) {
    if (!usedNumbers.has(i)) {
      available.push(i);
    }
  }

  return available;
}

// ============================================================================
// 7. COMPOSITE VALIDATION
// ============================================================================

/**
 * Validate adding a member to team (all rules)
 */
export function validateAddMemberToTeam(params: {
  memberId: string;
  roleId: string;
  roleCategory: string;
  registrationType: "registered" | "assigned";
  jerseyNumber?: number;
  currentRoster: TeamRosterMember[];
  currentTeam: {
    teamId: string;
    clubId: string;
    ageCategory: "junior" | "senior" | "masters";
    divisionLevel: number;
  };
  memberRegistrations: MemberTeamRegistration[];
  clubDivisions?: number[];
}): ValidationResult & {
  warnings?: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check if member already in roster
  if (params.currentRoster.find((r) => r.memberId === params.memberId)) {
    errors.push("Member is already in this team roster");
  }

  // 2. Validate role category
  const roleCategoryValidation = validateRoleCategory(
    params.roleId,
    params.roleCategory
  );
  if (!roleCategoryValidation.valid) {
    errors.push(roleCategoryValidation.error || "Invalid role category");
  }

  // 3. Validate team size (only for registered players)
  if (params.registrationType === "registered") {
    const sizeValidation = canAddMemberToTeam(params.currentRoster, {
      roleId: params.roleId,
      registrationType: params.registrationType,
    });

    if (!sizeValidation.valid) {
      errors.push(sizeValidation.error || "Team size limit exceeded");
    }

    if (sizeValidation.warnings) {
      warnings.push(...sizeValidation.warnings);
    }

    // 4. Validate age category (only for registered players)
    const ageCategoryValidation = validateAgeCategory(
      params.memberId,
      params.currentTeam,
      params.memberRegistrations,
      params.registrationType
    );

    if (!ageCategoryValidation.valid) {
      errors.push(ageCategoryValidation.error || "Age category conflict");
    }
  }

  // 5. Validate jersey number
  if (params.jerseyNumber) {
    const jerseyValidation = validateJerseyNumber(
      params.jerseyNumber,
      params.currentRoster
    );

    if (!jerseyValidation.valid) {
      errors.push(jerseyValidation.error || "Invalid jersey number");
    }
  }

  return {
    valid: errors.length === 0,
    error: errors.length > 0 ? errors.join("; ") : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate team is ready for competition
 */
export function validateTeamReadiness(team: Team): {
  ready: boolean;
  errors: string[];
  warnings: string[];
  checklist: Array<{
    item: string;
    status: "pass" | "fail" | "warning";
    message: string;
  }>;
} {
  const checklist: Array<{
    item: string;
    status: "pass" | "fail" | "warning";
    message: string;
  }> = [];

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check minimum players
  if (team.statistics.totalRegistered < TEAM_LIMITS.MIN_PLAYERS) {
    checklist.push({
      item: "Minimum Players",
      status: "fail",
      message: `Need at least ${TEAM_LIMITS.MIN_PLAYERS} registered players (current: ${team.statistics.totalRegistered})`,
    });
    errors.push(
      `Team has only ${team.statistics.totalRegistered} players (minimum ${TEAM_LIMITS.MIN_PLAYERS} required)`
    );
  } else {
    checklist.push({
      item: "Minimum Players",
      status: "pass",
      message: `${team.statistics.totalRegistered} registered players`,
    });
  }

  // Check goalkeeper
  if (team.statistics.totalGoalkeepers === 0) {
    checklist.push({
      item: "Goalkeeper",
      status: "warning",
      message: "No goalkeeper assigned",
    });
    warnings.push("Team has no goalkeeper");
  } else {
    checklist.push({
      item: "Goalkeeper",
      status: "pass",
      message: `${team.statistics.totalGoalkeepers} goalkeeper(s)`,
    });
  }

  // Check captain
  if (!team.leadership.captain) {
    checklist.push({
      item: "Captain",
      status: "warning",
      message: "No captain assigned",
    });
    warnings.push("Team has no captain");
  } else {
    checklist.push({
      item: "Captain",
      status: "pass",
      message: "Captain assigned",
    });
  }

  // Check home ground
  if (!team.homeGround) {
    checklist.push({
      item: "Home Ground",
      status: "warning",
      message: "No home ground set",
    });
    warnings.push("No home ground specified");
  } else {
    checklist.push({
      item: "Home Ground",
      status: "pass",
      message: team.homeGround,
    });
  }

  return {
    ready: errors.length === 0,
    errors,
    warnings,
    checklist,
  };
}

// ============================================================================
// 8. STATISTICS HELPERS
// ============================================================================

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
 * Check if team statistics are within limits
 */
export function validateTeamStatistics(
  stats: TeamStatistics
): ValidationResult & {
  warnings?: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (stats.totalRegistered > TEAM_LIMITS.MAX_PLAYERS) {
    errors.push(
      `Maximum ${TEAM_LIMITS.MAX_PLAYERS} registered players exceeded (current: ${stats.totalRegistered})`
    );
  }

  if (stats.totalGoalkeepers > TEAM_LIMITS.MAX_GOALKEEPERS) {
    errors.push(
      `Maximum ${TEAM_LIMITS.MAX_GOALKEEPERS} goalkeepers exceeded (current: ${stats.totalGoalkeepers})`
    );
  }

  if (stats.totalRegistered < TEAM_LIMITS.MIN_PLAYERS) {
    warnings.push(
      `Minimum ${TEAM_LIMITS.MIN_PLAYERS} registered players required (current: ${stats.totalRegistered})`
    );
  }

  return {
    valid: errors.length === 0,
    error: errors.length > 0 ? errors.join("; ") : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
