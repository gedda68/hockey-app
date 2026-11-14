import { starterFees, applicableFees } from "./feeList";

// Interim registration pricing (AUD), applied at every level (club + each association above it).
//   junior (under 18 in the season year) ........ $20 per level
//   senior (player, 18+) ......................... $100 per level
//   other registrations (umpire, coach, official)  $20 per level
//   volunteer (no player / other registration) ... $0, club level only
// Change the numbers here; the backfill script and registration pages read from this file.

export { CURRENCY, JUNIOR_MAX_AGE, CATEGORY_FEE, CATEGORY_LABEL, type RegistrationCategory } from "./categories";
import { JUNIOR_MAX_AGE, type RegistrationCategory } from "./categories";

const OTHER_ROLES = new Set([
  "umpire", "coach", "assoc-coach", "technical-official", "tech-official",
  "technical-officer", "official", "manager", "selector", "assoc-selector",
]);

export function ageInYear(dateOfBirth: unknown, season: number): number | null {
  const born = new Date(String(dateOfBirth ?? "")).getFullYear();
  return Number.isFinite(born) ? season - born : null;
}

export function categorise(
  m: { roles?: string[]; personalInfo?: { dateOfBirth?: string }; membership?: { membershipType?: string; roles?: string[] } },
  season: number,
): RegistrationCategory {
  const roles = [...(m.roles ?? []), ...(m.membership?.roles ?? [])].map((r) => String(r).replace(/^role-/, ""));
  const isPlayer = roles.some((r) => r === "player" || r === "junior-player");
  const isOther = roles.some((r) => OTHER_ROLES.has(r));
  if (!isPlayer && !isOther) return "volunteer";

  const age = ageInYear(m.personalInfo?.dateOfBirth, season);
  const typeSaysJunior = /junior/i.test(String(m.membership?.membershipType ?? "")) || roles.includes("junior-player");
  const junior = age !== null ? age <= JUNIOR_MAX_AGE : typeSaysJunior;
  if (junior) return "junior";
  return isPlayer ? "senior" : "other";
}

export interface Level {
  /** "club" or "association" */
  kind: "club" | "association";
  id: string;
  name: string;
  /** 0 = national … higher = closer to the club. Only for associations. */
  hierarchyLevel?: number;
  /** This level's own fee list (its `fees[]`). Missing/empty -> the starter list. */
  fees?: unknown;
}

export interface FeeLine {
  itemId: string;
  feeId: string;
  type: "club" | "association";
  name: string;
  amount: number;
  gstIncluded: boolean;
  clubId?: string;
  associationId?: string;
  associationHierarchyLevel?: number;
}

/**
 * Itemised fee lines for a registration: every level contributes the fees from ITS OWN fee list that
 * apply to the category. Volunteers are charged at club level only.
 */
export function feeLines(category: RegistrationCategory, levels: Level[]): FeeLine[] {
  const use = category === "volunteer" ? levels.filter((l) => l.kind === "club") : levels;
  return use.flatMap((l) => {
    const list = Array.isArray(l.fees) && l.fees.length ? l.fees : starterFees(l.kind, l.name);
    return applicableFees(list, category).map((f) => ({
      itemId: `${l.kind}-${l.id}-${f.feeId}`,
      feeId: f.feeId,
      type: l.kind,
      name: `${l.name} — ${f.name}`,
      amount: f.amount,
      gstIncluded: f.gstIncluded !== false,
      ...(l.kind === "club" ? { clubId: l.id } : { associationId: l.id, associationHierarchyLevel: l.hierarchyLevel }),
    }));
  });
}

export const sumFees = (lines: { amount: number }[]) => lines.reduce((s, l) => s + l.amount, 0);
