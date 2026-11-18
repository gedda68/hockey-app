// lib/competitions/byes.ts — which teams have the bye in each round, when a division has an odd number of teams.

export interface ByeFixture { round?: unknown; homeTeamId?: unknown; awayTeamId?: unknown; matchLevel?: unknown; status?: unknown }

/** Round number to the teams not playing that round. Empty when the division has an even number of teams. */
export function computeByes(fixtures: ByeFixture[]): Record<number, string[]> {
  const league = fixtures.filter((f) => f.matchLevel !== "finals" && f.status !== "cancelled");
  const id = (v: unknown) => (typeof v === "string" && v ? v : null);
  const teams = new Set<string>();
  const playing = new Map<number, Set<string>>();
  for (const f of league) {
    const r = Number(f.round);
    if (!Number.isInteger(r)) continue;
    const set = playing.get(r) ?? playing.set(r, new Set()).get(r)!;
    for (const t of [id(f.homeTeamId), id(f.awayTeamId)]) if (t) { teams.add(t); set.add(t); }
  }
  const out: Record<number, string[]> = {};
  if (teams.size % 2 === 0) return out;
  for (const [r, set] of playing) {
    const missing = [...teams].filter((t) => !set.has(t));
    if (missing.length) out[r] = missing.sort();
  }
  return out;
}
