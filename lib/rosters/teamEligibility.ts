// Rules for putting a member into a team.
//
// 1. A player may be in more than one team, but only teams that are no more than one
//    tier apart: BHL1 + BHL2 and BHL2 + BHL3 are fine, BHL1 + BHL3 is not. The tier is the
//    number at the end of the team name ("BHL2" -> 2). Teams with no number are not tiered.
// 2. A junior may play in a senior team only if they turn 15 or older in that season's year.

export interface ExistingTeam {
  teamName: string;
  rosterId?: string;
}

export const SENIOR_MIN_AGE = 15;

export function teamTier(name: string | undefined | null): number | null {
  const m = String(name ?? "")
    .trim()
    .match(/(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : null;
}

/** Age the member reaches during `season` (season year minus birth year). null if unknown. */
export function ageInSeason(
  dateOfBirth: string | undefined | null,
  season: string | number | undefined | null,
): number | null {
  const born = new Date(String(dateOfBirth ?? "")).getFullYear();
  const year = parseInt(String(season ?? ""), 10);
  if (!Number.isFinite(born) || !Number.isFinite(year)) return null;
  return year - born;
}

export interface EligibilityInput {
  category?: string;
  season?: string | number;
  dateOfBirth?: string;
  newTeamName: string;
  /** Teams (same club, season and category) the member is already in. */
  existing: ExistingTeam[];
}

export function checkTeamEligibility(
  input: EligibilityInput,
): { ok: true } | { ok: false; reason: string; code: "TOO_YOUNG" | "TIER_GAP" | "ALREADY_IN_TEAM" } {
  if (input.existing.some((t) => t.teamName === input.newTeamName)) {
    return {
      ok: false,
      code: "ALREADY_IN_TEAM",
      reason: `Already in ${input.newTeamName}`,
    };
  }

  if (input.category === "senior") {
    const age = ageInSeason(input.dateOfBirth, input.season);
    if (age !== null && age < SENIOR_MIN_AGE) {
      return {
        ok: false,
        code: "TOO_YOUNG",
        reason: `Juniors must be ${SENIOR_MIN_AGE} or older in ${input.season} to play seniors (turns ${age})`,
      };
    }
  }

  const newTier = teamTier(input.newTeamName);
  if (newTier !== null) {
    const tiers = input.existing
      .map((t) => teamTier(t.teamName))
      .filter((n): n is number => n !== null);
    const all = [...tiers, newTier];
    if (Math.max(...all) - Math.min(...all) > 1) {
      const names = input.existing.map((t) => t.teamName).join(", ");
      return {
        ok: false,
        code: "TIER_GAP",
        reason: `Can only play teams one grade apart (already in ${names})`,
      };
    }
  }

  return { ok: true };
}
