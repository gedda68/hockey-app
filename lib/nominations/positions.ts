// Which positions a member may nominate for, per age group.
//
//  - Player: needs a player role (and the age/gender rules the player flow already enforces).
//  - Head coach / assistant coach / manager / selector: any member with a role may nominate, but must
//    meet the minimum age for that age group (table below), measured as season year − birth year.
//  - "Almost any position" for players: a person can't be both a player and staff in the SAME age group.
//  - A member with only non-player roles (e.g. a coach) cannot nominate as a player.
//
// The minimum ages are constants so the club can change them in one place.

import { isPlayerRole } from "@/lib/members/blueCard";

export type Position = "player" | "head_coach" | "assistant_coach" | "manager" | "selector";

export const POSITION_LABELS: Record<Position, string> = {
  player: "Player",
  head_coach: "Head Coach",
  assistant_coach: "Assistant Coach",
  manager: "Manager",
  selector: "Selector",
};

export const STAFF_POSITIONS: Position[] = ["head_coach", "assistant_coach", "manager", "selector"];
export const ALL_POSITIONS: Position[] = ["player", ...STAFF_POSITIONS];

/** Minimum age (in the season year) to coach / assist / manage / select, by junior group size. */
export const JUNIOR_STAFF_MIN_AGE: Record<number, number> = {
  10: 14, 11: 15, 12: 16, 13: 17, 14: 18, 15: 18, 16: 19, 17: 19, 18: 20, 19: 20, 20: 22, 21: 25,
};
/** "Open must be over 28" — so 29 or older. Masters use the same. */
export const OPEN_STAFF_MIN_AGE = 29;

export interface ParsedGroup {
  kind: "junior" | "open" | "masters" | "unknown";
  size?: number;
}

export function parseAgeGroup(ageGroup: string): ParsedGroup {
  const g = String(ageGroup ?? "").trim();
  const j = g.match(/^(?:under|u)\s*-?\s*(\d+)$/i);
  if (j) return { kind: "junior", size: parseInt(j[1], 10) };
  if (/^opens?$/i.test(g)) return { kind: "open" };
  if (/^masters?\b/i.test(g)) return { kind: "masters" };
  return { kind: "unknown" };
}

/** Minimum age to hold a staff position in this age group, or null when the group is not recognised. */
export function staffMinAge(ageGroup: string): number | null {
  const p = parseAgeGroup(ageGroup);
  if (p.kind === "open" || p.kind === "masters") return OPEN_STAFF_MIN_AGE;
  if (p.kind === "junior" && p.size != null) {
    if (JUNIOR_STAFF_MIN_AGE[p.size] != null) return JUNIOR_STAFF_MIN_AGE[p.size];
    return p.size > 21 ? OPEN_STAFF_MIN_AGE : Math.min(p.size + 4, 20);
  }
  return null;
}

export function ageInSeason(dob: unknown, seasonYear: number): number | null {
  const d = new Date(String(dob ?? ""));
  if (!dob || Number.isNaN(d.getTime())) return null;
  return seasonYear - d.getFullYear();
}

export interface MemberFacts {
  dateOfBirth?: unknown;
  roles?: unknown[];
}

export interface PositionVerdict {
  position: Position;
  label: string;
  allowed: boolean;
  reason?: string;
  alreadyNominated?: boolean;
}

export interface ExistingNomination {
  ageGroup: string;
  position: Position; // "player" for player nominations
}

/** Normalised existing nomination from a rep_nominations document. */
export function nominationPosition(n: { nominationType?: string; role?: string }): Position {
  if (n.nominationType === "official") {
    const r = String(n.role ?? "");
    if (r === "head_coach" || r === "coach") return "head_coach";
    if (r === "assistant_coach") return "assistant_coach";
    if (r === "manager") return "manager";
    if (r === "selector") return "selector";
  }
  return "player";
}

export function evaluatePositions(
  member: MemberFacts,
  ageGroup: string,
  seasonYear: number,
  existing: ExistingNomination[] = [],
): PositionVerdict[] {
  const roles = (member.roles ?? []).map(String).filter(Boolean);
  const isPlayer = roles.some(isPlayerRole);
  const hasAnyRole = roles.length > 0;
  const age = ageInSeason(member.dateOfBirth, seasonYear);
  const min = staffMinAge(ageGroup);
  const here = existing.filter((e) => e.ageGroup === ageGroup);
  const nominatedPlayer = here.some((e) => e.position === "player");
  const nominatedStaff = here.some((e) => e.position !== "player");

  return ALL_POSITIONS.map((position): PositionVerdict => {
    const base = { position, label: POSITION_LABELS[position] };
    const already = here.some((e) => e.position === position);
    if (already) return { ...base, allowed: false, alreadyNominated: true, reason: "Already nominated" };

    if (position === "player") {
      if (!isPlayer) return { ...base, allowed: false, reason: "You don't hold a player role" };
      if (nominatedStaff) return { ...base, allowed: false, reason: `You're nominated as staff for ${ageGroup}` };
      return { ...base, allowed: true };
    }

    if (!isPlayer && !hasAnyRole) return { ...base, allowed: false, reason: "You need a club role to nominate for this position" };
    if (min == null) return { ...base, allowed: false, reason: "Age rule not defined for this age group" };
    if (age == null) return { ...base, allowed: false, reason: "No date of birth on your record" };
    if (age < min) {
      return { ...base, allowed: false, reason: `Must be at least ${min} in the season year to be ${POSITION_LABELS[position]} for ${ageGroup} (you are ${age})` };
    }
    if (nominatedPlayer) return { ...base, allowed: false, reason: `You're nominated as a player for ${ageGroup}` };
    return { ...base, allowed: true };
  });
}
