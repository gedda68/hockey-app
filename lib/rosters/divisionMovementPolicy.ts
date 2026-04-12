/**
 * Product rules for moving players between competition divisions (senior ladder + juniors).
 * Cross-roster moves are not fully wired in the admin UI yet; callers can use this for validation later.
 */

export type DivisionBand = "junior" | "senior" | "masters" | "social";

/** Numeric rank: higher = stronger / higher division (Open > Div 3). Unknown labels sort last. */
const SENIOR_ORDER: Record<string, number> = {
  open: 100,
  premier: 90,
  "division 1": 80,
  "division 2": 70,
  "division 3": 60,
  "division 4": 50,
  "division 5": 40,
  bhl1: 35,
  bhl2: 34,
  bhl3: 33,
  bhl4: 32,
  bhl5: 31,
  bhl6: 30,
  bhl7: 29,
};

const JUNIOR_ORDER: Record<string, number> = {
  u18: 80,
  u16: 70,
  u14: 60,
  u12: 50,
  u10: 40,
  u8: 30,
  u6: 20,
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function divisionStrengthRank(
  category: DivisionBand,
  divisionLabel: string,
): number {
  const k = norm(divisionLabel);
  if (category === "junior") {
    return JUNIOR_ORDER[k] ?? 25;
  }
  if (category === "senior" || category === "social") {
    return SENIOR_ORDER[k] ?? 15;
  }
  if (category === "masters") {
    const m = k.match(/^o?(\d+)/);
    return m ? parseInt(m[1], 10) : 10;
  }
  return 10;
}

/**
 * True if `to` is the same or a higher (numerically stronger) division than `from`
 * for the same category band.
 */
export function isUpwardOrSameDivisionMove(params: {
  category: DivisionBand;
  fromDivision: string;
  toDivision: string;
}): boolean {
  const a = divisionStrengthRank(params.category, params.fromDivision);
  const b = divisionStrengthRank(params.category, params.toDivision);
  return b <= a;
}

/**
 * Juniors may only step up one age band at a time (e.g. U14 → U16), not skip.
 */
export function isJuniorSingleStepUp(params: {
  fromDivision: string;
  toDivision: string;
}): boolean {
  const a = divisionStrengthRank("junior", params.fromDivision);
  const b = divisionStrengthRank("junior", params.toDivision);
  if (b >= a) return true;
  const step = a - b;
  return step > 0 && step <= 20;
}
