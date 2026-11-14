// Interim registration pricing (AUD), applied at every level (club + each association above it).
//   junior (under 18 in the season year) ........ $20 per level
//   senior (player, 18+) ......................... $100 per level
//   other registrations (umpire, coach, official)  $20 per level
//   volunteer (no player / other registration) ... $0, club level only
// Change the numbers here; the backfill script and registration pages read from this file.

export const CURRENCY = "AUD";
export const JUNIOR_MAX_AGE = 17; // under 18 in the season year

export type RegistrationCategory = "junior" | "senior" | "other" | "volunteer";

export const CATEGORY_FEE: Record<RegistrationCategory, number> = {
  junior: 20,
  senior: 100,
  other: 20,
  volunteer: 0,
};

export const CATEGORY_LABEL: Record<RegistrationCategory, string> = {
  junior: "Junior",
  senior: "Senior",
  other: "Other",
  volunteer: "Volunteer",
};

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

/** Levels the member is charged at: the club, plus every association above it unless volunteer. */
export function feeLines(category: RegistrationCategory, levels: Level[]): FeeLine[] {
  const amount = CATEGORY_FEE[category];
  const use = category === "volunteer" ? levels.filter((l) => l.kind === "club") : levels;
  return use.map((l) => ({
    itemId: `${l.kind}-${l.id}-${category}`,
    feeId: `std-${category}`,
    type: l.kind,
    name: `${l.name} ${CATEGORY_LABEL[category]} registration`,
    amount,
    gstIncluded: true,
    ...(l.kind === "club" ? { clubId: l.id } : { associationId: l.id, associationHierarchyLevel: l.hierarchyLevel }),
  }));
}

export const sumFees = (lines: { amount: number }[]) => lines.reduce((s, l) => s + l.amount, 0);
