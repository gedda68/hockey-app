// lib/clubs/peopleSearch.ts
// Matching for the club Players / Coaches search (shared by the type-ahead
// dropdown and the server-side ?q= filter).

export interface PeopleSearchOption {
  memberId: string;
  name: string;
  teams: string[];
}

const MAX_SUGGESTIONS = 8;
export const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Options matching the query: name starts-with first, then name contains, then team matches. */
export function matchPeople(options: PeopleSearchOption[], query: string, limit = MAX_SUGGESTIONS): PeopleSearchOption[] {
  const q = norm(query.trim());
  if (!q) return [];
  const score = (o: PeopleSearchOption) => {
    const name = norm(o.name);
    if (name.startsWith(q) || name.split(/\s+/).some((w) => w.startsWith(q))) return 0;
    if (name.includes(q)) return 1;
    if (o.teams.some((t) => norm(t).includes(q))) return 2;
    // every word somewhere in name/teams, e.g. "zee ana" or "smith bhl"
    const hay = norm([o.name, ...o.teams].join(" "));
    if (q.split(/\s+/).every((w) => hay.includes(w))) return 3;
    return -1;
  };
  return options
    .map((o) => [o, score(o)] as const)
    .filter(([, s]) => s >= 0)
    .sort((a, b) => a[1] - b[1] || a[0].name.localeCompare(b[0].name))
    .slice(0, limit)
    .map(([o]) => o);
}

/** Filter for the list: every word of the query appears in the name or a team. */
export function filterPeople<T extends { name: string; teams: { name: string }[] }>(people: T[], query: string): T[] {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (!words.length) return people;
  return people.filter((p) => {
    const hay = norm([p.name, ...p.teams.map((t) => t.name)].join(" "));
    return words.every((w) => hay.includes(w));
  });
}
