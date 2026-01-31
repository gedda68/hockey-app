// lib/validation/association-registration-validation.ts
// Association registration validation functions

import type {
  AssociationRegistration,
  AssociationRegistrationValidation,
  MemberEligibility,
  RegistrationWorkflowState,
} from "@/types/association-registration";
import type { ClubRegistration } from "@/types/club-registration";

// ============================================================================
// ASSOCIATION REGISTRATION VALIDATION
// ============================================================================

/**
 * Validate if member can register for association
 */
export function validateAssociationRegistration(params: {
  memberId: string;
  associationId: string;
  seasonYear: string;
  existingRegistrations: AssociationRegistration[];
}): AssociationRegistrationValidation {
  const { memberId, associationId, seasonYear, existingRegistrations } = params;

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if already registered for this association and season
  const existingForSeason = existingRegistrations.find(
    (reg) =>
      reg.associationId === associationId &&
      reg.seasonYear === seasonYear &&
      (reg.status === "active" ||
        reg.status === "approved" ||
        reg.status === "pending")
  );

  if (existingForSeason) {
    return {
      canRegister: false,
      errors: [
        `Already registered with this association for ${seasonYear} season (status: ${existingForSeason.status})`,
      ],
      warnings,
      hasExistingRegistration: true,
      existingRegistration: {
        registrationId: existingForSeason.registrationId,
        status: existingForSeason.status,
        seasonYear: existingForSeason.seasonYear,
        expiryDate: existingForSeason.expiryDate,
      },
    };
  }

  // Check for expired registration that needs renewal
  const expiredForSeason = existingRegistrations.find(
    (reg) =>
      reg.associationId === associationId &&
      reg.seasonYear === seasonYear &&
      reg.status === "expired"
  );

  if (expiredForSeason) {
    warnings.push(
      "Previous registration expired. This will create a new registration."
    );
  }

  return {
    canRegister: true,
    errors,
    warnings,
    hasExistingRegistration: false,
  };
}

/**
 * Check member eligibility for teams
 * Member must have BOTH association AND club registrations active
 */
export function checkMemberEligibility(params: {
  memberId: string;
  clubId: string;
  associationRegistrations: AssociationRegistration[];
  clubRegistrations: ClubRegistration[];
  currentSeasonYear: string;
}): MemberEligibility {
  const {
    memberId,
    clubId,
    associationRegistrations,
    clubRegistrations,
    currentSeasonYear,
  } = params;

  const blockers: string[] = [];
  const warnings: string[] = [];

  // Check association registration
  const associationReg = associationRegistrations.find(
    (reg) =>
      reg.seasonYear === currentSeasonYear &&
      (reg.status === "active" || reg.status === "approved")
  );

  const hasAssociationRegistration = !!associationReg;

  if (!hasAssociationRegistration) {
    const pendingAssociation = associationRegistrations.find(
      (reg) => reg.seasonYear === currentSeasonYear && reg.status === "pending"
    );

    if (pendingAssociation) {
      blockers.push("Association registration is pending approval");
    } else {
      blockers.push("Not registered with association for current season");
    }
  }

  // Check if association registration expired
  if (associationReg?.expiryDate) {
    const now = new Date();
    const expiryDate = new Date(associationReg.expiryDate);

    if (expiryDate < now) {
      blockers.push("Association registration has expired");
    } else {
      // Check if expiring soon (within 30 days)
      const daysUntilExpiry = Math.floor(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry <= 30) {
        warnings.push(
          `Association registration expires in ${daysUntilExpiry} days`
        );
      }
    }
  }

  // Check club registration
  const clubReg = clubRegistrations.find(
    (reg) =>
      reg.clubId === clubId &&
      (reg.status === "active" || reg.status === "approved")
  );

  const hasClubRegistration = !!clubReg;

  if (!hasClubRegistration) {
    const pendingClub = clubRegistrations.find(
      (reg) => reg.clubId === clubId && reg.status === "pending"
    );

    if (pendingClub) {
      blockers.push("Club registration is pending approval");
    } else {
      blockers.push("Not registered with this club");
    }
  }

  // Member is eligible if they have both active registrations and no blockers
  const isEligible =
    hasAssociationRegistration && hasClubRegistration && blockers.length === 0;

  return {
    isEligible,
    hasAssociationRegistration,
    associationStatus: associationReg?.status,
    associationExpiryDate: associationReg?.expiryDate,
    hasClubRegistration,
    clubStatus: clubReg?.status,
    blockers,
    warnings,
    associationRegistration: associationReg
      ? {
          registrationId: associationReg.registrationId,
          associationId: associationReg.associationId,
          associationName: getAssociationName(associationReg.associationId),
          status: associationReg.status,
          seasonYear: associationReg.seasonYear,
        }
      : undefined,
    clubRegistration: clubReg
      ? {
          registrationId: clubReg.registrationId,
          clubId: clubReg.clubId,
          clubName: "", // Would be populated from club data
          status: clubReg.status,
          registrationType: clubReg.registrationType,
        }
      : undefined,
  };
}

/**
 * Get registration workflow state for member
 * Determines what step they're on and what they need to do next
 */
export function getRegistrationWorkflowState(params: {
  associationRegistrations: AssociationRegistration[];
  clubRegistrations: ClubRegistration[];
  currentSeasonYear: string;
}): RegistrationWorkflowState {
  const { associationRegistrations, clubRegistrations, currentSeasonYear } =
    params;

  // Check association registration
  const associationReg = associationRegistrations.find(
    (reg) => reg.seasonYear === currentSeasonYear
  );

  const associationComplete =
    associationReg?.status === "active" ||
    associationReg?.status === "approved";

  // Check club registration (any active club)
  const activeClubReg = clubRegistrations.find(
    (reg) => reg.status === "active" || reg.status === "approved"
  );

  const clubComplete = !!activeClubReg;

  // Determine current step
  let currentStep: "association" | "club" | "complete";
  let nextAction: RegistrationWorkflowState["nextAction"];
  let canJoinTeams = false;
  let eligibilityMessage: string | undefined;

  if (!associationReg) {
    // No association registration at all
    currentStep = "association";
    nextAction = {
      type: "register-association",
      description: "Register with Hockey Association",
      actionUrl: "/register/association",
    };
    eligibilityMessage = "Complete association registration to continue";
  } else if (associationReg.status === "pending") {
    // Association pending approval
    currentStep = "association";
    nextAction = {
      type: "await-approval",
      description: "Awaiting association approval",
    };
    eligibilityMessage = "Association registration pending approval";
  } else if (associationReg.status === "rejected") {
    // Association rejected
    currentStep = "association";
    eligibilityMessage = "Association registration was rejected";
  } else if (associationComplete && !clubComplete) {
    // Association complete, need club
    currentStep = "club";

    const pendingClub = clubRegistrations.find(
      (reg) => reg.status === "pending"
    );

    if (pendingClub) {
      nextAction = {
        type: "await-approval",
        description: "Awaiting club approval",
      };
      eligibilityMessage = "Club registration pending approval";
    } else {
      nextAction = {
        type: "register-club",
        description: "Register with a club",
        actionUrl: "/clubs",
      };
      eligibilityMessage = "Register with a club to join teams";
    }
  } else if (associationComplete && clubComplete) {
    // Both complete!
    currentStep = "complete";
    nextAction = {
      type: "complete",
      description: "Registration complete",
    };
    canJoinTeams = true;
    eligibilityMessage = "Eligible to join teams";
  } else {
    // Shouldn't happen, but default to association
    currentStep = "association";
    nextAction = {
      type: "register-association",
      description: "Complete association registration",
    };
  }

  return {
    associationRegistrationComplete: associationComplete,
    clubRegistrationComplete: clubComplete,
    currentStep,
    nextAction,
    associationStatus: associationReg?.status,
    clubStatus: activeClubReg?.status,
    canJoinTeams,
    eligibilityMessage,
  };
}

/**
 * Generate association registration ID
 */
export function generateAssociationRegistrationId(
  associationId: string,
  memberId: string,
  seasonYear: string
): string {
  const timestamp = Date.now().toString(36);
  return `AREG-${associationId}-${memberId}-${seasonYear}-${timestamp}`;
}

/**
 * Get association name by ID
 */
function getAssociationName(associationId: string): string {
  const associations: Record<string, string> = {
    bha: "Brisbane Hockey Association",
    gcha: "Gold Coast Hockey Association",
    iha: "Ipswich Hockey Association",
  };

  return associations[associationId] || associationId;
}

/**
 * Calculate season year from date
 */
export function getCurrentSeasonYear(date: Date = new Date()): string {
  // Hockey season typically runs Jan-Dec
  // Could be made more sophisticated with association settings
  return date.getFullYear().toString();
}

/**
 * Get default expiry date for season
 */
export function getDefaultExpiryDate(seasonYear: string): Date {
  // Default to December 31st of the season year
  return new Date(`${seasonYear}-12-31T23:59:59`);
}
