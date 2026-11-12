// lib/altius/teamStats.ts
// Altius per-match statistics (scraped from /matches/:id/reports/statistics)
// → `fixture_team_stats` documents (one per fixture + team).

type Doc = Record<string, any>;

/** One statistic block as read from the PDF. Quarters: [q1,q2,q3,q4]; halves: [h1,null,h2,null]. */
export interface AltiusStatBlock {
  home: (number | null)[];
  homeTotal: number | null;
  away: (number | null)[];
  awayTotal: number | null;
}

export interface AltiusMatchStatsHarvest {
  status?: string;
  data: Record<string, { qEnds: (number | null)[]; stats: Record<string, AltiusStatBlock> }>;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Normalise [q1,q2,q3,q4] or halves [h1,null,h2,null] into per-period counts. */
export function periodsFrom(values: (number | null)[]): (number | null)[] {
  const v = values.map((x) => (isNum(x) ? x : null));
  const halves = v.length >= 3 && v[1] === null && v[3] === null && isNum(v[0]) && isNum(v[2]);
  return halves ? [v[0], v[2]] : v.slice(0, 4);
}

function count(values: (number | null)[], total: number | null) {
  const byPeriod = periodsFrom(values);
  const sum = byPeriod.reduce<number>((s, x) => s + (x ?? 0), 0);
  return { total: isNum(total) ? total : sum, byPeriod };
}

export function transformTeamStats(
  harvest: AltiusMatchStatsHarvest,
  fixtures: Doc[],
  now: Date = new Date(),
): { teamStats: Doc[]; warnings: string[] } {
  const byMatch = new Map(fixtures.filter((f) => f.legacyMatchId).map((f) => [String(f.legacyMatchId), f]));
  const teamStats: Doc[] = [];
  const warnings: string[] = [];

  for (const [matchId, entry] of Object.entries(harvest.data ?? {})) {
    const fx = byMatch.get(matchId);
    if (!fx) continue; // BYE / unmapped team
    const s = entry.stats ?? {};
    const pc = s["Penalty Corners"];
    if (!pc) {
      warnings.push(`match ${matchId}: no statistics report`);
      continue;
    }
    const periodCount = periodsFrom(pc.home).length;
    let ends = (entry.qEnds ?? []).filter(isNum);
    if (ends.length !== periodCount) ends = [];

    // Optional stats only when actually recorded (Altius shows zeros otherwise)
    const optional = (label: string, side: "home" | "away") => {
      const b = s[label];
      if (!b) return null;
      const anyRecorded = (b.homeTotal ?? 0) + (b.awayTotal ?? 0) > 0;
      return anyRecorded ? count(b[side], side === "home" ? b.homeTotal : b.awayTotal) : null;
    };
    const poss = s["Possession %"];
    // Altius shows 0–0 when corners weren't entered for a match: treat as "not recorded"
    const pcRecorded = (pc.homeTotal ?? 0) + (pc.awayTotal ?? 0) > 0;

    for (const side of ["home", "away"] as const) {
      const teamId = side === "home" ? fx.homeTeamId : fx.awayTeamId;
      const pcCount = pcRecorded ? count(pc[side], side === "home" ? pc.homeTotal : pc.awayTotal) : null;
      const pcGoals = ((fx.matchEvents as Doc[]) ?? []).filter(
        (e) => e.teamId === teamId && e.kind === "goal" && /penalty corner/i.test(e.notes ?? ""),
      ).length;
      if (pcCount && pcGoals > pcCount.total) {
        warnings.push(`${fx.fixtureId}: ${pcGoals} PC goals but ${pcCount!.total} PCs recorded for ${teamId}`);
      }
      teamStats.push({
        statsId: `fts-altius-${matchId}-${String(teamId).replace(/^team-altius-/, "")}`,
        fixtureId: fx.fixtureId,
        seasonCompetitionId: fx.seasonCompetitionId,
        teamId,
        periodEndMinutes: ends,
        penaltyCornersAwarded: pcCount,
        penaltyStrokesAwarded: null,
        circleEntries: optional("Circle Entries", side),
        shots: optional("Shots", side),
        shotsOnTarget: optional("Shots on Target", side),
        possessionPct: poss && (poss.homeTotal ?? 0) + (poss.awayTotal ?? 0) > 0
          ? (side === "home" ? poss.homeTotal : poss.awayTotal) ?? null
          : null,
        source: "altius",
        updatedAt: now,
      });
    }
  }
  return { teamStats, warnings };
}
