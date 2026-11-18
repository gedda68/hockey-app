// lib/reports/groups.ts — age groups, gender labels and role kinds used by the committee reports. Pure.

/** Age for the season (season year minus birth year), the hockey convention. */
export function ageGroup(dob: string | undefined | null, seasonYear: number): string {
  if (!dob) return "Unknown";
  const birthYear = new Date(dob).getFullYear();
  if (Number.isNaN(birthYear)) return "Unknown";
  const age = seasonYear - birthYear;
  if (age < 6) return "Under 6";
  if (age < 8) return "Under 8";
  if (age < 10) return "Under 10";
  if (age < 12) return "Under 12";
  if (age < 14) return "Under 14";
  if (age < 16) return "Under 16";
  if (age < 18) return "Under 18";
  if (age < 21) return "Under 21";
  if (age >= 35 && age < 40) return "Masters 35+";
  if (age >= 40 && age < 45) return "Masters 40+";
  if (age >= 45 && age < 50) return "Masters 45+";
  if (age >= 50 && age < 55) return "Masters 50+";
  if (age >= 55 && age < 60) return "Masters 55+";
  if (age >= 60 && age < 65) return "Masters 60+";
  if (age >= 65) return "Masters 65+";
  return "Open";
}

export const AGE_ORDER = ["Under 6", "Under 8", "Under 10", "Under 12", "Under 14", "Under 16", "Under 18", "Under 21", "Open", "Masters 35+", "Masters 40+", "Masters 45+", "Masters 50+", "Masters 55+", "Masters 60+", "Masters 65+", "Unknown"];

export type Gender = "Female" | "Male" | "Other" | "Unknown";
export function genderLabel(g: string | undefined | null): Gender {
  const s = String(g ?? "").trim().toLowerCase();
  if (!s) return "Unknown";
  if (s.includes("female") || s.includes("women") || s === "f") return "Female";
  if (s.includes("male") || s.includes("men") || s === "m") return "Male";
  return "Other";
}

export interface Kinds { player: boolean; coach: boolean; umpire: boolean; technical: boolean }
/** What a registration's role ids make someone. Imported ids carry a "role-" prefix; app-made ones don't. */
export function roleKinds(roleIds: string[]): Kinds {
  const rs = roleIds.map((r) => String(r).replace(/^role-/, "").toLowerCase());
  return {
    player: rs.some((r) => /player/.test(r)),
    coach: rs.some((r) => /coach/.test(r)),
    umpire: rs.some((r) => /umpire/.test(r)),
    technical: rs.some((r) => /technical|tech-?official|tech-?officer/.test(r)),
  };
}

/** Registration statuses that don't count as registered. */
export const NOT_REGISTERED = ["cancelled", "canceled", "rejected", "withdrawn", "declined", "deleted", "void"];
