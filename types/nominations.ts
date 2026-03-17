// types/nominations.ts
// Types for representative player nominations

export type NominationStatus = "pending" | "accepted" | "withdrawn" | "rejected";

export type DivisionType = "junior" | "opens" | "masters";

export interface AgeEligibilityRange {
  minAge: number;
  maxAge: number | null; // null means no upper bound (e.g., opens)
  divisionType: DivisionType;
  description: string;
}

export interface Nomination {
  _id?: string;              // MongoDB id (serialised to string)
  nominationId: string;
  season: string;            // e.g., "2026"
  ageGroup: string;          // e.g., "Under 14", "Opens", "Masters 40"
  clubId: string;
  clubName: string;          // denormalised for display
  memberId: string;
  memberName: string;        // denormalised for display
  dateOfBirth: string;       // ISO date string
  ageAtSeason: number;       // pre-calculated: season year - birth year
  nominatedBy?: string;
  nominatedAt: string;       // ISO date string
  status: NominationStatus;
  notes?: string;
  updatedAt: string;
}

export interface CreateNominationRequest {
  season: string;
  ageGroup: string;
  clubId: string;
  memberId: string;
  nominatedBy?: string;
  notes?: string;
}

export interface EligibleMember {
  memberId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  dateOfBirth: string;
  ageAtSeason: number;
  gender: string;
  clubId: string;
  clubName: string;
  alreadyNominated: boolean;
  nominationId?: string;
}

/**
 * Calculate age for a given season year (age = season year - birth year).
 * This matches the hockey registration convention.
 */
export function calcAgeForSeason(dateOfBirth: string, seasonYear: number): number {
  const birthYear = new Date(dateOfBirth).getFullYear();
  return seasonYear - birthYear;
}

/**
 * Determine the eligibility age range for a given age group string.
 *
 * Rules:
 *   Juniors "Under X"  → ages (X-2) to X  e.g. Under 14 → 12–14
 *   Opens              → age >= 16 (no upper bound)
 *   Masters "Masters X"→ ages (X-6) to (X-1)  e.g. Masters 40 → 34–39
 *                        (titles held following year, so max is X-1)
 */
export function getEligibilityRange(ageGroup: string): AgeEligibilityRange | null {
  const juniorMatch = ageGroup.match(/^Under\s+(\d+)$/i);
  if (juniorMatch) {
    const maxAge = parseInt(juniorMatch[1], 10);
    return {
      minAge: maxAge - 2,
      maxAge,
      divisionType: "junior",
      description: `Ages ${maxAge - 2}–${maxAge} in the season year`,
    };
  }

  if (/^opens?$/i.test(ageGroup)) {
    return {
      minAge: 16,
      maxAge: null,
      divisionType: "opens",
      description: "Age 16 or older in the season year",
    };
  }

  const mastersMatch = ageGroup.match(/^Masters\s+(\d+)$/i);
  if (mastersMatch) {
    const categoryAge = parseInt(mastersMatch[1], 10);
    return {
      minAge: categoryAge - 6,
      maxAge: categoryAge - 1,
      divisionType: "masters",
      description: `Ages ${categoryAge - 6}–${categoryAge - 1} in the season year (titles held following year)`,
    };
  }

  return null;
}

/**
 * Check if a member is eligible for an age group in a given season year.
 */
export function isEligibleForAgeGroup(
  dateOfBirth: string,
  ageGroup: string,
  seasonYear: number,
): boolean {
  const range = getEligibilityRange(ageGroup);
  if (!range) return false;
  const age = calcAgeForSeason(dateOfBirth, seasonYear);
  if (age < range.minAge) return false;
  if (range.maxAge !== null && age > range.maxAge) return false;
  return true;
}
