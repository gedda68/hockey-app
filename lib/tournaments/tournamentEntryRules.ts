// D2 — Entry rules: eligibility, deadlines, max teams, entry fee (cents).

import type { Db } from "mongodb";
import type { TournamentEntryRules } from "@/types/tournaments";
import { TournamentEntryRulesSchema } from "@/lib/db/schemas/repTournament.schema";

export type RepTournamentDoc = {
  tournamentId: string;
  hostType?: string | null;
  hostId?: string | null;
  brandingAssociationId?: string | null;
  entryRules?: Partial<TournamentEntryRules> | null;
};

export const DEFAULT_TOURNAMENT_ENTRY_RULES: TournamentEntryRules = {
  entryEligibility: "branding_association_clubs",
  allowedClubIds: [],
  maxTeams: null,
  entryOpensAt: null,
  entryClosesAt: null,
  withdrawalDeadline: null,
  entryFeeCents: null,
};

/** Calendar YYYY-MM-DD from ISO or date string. */
export function calendarDateKey(iso: string): string {
  return iso.trim().slice(0, 10);
}

export function todayCalendarKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** True if `day` is strictly after `deadlineDay` (withdrawal no longer allowed). */
export function isPastInclusiveDeadline(deadline: string | null | undefined): boolean {
  if (!deadline?.trim()) return false;
  return todayCalendarKey() > calendarDateKey(deadline);
}

/** True if entry window is not yet open. */
export function isBeforeEntryOpens(opensAt: string | null | undefined): boolean {
  if (!opensAt?.trim()) return false;
  return todayCalendarKey() < calendarDateKey(opensAt);
}

/** True if entry window has closed (after closesAt day). */
export function isAfterEntryCloses(closesAt: string | null | undefined): boolean {
  if (!closesAt?.trim()) return false;
  return todayCalendarKey() > calendarDateKey(closesAt);
}

export function mergeEntryRules(
  existing: Partial<TournamentEntryRules> | null | undefined,
  patch: Partial<TournamentEntryRules> | undefined,
): TournamentEntryRules {
  const raw = {
    ...DEFAULT_TOURNAMENT_ENTRY_RULES,
    ...(existing ?? {}),
    ...(patch ?? {}),
  };
  const parsed = TournamentEntryRulesSchema.parse(raw);
  return {
    entryEligibility: parsed.entryEligibility,
    allowedClubIds: parsed.allowedClubIds ?? [],
    maxTeams: parsed.maxTeams ?? null,
    entryOpensAt: parsed.entryOpensAt ?? null,
    entryClosesAt: parsed.entryClosesAt ?? null,
    withdrawalDeadline: parsed.withdrawalDeadline ?? null,
    entryFeeCents: parsed.entryFeeCents ?? null,
  };
}

export function effectiveEntryRules(tournament: RepTournamentDoc): TournamentEntryRules {
  return mergeEntryRules(tournament.entryRules ?? undefined, undefined);
}

export async function countTournamentTeamEntries(
  db: Db,
  tournamentId: string,
): Promise<number> {
  return db.collection("team_tournament_entries").countDocuments({
    tournamentId,
    status: { $nin: ["withdrawn"] },
  });
}

type ClubDoc = { id?: string; parentAssociationId?: string };

/**
 * Whether a club may register a team for this tournament under D2 rules.
 */
export function evaluateClubEntryEligibility(
  tournament: RepTournamentDoc,
  club: ClubDoc | null,
  rules: TournamentEntryRules,
): { ok: true } | { ok: false; code: string; message: string } {
  if (!club?.id) {
    return { ok: false, code: "club_not_found", message: "Club not found for team." };
  }

  const clubId = club.id;
  const parentAssoc = club.parentAssociationId?.trim() ?? "";

  switch (rules.entryEligibility) {
    case "explicit_clubs": {
      const allowed = rules.allowedClubIds ?? [];
      if (allowed.length === 0) {
        return {
          ok: false,
          code: "explicit_clubs_empty",
          message:
            "Tournament entry is restricted to an explicit club list, but no clubs are configured.",
        };
      }
      if (!allowed.includes(clubId)) {
        return {
          ok: false,
          code: "club_not_allowed",
          message: "This club is not on the tournament's allowed entry list.",
        };
      }
      return { ok: true };
    }
    case "host_club_only": {
      if (tournament.hostType !== "club" || !tournament.hostId?.trim()) {
        return {
          ok: false,
          code: "invalid_host_mode",
          message: "host_club_only requires a club-hosted tournament.",
        };
      }
      if (clubId !== tournament.hostId.trim()) {
        return {
          ok: false,
          code: "wrong_host_club",
          message: "Only the host club may enter teams for this tournament.",
        };
      }
      return { ok: true };
    }
    case "host_association_clubs": {
      if (tournament.hostType !== "association" || !tournament.hostId?.trim()) {
        return {
          ok: false,
          code: "invalid_host_mode",
          message: "host_association_clubs requires an association-hosted tournament.",
        };
      }
      if (parentAssoc !== tournament.hostId.trim()) {
        return {
          ok: false,
          code: "club_not_under_host_association",
          message: "Only clubs under the host association may enter this tournament.",
        };
      }
      return { ok: true };
    }
    case "branding_association_clubs": {
      const bid = tournament.brandingAssociationId?.trim();
      if (!bid) {
        return { ok: true };
      }
      if (parentAssoc !== bid) {
        return {
          ok: false,
          code: "club_not_under_branding_association",
          message:
            "Only clubs under the tournament's branding association may enter this tournament.",
        };
      }
      return { ok: true };
    }
    default: {
      /* Unknown / legacy DB value — fall back to branding association rule. */
      const bid = tournament.brandingAssociationId?.trim();
      if (!bid) {
        return { ok: true };
      }
      if (parentAssoc !== bid) {
        return {
          ok: false,
          code: "club_not_under_branding_association",
          message:
            "Only clubs under the tournament's branding association may enter this tournament.",
        };
      }
      return { ok: true };
    }
  }
}

export type NewEntryValidation = {
  ok: true;
  rules: TournamentEntryRules;
} | { ok: false; status: number; code: string; message: string };

/**
 * Full validation for creating a team tournament entry (POST).
 */
export async function validateNewTeamTournamentEntry(
  db: Db,
  tournament: RepTournamentDoc,
  club: ClubDoc | null,
): Promise<NewEntryValidation> {
  const rules = effectiveEntryRules(tournament);

  if (isBeforeEntryOpens(rules.entryOpensAt)) {
    return {
      ok: false,
      status: 403,
      code: "entry_not_open",
      message: "Team entries are not open yet for this tournament.",
    };
  }
  if (isAfterEntryCloses(rules.entryClosesAt)) {
    return {
      ok: false,
      status: 403,
      code: "entry_closed",
      message: "The entry deadline for this tournament has passed.",
    };
  }

  const elig = evaluateClubEntryEligibility(tournament, club, rules);
  if (!elig.ok) {
    return { ok: false, status: 403, code: elig.code, message: elig.message };
  }

  if (rules.maxTeams != null && rules.maxTeams > 0) {
    const n = await countTournamentTeamEntries(db, tournament.tournamentId);
    if (n >= rules.maxTeams) {
      return {
        ok: false,
        status: 409,
        code: "max_teams_reached",
        message: `This tournament has reached the maximum of ${rules.maxTeams} teams.`,
      };
    }
  }

  return { ok: true, rules };
}
