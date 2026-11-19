// lib/competitions/tickerLines.ts — what the site-wide results ticker shows: the newest finished matches.
// Seeded demo competitions (season competition ids starting "sc-demo-") only appear when there is nothing real to show,
// otherwise their recent made-up dates push genuine results such as grand finals out of the ticker.

/**
 * "Round 5" for league games; for finals the stage: Altius's phase ("Grand Final", "Semi Final"),
 * or "Finals Week 2" for finals built by the draw.
 */
export function fixtureRoundLabel(f: { round?: unknown; matchLevel?: unknown; finals?: { week?: unknown } | null; altius?: { phaseLabel?: unknown } | null }): string {
  const isFinals = typeof f.matchLevel === "string" && /^finals?$/i.test(f.matchLevel.trim());
  if (isFinals) {
    const phase = typeof f.altius?.phaseLabel === "string" ? f.altius.phaseLabel.trim() : "";
    if (phase) return phase;
    const week = Number(f.finals?.week);
    return Number.isFinite(week) && week > 0 ? `Finals Week ${week}` : "Finals";
  }
  const n = Number(f.round);
  return Number.isFinite(n) && n > 0 ? `Round ${n}` : "";
}

/** The fields of a match the ticker reads. */
export type TickerMatch = {
  matchId: string;
  seasonCompetitionId?: string | null;
  dateTime: string;
  roundLabel?: string;
  division: string;
  homeTeam: { name: string; icon?: string | null };
  awayTeam: { name: string; icon?: string | null };
  score?: { home: number; away: number } | null;
};

export type TickerTeam = { name: string; icon: string | null };
/** One ticker entry: division, then home icon and score, a colon, away score and icon. */
export type TickerLine = { key: string; division: string; round: string; home: TickerTeam; away: TickerTeam; homeScore: string; awayScore: string };

export const isDemoMatch = (m: Pick<TickerMatch, "seasonCompetitionId">) => String(m.seasonCompetitionId ?? "").startsWith("sc-demo-");

export function buildTickerLines(completed: TickerMatch[], limit = 24): TickerLine[] {
  const real = completed.filter((m) => !isDemoMatch(m));
  const pool = real.length > 0 ? real : completed;
  return [...pool]
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime() || a.matchId.localeCompare(b.matchId))
    .slice(0, limit)
    .map((m) => ({
      key: m.matchId,
      division: m.division,
      round: m.roundLabel ?? "",
      home: { name: m.homeTeam.name, icon: m.homeTeam.icon || null },
      away: { name: m.awayTeam.name, icon: m.awayTeam.icon || null },
      homeScore: String(m.score?.home ?? "—"),
      awayScore: String(m.score?.away ?? "—"),
    }));
}
