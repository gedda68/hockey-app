/**
 * Validate team ↔ season league anchors (`seasonCompetitionId`, `competitionDivisionId`).
 * N4 — registrar clarity; shared by club team routes and association league-context PATCH.
 */

export type SeasonDivisionRow = { divisionId: string };

export function seasonDivisionIds(
  divisions: unknown,
): { divisionId: string }[] {
  if (!Array.isArray(divisions)) return [];
  return divisions
    .map((d) => (d && typeof d === "object" && "divisionId" in d ? String((d as { divisionId: unknown }).divisionId ?? "") : ""))
    .filter(Boolean)
    .map((divisionId) => ({ divisionId }));
}

export function assertDivisionBelongsToSeason(params: {
  seasonCompetitionId: string;
  divisions: unknown;
  competitionDivisionId: string | null | undefined;
}): { ok: true } | { ok: false; error: string } {
  const id = params.competitionDivisionId?.trim();
  if (!id) return { ok: true };
  const ids = seasonDivisionIds(params.divisions).map((d) => d.divisionId);
  if (!ids.includes(id)) {
    return {
      ok: false,
      error: `competitionDivisionId "${id}" is not defined on season competition ${params.seasonCompetitionId}`,
    };
  }
  return { ok: true };
}
