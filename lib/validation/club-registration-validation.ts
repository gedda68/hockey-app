// lib/validation/club-registration-validation.ts
// Club registration validation functions

import type {
  ClubRegistration,
  RegistrationValidation,
  RegistrationType,
  RegistrationStatus,
} from "@/types/club-registration";

// ============================================================================
// REGISTRATION VALIDATION
// ============================================================================

/**
 * Validate if member can register for a club
 */
export function validateClubRegistration(params: {
  memberId: string;
  clubId: string;
  registrationType: RegistrationType;
  existingRegistrations: ClubRegistration[];
}): RegistrationValidation {
  const { memberId, clubId, registrationType, existingRegistrations } = params;

  const errors: string[] = [];
  const warnings: string[] = [];

  // Find active registrations
  const activeRegistrations = existingRegistrations.filter(
    (reg) =>
      reg.status === "active" ||
      reg.status === "approved" ||
      reg.status === "pending"
  );

  // Check if already registered at this club
  const existingAtClub = activeRegistrations.find(
    (reg) => reg.clubId === clubId
  );

  if (existingAtClub) {
    return {
      canRegister: false,
      errors: [
        `Already ${existingAtClub.registrationType} member at this club (status: ${existingAtClub.status})`,
      ],
      warnings,
      hasPrimaryClub: activeRegistrations.some(
        (r) => r.registrationType === "primary"
      ),
      secondaryClubCount: activeRegistrations.filter(
        (r) => r.registrationType === "secondary"
      ).length,
      existingRegistration: {
        clubId: existingAtClub.clubId,
        status: existingAtClub.status,
        registrationType: existingAtClub.registrationType,
      },
    };
  }

  // Find primary club
  const primaryClub = activeRegistrations.find(
    (reg) => reg.registrationType === "primary"
  );

  // RULE 1: Primary club registration
  if (registrationType === "primary") {
    if (primaryClub) {
      errors.push(
        `Already have primary club registration at ${primaryClub.clubId}. ` +
          `You can only have one primary club. Register as secondary instead.`
      );
    }
  }

  // RULE 2: Secondary club registration
  if (registrationType === "secondary") {
    if (!primaryClub) {
      errors.push(
        "Must register with a primary club before registering with secondary clubs"
      );
    }
  }

  // Count secondary clubs
  const secondaryCount = activeRegistrations.filter(
    (reg) => reg.registrationType === "secondary"
  ).length;

  // Optional: Warning if many secondary clubs
  if (registrationType === "secondary" && secondaryCount >= 3) {
    warnings.push(
      `You are already registered with ${secondaryCount} secondary clubs`
    );
  }

  return {
    canRegister: errors.length === 0,
    errors,
    warnings,
    hasPrimaryClub: !!primaryClub,
    primaryClubId: primaryClub?.clubId,
    secondaryClubCount: secondaryCount,
  };
}

/**
 * Validate if member can be added to team
 * Member must have active registration at the club
 */
export function validateMemberForTeam(params: {
  memberId: string;
  clubId: string;
  registrations: ClubRegistration[];
}): {
  canAdd: boolean;
  error?: string;
  registration?: ClubRegistration;
} {
  const { memberId, clubId, registrations } = params;

  // Find registration at this club
  const clubRegistration = registrations.find((reg) => reg.clubId === clubId);

  if (!clubRegistration) {
    return {
      canAdd: false,
      error: "Member is not registered with this club",
    };
  }

  // Must be active or approved
  if (
    clubRegistration.status !== "active" &&
    clubRegistration.status !== "approved"
  ) {
    return {
      canAdd: false,
      error: `Member registration is ${clubRegistration.status}. Must be active or approved.`,
    };
  }

  return {
    canAdd: true,
    registration: clubRegistration,
  };
}

/**
 * Get registration status summary for member
 */
export function getRegistrationSummary(registrations: ClubRegistration[]): {
  hasPrimaryClub: boolean;
  primaryClub?: {
    clubId: string;
    status: RegistrationStatus;
  };
  secondaryClubs: Array<{
    clubId: string;
    status: RegistrationStatus;
  }>;
  pendingCount: number;
  activeCount: number;
} {
  const activeOrPending = registrations.filter(
    (reg) =>
      reg.status === "active" ||
      reg.status === "approved" ||
      reg.status === "pending"
  );

  const primary = activeOrPending.find(
    (reg) => reg.registrationType === "primary"
  );
  const secondary = activeOrPending.filter(
    (reg) => reg.registrationType === "secondary"
  );

  return {
    hasPrimaryClub: !!primary,
    primaryClub: primary
      ? { clubId: primary.clubId, status: primary.status }
      : undefined,
    secondaryClubs: secondary.map((reg) => ({
      clubId: reg.clubId,
      status: reg.status,
    })),
    pendingCount: registrations.filter((reg) => reg.status === "pending")
      .length,
    activeCount: registrations.filter((reg) => reg.status === "active").length,
  };
}

/**
 * Generate registration ID
 */
export function generateRegistrationId(
  clubId: string,
  memberId: string,
  registrationType: RegistrationType
): string {
  const timestamp = Date.now().toString(36);
  const type = registrationType === "primary" ? "P" : "S";
  return `REG-${clubId}-${memberId}-${type}-${timestamp}`;
}

/**
 * Validate approval request
 */
export function validateApproval(registration: ClubRegistration): {
  canApprove: boolean;
  error?: string;
} {
  if (registration.status !== "pending") {
    return {
      canApprove: false,
      error: `Cannot approve registration with status: ${registration.status}`,
    };
  }

  return { canApprove: true };
}

/**
 * Validate rejection request
 */
export function validateRejection(registration: ClubRegistration): {
  canReject: boolean;
  error?: string;
} {
  if (registration.status !== "pending") {
    return {
      canReject: false,
      error: `Cannot reject registration with status: ${registration.status}`,
    };
  }

  return { canReject: true };
}

/**
 * Check if member can transfer primary club
 */
export function canTransferPrimaryClub(params: {
  currentRegistrations: ClubRegistration[];
  newClubId: string;
}): {
  canTransfer: boolean;
  errors: string[];
  warnings: string[];
  mustCancelTeams?: boolean;
} {
  const { currentRegistrations, newClubId } = params;

  const errors: string[] = [];
  const warnings: string[] = [];

  // Find current primary club
  const currentPrimary = currentRegistrations.find(
    (reg) =>
      reg.registrationType === "primary" &&
      (reg.status === "active" || reg.status === "approved")
  );

  if (!currentPrimary) {
    errors.push("No active primary club to transfer from");
  }

  if (currentPrimary && currentPrimary.clubId === newClubId) {
    errors.push("Already registered as primary member at this club");
  }

  // Check if already registered at new club
  const existingAtNewClub = currentRegistrations.find(
    (reg) =>
      reg.clubId === newClubId &&
      (reg.status === "active" ||
        reg.status === "approved" ||
        reg.status === "pending")
  );

  if (existingAtNewClub) {
    if (existingAtNewClub.registrationType === "secondary") {
      warnings.push(
        "You have a secondary registration at this club. It will be converted to primary."
      );
    } else {
      errors.push("Already have pending or active registration at this club");
    }
  }

  // TODO: Check team registrations at current primary club
  // If member is in teams at current primary club, they must be removed first
  warnings.push(
    "Transferring primary club may affect team registrations. " +
      "You may need to be removed from teams at your current primary club."
  );

  return {
    canTransfer: errors.length === 0,
    errors,
    warnings,
    mustCancelTeams: !!currentPrimary, // If has primary, may need to cancel teams
  };
}
