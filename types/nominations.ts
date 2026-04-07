// types/nominations.ts
// Types for the full nomination system:
//   - Rep team player nominations (existing, extended)
//   - Grade/division preferences
//   - Club and association position nominations (approval workflow)
//   - Board/governance nominations (ballot/election workflow)

// ── Nomination category ───────────────────────────────────────────────────────

/**
 * The broad category of a nomination window.
 *   rep-team      → player nominates for a representative age-group team
 *   grade-pref    → player states preferred competition grade (informal)
 *   club-position → nomination for a club role (coach, manager, secretary…)
 *   assoc-position→ nomination for an association role at any level
 */
export type NominationCategory =
  | "rep-team"
  | "grade-pref"
  | "club-position"
  | "assoc-position";

/**
 * Whether accepted nominations follow an approval (admin decides) or
 * ballot (eligible members vote) workflow.
 */
export type NominationWorkflow = "approval" | "ballot";

// ── Nomination window status lifecycle ───────────────────────────────────────
//   draft → open → closed → (balloting) → completed
//   Rep-team approval path: closed → finalised → ratified → published
export type WindowStatus = "draft" | "open" | "closed" | "balloting" | "completed"
  | "finalised"   // Chair has locked the squad — pending ratification
  | "ratified"    // Approved members have ratified — pending publish
  | "published";  // Squad publicly announced; emails sent

// ── Nomination status lifecycle ───────────────────────────────────────────────
export type NominationStatus =
  | "pending"            // submitted, awaiting action
  | "pending-acceptance" // third-party nomination — waiting for nominee to accept
  | "accepted"           // approval workflow: admin approved
  | "rejected"           // approval workflow: admin rejected
  | "withdrawn"          // nominee or nominator withdrew
  | "on-ballot"          // ballot workflow: included in ballot
  | "elected"            // ballot workflow: won
  | "unsuccessful";      // ballot workflow: lost

export type DivisionType = "junior" | "opens" | "masters";

// ── Eligibility ───────────────────────────────────────────────────────────────

export interface AgeEligibilityRange {
  minAge: number;
  maxAge: number | null;  // null = no upper bound (e.g. opens)
  divisionType: DivisionType;
  description: string;
}

// ── Nomination window ─────────────────────────────────────────────────────────

export interface NominationWindow {
  windowId: string;
  category: NominationCategory;
  workflow: NominationWorkflow;

  title: string;
  description?: string;

  // Playing nominations
  ageGroup?: string;         // "U16", "Open", "Masters 40"
  gender?: "open" | "male" | "female";
  linkedTournamentId?: string;

  // Position nominations
  positionTitle?: string;    // "Club Secretary", "U16 Head Coach"
  positionRole?: string;     // maps to UserRole e.g. "coach", "registrar"

  // Scope
  scopeType: "club" | "association";
  scopeId: string;
  scopeName: string;
  /** For rep-team and assoc-position: which tier of the hierarchy */
  associationLevel?: "city" | "state" | "national";

  seasonYear: string;

  // Dates
  openDate: string;   // ISO — when nominations open
  closeDate: string;  // ISO — when nominations close

  // Rep-team birth year eligibility
  /** Inclusive minimum birth year (e.g. 2008 for U18 2026) */
  minBirthYear?: number;
  /** Inclusive maximum birth year (e.g. 2010 for U18 2026; "1 year young" rule) */
  maxBirthYear?: number;

  requiresFinancialMembership: boolean;
  requiresStatement: boolean;

  // Ballot config (ballot workflow only)
  /** Who can vote: "committee" (default) | "all-members" */
  electorateType?: "committee" | "all-members";
  /** Voter eligibility snapshot — populated when ballot opens */
  eligibleVoterIds?: string[];

  status: WindowStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;

  // Rep-team finalise → ratify → publish timestamps
  finalisedAt?: string;
  finalisedBy?: string;
  ratifiedAt?: string;
  ratifiedBy?: string;
  publishedAt?: string;
  publishedBy?: string;
}

// ── Nomination document ───────────────────────────────────────────────────────

export interface EligibilitySnapshot {
  ageEligible: boolean;
  financiallyCleared: boolean;
  noConflictOfInterest: boolean;  // family member not in team
  noPositionConflict: boolean;    // not holding same position at another club in same city
}

export interface Nomination {
  _id?: string;
  nominationId: string;

  windowId: string;

  // These mirror legacy fields for rep-team backwards compat
  season: string;
  ageGroup: string;
  clubId: string;
  clubName: string;

  // Nominee
  nomineeId: string;       // memberId or userId
  nomineeName: string;
  nomineeType: "member" | "user";

  /** Legacy compat */
  memberId?: string;
  playerId?: string;
  memberName?: string;

  dateOfBirth: string;
  ageAtSeason: number;

  // Third-party nomination
  nominatedBy?: string;
  nominatedByName?: string;
  nomineeAccepted?: boolean;
  nomineeAcceptedAt?: string;

  // Content
  statement?: string;
  preferredGrade?: string;  // grade-pref only
  notes?: string;

  // Eligibility audit (immutable once submitted)
  eligibilityChecks?: EligibilitySnapshot;

  status: NominationStatus;

  // Outcome (approval workflow)
  reviewedBy?: string;
  reviewedByName?: string;
  reviewerRole?: string;
  reviewedAt?: string;
  reviewNotes?: string;

  // Rep squad designations (set after acceptance)
  /** true = shadow / train-on player (not full squad) */
  isShadow?: boolean;
  /** Structured withdrawal info when status changes to "withdrawn" */
  withdrawalInfo?: {
    reason: "injury" | "personal" | "holiday" | "work" | "other";
    note?: string;
    withdrawnAt: string;
  };
  /** Display order within the squad (lower = higher) */
  squadOrder?: number;

  // Auto-linked role assignment when accepted/elected
  linkedRoleRequestId?: string;
  roleAssignedAt?: string;

  nominatedAt: string;
  updatedAt: string;

  // Legacy
  nominationType?: string;
}

// ── Ballot ────────────────────────────────────────────────────────────────────

export type BallotStatus = "open" | "closed" | "deadlock" | "completed";

export interface Ballot {
  ballotId: string;
  windowId: string;
  ballotNumber: 1 | 2;
  parentBallotId?: string;

  candidateNominationIds: string[];
  eligibleVoterIds: string[];

  openAt: string;
  closeAt: string;
  status: BallotStatus;

  totalEligibleVoters: number;
  totalVotesCast: number;
  outcome?: "winner" | "deadlock";
  winnerId?: string;   // nominationId of winner

  createdAt: string;
  completedAt?: string;
}

// ── Ballot vote ───────────────────────────────────────────────────────────────

/**
 * One vote cast in a ballot. Stored in `ballot_votes` collection.
 * voterId is either a userId or memberId depending on the electorate.
 */
export interface BallotVote {
  voteId: string;
  ballotId: string;
  voterId: string;        // userId or memberId
  voterType: "user" | "member";
  nominationId: string;   // the candidateNominationId they voted for
  votedAt: string;
}

// ── Request bodies ────────────────────────────────────────────────────────────

export interface CreateNominationRequest {
  season: string;
  ageGroup: string;
  clubId: string;
  memberId?: string;
  playerId?: string;
  nominatedBy?: string;
  notes?: string;
  // Extended
  windowId?: string;
  statement?: string;
  preferredGrade?: string;
}

export interface CreateWindowRequest {
  category: NominationCategory;
  workflow: NominationWorkflow;
  title: string;
  description?: string;
  ageGroup?: string;
  gender?: "open" | "male" | "female";
  linkedTournamentId?: string;
  positionTitle?: string;
  positionRole?: string;
  scopeType: "club" | "association";
  scopeId: string;
  scopeName: string;
  associationLevel?: "city" | "state" | "national";
  seasonYear: string;
  openDate: string;
  closeDate: string;
  minBirthYear?: number;
  maxBirthYear?: number;
  requiresFinancialMembership?: boolean;
  requiresStatement?: boolean;
  electorateType?: "committee" | "all-members";
}

export interface DecideNominationRequest {
  action: "accept" | "reject" | "withdraw" | "accept-third-party" | "decline-third-party";
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewerRole?: string;
}

// ── Eligible member (unchanged — used by rep-team flow) ────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Age for a given season year (hockey convention: season year − birth year).
 */
export function calcAgeForSeason(dateOfBirth: string, seasonYear: number): number {
  return seasonYear - new Date(dateOfBirth).getFullYear();
}

/**
 * Eligibility range for a given age-group string.
 *
 *   "Under X"  → ages (X-2) to X     — but per the rules the age bracket is
 *                actually ±1 year, so min = X-1, max = X (born in X or X-1 of season)
 *                Corrected: under group can be 1 year younger (born year = maxBirthYear+1)
 *   "Open"     → age 16+, no upper bound
 *   "Masters X"→ ages (X-6) to (X-1)
 */
export function getEligibilityRange(ageGroup: string): AgeEligibilityRange | null {
  const juniorMatch = ageGroup.match(/^Under\s+(\d+)$/i);
  if (juniorMatch) {
    const maxAge = parseInt(juniorMatch[1], 10);
    return {
      minAge:       maxAge - 2,
      maxAge,
      divisionType: "junior",
      description:  `Ages ${maxAge - 2}–${maxAge} in the season year`,
    };
  }

  if (/^opens?$/i.test(ageGroup)) {
    return {
      minAge:       16,
      maxAge:       null,
      divisionType: "opens",
      description:  "Age 16 or older in the season year",
    };
  }

  const mastersMatch = ageGroup.match(/^Masters\s+(\d+)$/i);
  if (mastersMatch) {
    const categoryAge = parseInt(mastersMatch[1], 10);
    return {
      minAge:       categoryAge - 6,
      maxAge:       categoryAge - 1,
      divisionType: "masters",
      description:  `Ages ${categoryAge - 6}–${categoryAge - 1} in the season year`,
    };
  }

  return null;
}

/**
 * Check birth-year eligibility using the "1 year young" rule:
 *   - Must NOT be older than the age group (born after maxBirthYear is too young, but
 *     more commonly: their season-age must be <= group age)
 *   - CAN be 1 year younger (born one year earlier than the strict bracket)
 *
 * @param seasonYear  e.g. 2026
 * @param birthYear   player's birth year
 * @param groupAge    e.g. 18 for U18
 */
export function isBirthYearEligible(
  seasonYear: number,
  birthYear: number,
  groupAge: number,
): boolean {
  const playerAge = seasonYear - birthYear;
  // Max age = groupAge (not older)
  if (playerAge > groupAge) return false;
  // Min age = groupAge - 1 (1 year younger allowed per rules)
  if (playerAge < groupAge - 1) return false;
  return true;
}

/**
 * Check if a member is eligible for an age group in a given season year.
 * Uses the original ±2 range for backwards compat; new code should use isBirthYearEligible.
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

/**
 * Derive min/max birth years for a rep team age group in a given season.
 * groupAge = the number in "Under X" or "Open" / "Masters X".
 * Rule: player age must be groupAge OR groupAge-1 (one year young allowed).
 */
export function birthYearRangeForGroup(
  ageGroup: string,
  seasonYear: number,
): { minBirthYear: number; maxBirthYear: number } | null {
  const juniorMatch = ageGroup.match(/^Under\s+(\d+)$/i);
  if (juniorMatch) {
    const groupAge = parseInt(juniorMatch[1], 10);
    // age = seasonYear - birthYear  →  birthYear = seasonYear - age
    // maxAge = groupAge → minBirthYear = seasonYear - groupAge
    // minAge = groupAge-1 → maxBirthYear = seasonYear - (groupAge-1)
    return {
      minBirthYear: seasonYear - groupAge,
      maxBirthYear: seasonYear - (groupAge - 1),
    };
  }
  // Opens/Masters don't use birth year range the same way
  return null;
}

/**
 * Returns today as YYYY-MM-DD.
 */
export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * True if today is within the window's open/close dates.
 */
export function isWindowOpen(window: Pick<NominationWindow, "openDate" | "closeDate" | "status">): boolean {
  if (window.status !== "open") return false;
  const today = todayISO();
  return today >= window.openDate && today <= window.closeDate;
}
