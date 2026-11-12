/**
 * Short label for a season competition: just the year and the grade, e.g. "2026 - BHL 2".
 * (No status or internal id — those make dropdowns hard to scan.)
 */
export interface SeasonLabelInput {
  season?: string | number | null;
  /** Optional label set on the season competition, e.g. "2026 BHL 2" or "BHL 2". */
  displayName?: string | null;
  /** The competition's own name, e.g. "BHL 2". */
  competitionName?: string | null;
}

const clean = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Removes a leading "<season>" (and any separator) so the year isn't shown twice. */
function stripLeadingSeason(text: string, season: string): string {
  if (!season) return text;
  const escaped = season.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`^\\s*${escaped}\\s*[-–—·:|]?\\s*`), "").trim();
}

export function formatSeasonLabel(input: SeasonLabelInput): string {
  const season = input.season == null ? "" : String(input.season).trim();
  const grade = stripLeadingSeason(
    clean(input.displayName) || clean(input.competitionName),
    season,
  );
  if (season && grade) return `${season} - ${grade}`;
  return season || grade;
}
