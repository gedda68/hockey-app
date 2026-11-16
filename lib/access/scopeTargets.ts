// lib/access/scopeTargets.ts — the identifiers a Team / Age-group scoped role can name for a roster team.
// A team is "<rosterId>:<team name>"; an age group is the roster's grade (junior band) or division.

import type { ScopeTarget } from "@/lib/access/matrix";

interface RosterLike { id?: string; clubId?: string; grade?: string; division?: string; category?: string; teams?: { name?: string }[] }

export const teamScopeValue = (rosterId: string, teamName: string) => `${rosterId}:${teamName}`;

export function rosterAgeGroups(r: RosterLike): string[] {
  return [r.grade, r.division].filter((v): v is string => !!v && v.trim() !== "");
}

/** Target for one team (teamIndex given) or, for roster-level changes, any team in the roster. */
export function rosterTeamTarget(r: RosterLike, teamIndex?: number): ScopeTarget {
  const id = String(r.id ?? "");
  const teams = Array.isArray(r.teams) ? r.teams : [];
  const picked = teamIndex === undefined ? teams : teams[teamIndex] ? [teams[teamIndex]] : [];
  return {
    ...(r.clubId ? { clubId: String(r.clubId) } : {}),
    teamIds: picked.map((t) => teamScopeValue(id, String(t.name ?? ""))),
    ageGroups: rosterAgeGroups(r),
  };
}

/** Is a roster team inside the narrow holdings (teams / age groups) a person has? Used to list the people they may see. */
export function holdingCoversTeam(h: { teamIds?: string[]; ageGroups?: string[] }, r: RosterLike, team: { name?: string }): boolean {
  const have = (xs?: string[]) => new Set((xs ?? []).map((x) => x.trim().toLowerCase()));
  const teams = have(h.teamIds), ages = have(h.ageGroups);
  if (teams.has(teamScopeValue(String(r.id ?? ""), String(team.name ?? "")).toLowerCase())) return true;
  return rosterAgeGroups(r).some((a) => ages.has(a.trim().toLowerCase()));
}
