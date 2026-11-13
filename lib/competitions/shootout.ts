import type { FixtureMatchEventPublic } from "@/types";

export interface ShootoutAttempt {
  round: number;
  teamId: string;
  shooterId: string;
  goalkeeperId: string | null;
  scored: boolean;
}

/** Shootout attempts in recorded order, numbered per team (1st shooter of each side = round 1). */
export function buildShootoutAttempts(events: FixtureMatchEventPublic[] | undefined | null): ShootoutAttempt[] {
  const seen = new Map<string, number>();
  const out: ShootoutAttempt[] = [];
  for (const e of events ?? []) {
    if (e.kind !== "shootout_goal" && e.kind !== "shootout_miss") continue;
    const n = (seen.get(e.teamId) ?? 0) + 1;
    seen.set(e.teamId, n);
    out.push({
      round: n,
      teamId: e.teamId,
      shooterId: e.memberId,
      goalkeeperId: e.goalkeeperMemberId ?? null,
      scored: e.kind === "shootout_goal",
    });
  }
  return out;
}

export function hasShootout(
  match: { homeShootOutScore?: number | null; awayShootOutScore?: number | null; matchEvents?: FixtureMatchEventPublic[] },
): boolean {
  if (match.homeShootOutScore != null && match.awayShootOutScore != null) return true;
  return buildShootoutAttempts(match.matchEvents).length > 0;
}

// ── Admin entry helpers ───────────────────────────────────────────────────────

export interface ShootoutDraft {
  teamId: string;
  shooterId: string;
  goalkeeperId: string;
  scored: boolean;
}

export function draftsFromEvents(events: FixtureMatchEventPublic[] | undefined | null): ShootoutDraft[] {
  return buildShootoutAttempts(events).map((a) => ({
    teamId: a.teamId,
    shooterId: a.shooterId,
    goalkeeperId: a.goalkeeperId ?? "",
    scored: a.scored,
  }));
}

export function shootoutTotals(drafts: ShootoutDraft[], homeTeamId: string, awayTeamId: string) {
  return {
    home: drafts.filter((d) => d.teamId === homeTeamId && d.scored).length,
    away: drafts.filter((d) => d.teamId === awayTeamId && d.scored).length,
  };
}

/** Replace a match's shootout events with the drafts, leaving every other event exactly as it was. */
export function mergeShootoutEvents(
  existing: Array<Record<string, unknown>>,
  drafts: ShootoutDraft[],
): Array<Record<string, unknown>> {
  const keep = existing.filter((e) => e.kind !== "shootout_goal" && e.kind !== "shootout_miss");
  const added = drafts.map((d) => ({
    kind: d.scored ? "shootout_goal" : "shootout_miss",
    teamId: d.teamId,
    memberId: d.shooterId,
    goalkeeperMemberId: d.goalkeeperId || null,
  }));
  return [...keep, ...added];
}
