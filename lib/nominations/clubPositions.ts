// Club position nominations (coaching, assistant coaching, admin, committee, management, umpiring).
// Any member may nominate for an open club position window at their club, subject to:
//   - coaching / assistant coaching / manager roles tied to an age group: the staff minimum age
//     for that group (see positions.ts);
//   - admin / committee / management roles: 18 or older;
//   - umpiring: no minimum;
//   - the window's own rules (financial membership, statement) checked by the route.

import { ageInSeason, staffMinAge } from "@/lib/nominations/positions";

export type ClubPositionKind =
  | "coaching" | "assistant-coaching" | "admin" | "committee" | "management" | "umpiring" | "other";

export const KIND_LABELS: Record<ClubPositionKind, string> = {
  coaching: "Coaching",
  "assistant-coaching": "Assistant coaching",
  admin: "Admin",
  committee: "Committee",
  management: "Management",
  umpiring: "Umpiring",
  other: "Other",
};

export const ADULT_MIN_AGE = 18;

interface WindowLike {
  positionTitle?: string;
  positionRole?: string;
  title?: string;
  ageGroup?: string;
}

/** Classify a window from its role key, falling back to the title wording. */
export function classifyPosition(w: WindowLike): ClubPositionKind {
  const text = `${w.positionRole ?? ""} ${w.positionTitle ?? ""} ${w.title ?? ""}`.toLowerCase().replace(/[_-]+/g, " ");
  if (/assistant\s+coach|asst\s+coach|assistant coaching/.test(text)) return "assistant-coaching";
  if (/umpire|referee|technical official/.test(text)) return "umpiring";
  if (/coach/.test(text)) return "coaching";
  if (/committee/.test(text)) return "committee";
  if (/\b(manager|management|team manager)\b/.test(text)) return "management";
  if (/\b(admin|administrator|registrar|secretary|treasurer|president|chair)\b/.test(text)) return "admin";
  return "other";
}

/** Age group named by the window (field, or "U12 Head Coach" style titles). */
export function windowAgeGroup(w: WindowLike): string | null {
  if (w.ageGroup && w.ageGroup.trim()) return w.ageGroup.trim();
  const m = `${w.positionTitle ?? ""} ${w.title ?? ""}`.match(/\b(?:under|u)\s*-?\s*(\d{2})\b|\bopen\b/i);
  if (!m) return null;
  return m[1] ? `Under ${m[1]}` : "Open";
}

export function evaluateClubPosition(
  member: { dateOfBirth?: unknown },
  w: WindowLike,
  seasonYear: number,
): { allowed: boolean; reason?: string; kind: ClubPositionKind; minAge: number | null } {
  const kind = classifyPosition(w);
  const age = ageInSeason(member.dateOfBirth, seasonYear);
  let minAge: number | null = null;

  if (kind === "coaching" || kind === "assistant-coaching" || kind === "management") {
    const group = windowAgeGroup(w);
    minAge = group ? staffMinAge(group) : null;
    if (minAge == null && kind === "management") minAge = ADULT_MIN_AGE;
  } else if (kind === "admin" || kind === "committee" || kind === "other") {
    minAge = ADULT_MIN_AGE;
  }

  if (minAge != null) {
    if (age == null) return { allowed: false, reason: "No date of birth on your record", kind, minAge };
    if (age < minAge) {
      return { allowed: false, reason: `Must be at least ${minAge} in the season year (you are ${age})`, kind, minAge };
    }
  }
  return { allowed: true, kind, minAge };
}
