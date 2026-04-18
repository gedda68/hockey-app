// types/tournaments.ts
// Types for representative tournaments and nomination periods

import type { TournamentDrawState } from "@/lib/db/schemas/repTournamentDraw.schema";

export type { TournamentDrawState };

// ─── Tournament ───────────────────────────────────────────────────────────────

export type TournamentGender = "male" | "female" | "mixed";

/** D1 — Who runs the event; RBAC uses host + branding association. */
export type TournamentHostType = "association" | "club";

/** D2 — Which clubs may enter (enforced on team tournament entry). */
export type TournamentEntryEligibility =
  | "branding_association_clubs"
  | "host_association_clubs"
  | "host_club_only"
  | "explicit_clubs";

/** D2 — Entry caps, deadlines, team entry fee hint (cents). */
export interface TournamentEntryRules {
  entryEligibility: TournamentEntryEligibility;
  allowedClubIds: string[];
  maxTeams: number | null;
  entryOpensAt: string | null;
  entryClosesAt: string | null;
  withdrawalDeadline: string | null;
  entryFeeCents: number | null;
}

export interface Tournament {
  _id?: string;             // MongoDB id (serialised to string)
  tournamentId: string;
  season: string;           // e.g. "2026"
  ageGroup: string;         // e.g. "Under 14", "Opens", "Masters 40"
  gender: TournamentGender; // e.g. "male", "female", "mixed"
  title: string;            // e.g. "2026 Queensland Hockey Under 14 Championships"
  startDate: string;        // ISO date string (YYYY-MM-DD)
  endDate: string;          // ISO date string (YYYY-MM-DD)
  location: string;         // e.g. "Hockey World, Gold Coast"
  additionalInfo: string;   // Rich-text HTML
  nominationFee?: number;   // AUD dollars
  /** D1: `association` → `hostId` is associationId; `club` → `hostId` is club `id`. */
  hostType?: TournamentHostType;
  hostId?: string | null;
  /** D1: Association scope for permissions / branding (parent when club hosts). */
  brandingAssociationId?: string | null;
  /** D2: Optional; when absent, eligibility falls back to permissive / branding-only when set. */
  entryRules?: TournamentEntryRules;
  /** D3: Pools, knockout skeleton, seeds (persisted on `rep_tournaments.draw`). */
  draw?: TournamentDrawState;
  /** When true, fixture results default to submitted and need approval before public display. */
  resultApprovalRequired?: boolean;
  /** Declared champion (team tournament entry id). */
  championEntryId?: string | null;
  /** Denormalised team label for public display. */
  championTeamName?: string | null;
  /**
   * Optional display overrides for standard awards (player of match, MVP, etc.).
   * Keys match the admin API; see `AwardsLabels` in `lib/db/schemas/competitionAwards.schema`.
   */
  awardsLabels?: Partial<{
    playerOfMatch: string;
    playerOfCompetition: string;
    topGoalScorer: string;
    rookie: string;
    goalkeeper: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTournamentRequest {
  season: string;
  ageGroup: string;
  gender?: TournamentGender;
  title: string;
  startDate: string;
  endDate: string;
  location: string;
  additionalInfo?: string;
  nominationFee?: number;
  hostType?: TournamentHostType;
  hostId?: string;
  /** Optional when host is association; defaults to hostId. Ignored for club host (must match parent). */
  brandingAssociationId?: string;
  entryRules?: Partial<TournamentEntryRules>;
  resultApprovalRequired?: boolean;
  championEntryId?: string | null;
}

// ─── Nomination Period ────────────────────────────────────────────────────────

export type PeriodStatus = "upcoming" | "open" | "closed";

export interface NominationPeriod {
  _id?: string;
  periodId: string;
  season: string;
  ageGroup: string;
  startDate: string;          // ISO date YYYY-MM-DD
  endDate: string;            // ISO date YYYY-MM-DD
  isStartCustom: boolean;     // true = admin has manually overridden the start date
  isEndCustom: boolean;       // true = admin has manually overridden the end date
  linkedTournamentId?: string;// tournamentId that drove the calculated endDate
  createdAt: string;
  updatedAt: string;
}

export interface UpsertNominationPeriodRequest {
  season: string;
  ageGroup: string;
  startDate: string;
  endDate: string;
  isStartCustom?: boolean;
  isEndCustom?: boolean;
  linkedTournamentId?: string;
}

// ─── Open Opportunity ─────────────────────────────────────────────────────────

export interface OpenOpportunity {
  ageGroup: string;
  season: string;
  tournamentId: string;
  tournamentTitle: string;
  tournamentGender: TournamentGender;
  tournamentLocation: string;
  tournamentStartDate: string;
  tournamentEndDate: string;
  nominationPeriodStart: string;
  nominationPeriodEnd: string;
  daysRemaining: number;
  nominationFee: number;
  eligibilityRange: {
    minAge: number;
    maxAge: number | null;
    divisionType: string;
    description: string;
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Return the ISO date (YYYY-MM-DD) for Jan 1 of a given year — the default
 * nomination start date.
 */
export function defaultNominationStart(year: number | string): string {
  return `${year}-01-01`;
}

/**
 * Return the ISO date of the Friday that falls exactly 8 weeks (56 days)
 * before the given tournament start date, or the nearest preceding Friday
 * if that day is not already a Friday.
 *
 * This is the default nomination close date: clubs have until that Friday
 * to nominate players, so the rep selectors have time before the tournament.
 */
export function friday8WeeksBefore(tournamentStartDate: string): string {
  const date = new Date(tournamentStartDate + "T00:00:00");
  date.setDate(date.getDate() - 56);                 // go back 8 weeks

  // (day + 2) % 7 gives the number of days to step back to reach Friday:
  // Sun=0 → 2, Mon=1 → 3, Tue=2 → 4, Wed=3 → 5, Thu=4 → 6, Fri=5 → 0, Sat=6 → 1
  const daysBack = (date.getDay() + 2) % 7;
  date.setDate(date.getDate() - daysBack);

  return date.toISOString().split("T")[0];
}

/**
 * Derive a period status from today's date vs the period's start/end.
 */
export function getPeriodStatus(
  startDate: string,
  endDate: string,
): PeriodStatus {
  const today = new Date().toISOString().split("T")[0];
  if (today < startDate) return "upcoming";
  if (today > endDate) return "closed";
  return "open";
}

/**
 * Human-readable countdown or elapsed string, e.g.
 *   "Opens in 12 days" | "12 days remaining" | "Closed 3 days ago"
 */
export function periodCountdown(startDate: string, endDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  const msPerDay = 86_400_000;

  if (today < start) {
    const days = Math.round((start.getTime() - today.getTime()) / msPerDay);
    return `Opens in ${days} day${days !== 1 ? "s" : ""}`;
  }
  if (today > end) {
    const days = Math.round((today.getTime() - end.getTime()) / msPerDay);
    return `Closed ${days} day${days !== 1 ? "s" : ""} ago`;
  }
  const days = Math.round((end.getTime() - today.getTime()) / msPerDay);
  return `${days} day${days !== 1 ? "s" : ""} remaining`;
}

/** Normalise any gender string to "male" | "female" | "" */
export function normaliseGender(raw: string | undefined | null): "male" | "female" | "" {
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower.includes("female") || lower === "f") return "female";
  if (lower.includes("male") || lower === "m") return "male";
  return "";
}

/** Check if a player's gender qualifies for a tournament's gender restriction */
export function isGenderEligible(
  playerGender: string | undefined | null,
  tournamentGender: TournamentGender,
): boolean {
  if (tournamentGender === "mixed") return true;
  const pg = normaliseGender(playerGender);
  if (!pg) return true; // unknown gender: let admin decide
  return pg === tournamentGender;
}
