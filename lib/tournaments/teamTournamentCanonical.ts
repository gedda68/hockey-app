// D5 — Link tournament entries to stable team identity (canonical team + club entities).

export type TeamLike = { teamId: string; canonicalTeamId?: string | null };

export type EntryLike = {
  teamId: string;
  canonicalTeamId?: string | null;
  status: string;
};

/** Stable identity for a team row (A6): explicit canonical or the row’s own teamId. */
export function canonicalTeamIdFromTeamDoc(team: TeamLike): string {
  const c = team.canonicalTeamId?.trim();
  return c || team.teamId;
}

/** Effective canonical id stored or implied on a tournament entry document. */
export function entryCanonicalIdentity(entry: Pick<EntryLike, "teamId" | "canonicalTeamId">): string {
  const c = entry.canonicalTeamId?.trim();
  return c || entry.teamId;
}

/**
 * If another active entry for the same tournament already represents this canonical team
 * (via a different `teamId`), return that entry — duplicate team records must not double-enter.
 */
export function findConflictingEntryByCanonical<T extends EntryLike>(
  existing: T[],
  newTeamId: string,
  newCanonicalTeamId: string,
): T | undefined {
  for (const e of existing) {
    if (e.status === "withdrawn") continue;
    if (e.teamId === newTeamId) continue;
    if (entryCanonicalIdentity(e) === newCanonicalTeamId) return e;
  }
  return undefined;
}
