// lib/competitions/tickerLines.ts — what the site-wide results ticker shows: the newest finished matches.
// Seeded demo competitions (season competition ids starting "sc-demo-") only appear when there is nothing real to show,
// otherwise their recent made-up dates push genuine results such as grand finals out of the ticker.

/** The fields of a match the ticker reads. */
export type TickerMatch = {
  matchId: string;
  seasonCompetitionId?: string | null;
  dateTime: string;
  division: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  score?: { home: number; away: number } | null;
};

export type TickerLine = { key: string; text: string };

export const isDemoMatch = (m: Pick<TickerMatch, "seasonCompetitionId">) => String(m.seasonCompetitionId ?? "").startsWith("sc-demo-");

export function buildTickerLines(completed: TickerMatch[], limit = 24): TickerLine[] {
  const real = completed.filter((m) => !isDemoMatch(m));
  const pool = real.length > 0 ? real : completed;
  return [...pool]
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime() || a.matchId.localeCompare(b.matchId))
    .slice(0, limit)
    .map((m) => ({
      key: m.matchId,
      text: `${m.division} · ${m.homeTeam.name} ${m.score?.home ?? "—"}–${m.score?.away ?? "—"} ${m.awayTeam.name}`,
    }));
}
