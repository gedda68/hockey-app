// lib/draw/seasonSetup.ts — helpers for setting a season up from a config file (matching teams and venues, blackout windows).
import { addDays } from "@/lib/draw/time";

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");

export interface WantedTeam { name: string; club: string; division: string }
export interface TeamDoc { teamId: string; name?: string; teamName?: string; displayName?: string; clubId?: string }
export interface TeamMatch { wanted: WantedTeam; teamId: string | null; clubId: string | null; problem: string | null }

/** Finds each wanted team among the teams on file: by an id you gave, else by exactly the same name. Never guesses between two. */
export function matchTeams(wanted: WantedTeam[], docs: TeamDoc[], manual: Record<string, string> = {}): TeamMatch[] {
  return wanted.map((w) => {
    const forced = manual[w.name];
    if (forced) { const d = docs.find((x) => x.teamId === forced); return d ? { wanted: w, teamId: d.teamId, clubId: d.clubId ?? null, problem: null } : { wanted: w, teamId: null, clubId: null, problem: `Team ${forced} not found` }; }
    const key = norm(w.name);
    const hits = docs.filter((d) => [d.name, d.teamName, d.displayName].some((n) => n && norm(n) === key));
    if (hits.length === 1) return { wanted: w, teamId: hits[0].teamId, clubId: hits[0].clubId ?? null, problem: null };
    return { wanted: w, teamId: null, clubId: null, problem: hits.length ? `${hits.length} teams have this name` : "No team with this name" };
  });
}

export interface VenueDoc { venueId: string; name?: string }
/** Venues whose name holds any of the words. */
export const venuesByWords = (venues: VenueDoc[], words: string[]) => venues.filter((v) => words.some((w) => norm(v.name).includes(norm(w))));

/** Groups days into runs of consecutive days (a long weekend becomes one window). */
export function toWindows(days: string[], labelOf: (d: string) => string = () => ""): { startDate: string; endDate: string; label: string }[] {
  const sorted = [...new Set(days)].sort(), out: { startDate: string; endDate: string; label: string }[] = [];
  for (const d of sorted) {
    const last = out[out.length - 1];
    if (last && addDays(last.endDate, 1) === d) { last.endDate = d; const l = labelOf(d); if (l && !last.label.includes(l)) last.label = `${last.label}, ${l}`.slice(0, 120); }
    else out.push({ startDate: d, endDate: d, label: labelOf(d) });
  }
  return out;
}
