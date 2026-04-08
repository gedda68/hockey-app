/**
 * types/teamTournament.ts
 *
 * Data model for team tournament entries and the per-member fee allocations
 * derived from them.
 *
 * Flow:
 *   1. Admin creates a TeamTournamentEntry linking a team to a tournament.
 *   2. Admin adds fee items (accommodation, flights, etc.) with total costs.
 *   3. Admin selects attending members and clicks "Distribute Fees".
 *   4. The system creates/updates MemberTournamentFee documents — one per attendee.
 *   5. Members see their itemised share on the My Fees dashboard.
 *
 * Collections:
 *   team_tournament_entries   — one per team-tournament combination
 *   member_tournament_fees    — one per member per entry (denormalised for fast lookup)
 */

// ── Fee item categories ────────────────────────────────────────────────────────

export type TournamentFeeCategory =
  | "entry"
  | "accommodation"
  | "flights"
  | "transfers"
  | "food"
  | "sundries"
  | "staff"
  | "other";

export const TOURNAMENT_FEE_CATEGORIES: Record<TournamentFeeCategory, string> = {
  entry:         "Tournament Entry Fee",
  accommodation: "Accommodation",
  flights:       "Flights",
  transfers:     "Transfers & Transport",
  food:          "Food & Meals",
  sundries:      "Sundries & Miscellaneous",
  staff:         "Staff & Coaching Costs",
  other:         "Other",
};

// ── Entry status ───────────────────────────────────────────────────────────────

export type EntryStatus = "draft" | "registered" | "confirmed" | "withdrawn";

// ── Fee item (team-level) ──────────────────────────────────────────────────────

export interface TeamFeeItem {
  /** Unique within the entry. Generated as `item-<timestamp>`. */
  itemId: string;
  category: TournamentFeeCategory;
  /** Display name, e.g. "Motel Accommodation (3 nights)" */
  name: string;
  description?: string;
  /** Total cost for the entire team, in cents. */
  totalAmountCents: number;
  /**
   * How to split between attending members.
   *   "equal" — totalAmountCents / attendingCount (rounded to nearest cent, remainder on first)
   *   "manual" — per-member amounts set explicitly in MemberTournamentFee
   */
  splitMethod: "equal" | "manual";
  gstIncluded: boolean;
  notes?: string;
}

// ── Per-member allocation item ─────────────────────────────────────────────────

export interface MemberFeeAllocationItem {
  /** References TeamFeeItem.itemId */
  itemId: string;
  category: TournamentFeeCategory;
  name: string;
  /** This member's share, in cents. */
  amountCents: number;
  status: "outstanding" | "paid" | "waived";
  paymentId?: string;
  paidDate?: string;
  /** Waiver — must include reason and granter info for audit trail. */
  waiver?: {
    grantedBy: string;
    grantedByName: string;
    grantedAt: string;
    reason: string;
  };
}

// ── Member tournament fee document ────────────────────────────────────────────

/** MongoDB collection: member_tournament_fees */
export interface MemberTournamentFee {
  allocationId: string; // "mtf-{memberId}-{entryId}"
  memberId: string;
  memberName: string; // denormalised: "Firstname Lastname"
  entryId: string;    // references team_tournament_entries
  teamId: string;
  teamName: string;   // denormalised
  clubId: string;
  tournamentId: string;
  tournamentTitle: string; // denormalised
  season: string;
  ageGroup: string;
  items: MemberFeeAllocationItem[];
  /** Computed totals — kept in sync on every write. */
  totalCents: number;
  paidCents: number;
  outstandingCents: number;
  waivedCents: number;
  status: "outstanding" | "partially-paid" | "paid" | "waived";
  createdAt: Date;
  updatedAt: Date;
}

// ── Team tournament entry document ────────────────────────────────────────────

/** MongoDB collection: team_tournament_entries */
export interface TeamTournamentEntry {
  entryId: string; // "tte-{teamId}-{tournamentId}"
  teamId: string;
  teamName: string;    // denormalised
  clubId: string;
  clubName: string;    // denormalised
  tournamentId: string;
  tournamentTitle: string; // denormalised
  season: string;
  ageGroup: string;
  /** Same idea as team `ageGroupLabel` (e.g. "Under 14"); may mirror `ageGroup`. */
  ageGroupLabel?: string;
  gender: string;
  /** Denormalised from team / competition division. */
  grade?: string;
  /** Matches `season_competitions.divisions[].divisionId` when set on the team. */
  competitionDivisionId?: string;
  startDate: string; // ISO date
  endDate: string;   // ISO date
  location: string;
  status: EntryStatus;
  /** Fee line items representing total team costs. */
  feeItems: TeamFeeItem[];
  /**
   * Member IDs of players/staff who are attending.
   * Subset of the team roster — admins select who is going.
   */
  attendingMemberIds: string[];
  /** Totals across all feeItems. */
  totalFeesCents: number;
  /** Computed from memberAllocations. */
  totalCollectedCents: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// ── API request/response types ─────────────────────────────────────────────────

export interface CreateEntryBody {
  teamId: string;
  tournamentId: string;
  status?: EntryStatus;
  notes?: string;
}

export interface UpdateEntryBody {
  status?: EntryStatus;
  feeItems?: TeamFeeItem[];
  attendingMemberIds?: string[];
  notes?: string;
}

export interface DistributeFeesBody {
  /** Optionally override specific member amounts (for "manual" split items). */
  overrides?: Record<string, Record<string, number>>; // memberId → itemId → amountCents
}

/** Summary returned in list endpoints. */
export interface TeamTournamentEntrySummary {
  entryId: string;
  teamId: string;
  teamName: string;
  clubName: string;
  tournamentId: string;
  tournamentTitle: string;
  season: string;
  ageGroup: string;
  ageGroupLabel?: string;
  grade?: string;
  competitionDivisionId?: string;
  startDate: string;
  status: EntryStatus;
  attendingCount: number;
  totalFeesCents: number;
  totalCollectedCents: number;
  outstandingCents: number;
}
