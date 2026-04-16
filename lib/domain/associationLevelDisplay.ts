/**
 * Admin UI labels for `associations.level` (tree depth).
 * Must stay aligned with `numericLevelToString` in `lib/types/roles.ts`
 * and `docs/domain/CANONICAL_GRAPH.md`.
 */

import {
  numericLevelToString,
  type AssociationLevel,
} from "@/lib/types/roles";

const TIER_COLORS: Record<AssociationLevel, string> = {
  national: "bg-purple-100 text-purple-700 border-purple-300",
  state: "bg-indigo-100 text-indigo-700 border-indigo-300",
  city: "bg-blue-100 text-blue-700 border-blue-300",
  district: "bg-teal-100 text-teal-700 border-teal-300",
};

function tierHumanLabel(depth: number): string {
  if (depth === 0) return "National";
  if (depth === 1) return "State body";
  if (depth === 2) return "Metro / regional association";
  if (depth === 3) return "District / sub-association";
  return `Deeper branch (depth ${depth})`;
}

export function associationLevelDisplay(depth: number): {
  label: string;
  short: string;
  color: string;
  canonicalKey: AssociationLevel;
} {
  const d =
    typeof depth === "number" && Number.isFinite(depth) && depth >= 0
      ? Math.floor(depth)
      : 0;
  const canonicalKey = numericLevelToString(d);
  return {
    short: `L${d}`,
    label: tierHumanLabel(d),
    color: TIER_COLORS[canonicalKey],
    canonicalKey,
  };
}

/** Precomputed map for common tree depths (stored `associations.level`). */
export const LEVEL_MAP: Record<
  number,
  { label: string; short: string; color: string }
> = (() => {
  const m: Record<number, { label: string; short: string; color: string }> =
    {};
  for (let d = 0; d <= 12; d++) {
    const { label, short, color } = associationLevelDisplay(d);
    m[d] = { label, short, color };
  }
  return m;
})();

/** One-line summary for APIs (matches admin badge semantics). */
export function associationLevelSummary(level: number | undefined): string {
  const { short, label } = associationLevelDisplay(
    typeof level === "number" ? level : 0,
  );
  return `${short} — ${label}`;
}
