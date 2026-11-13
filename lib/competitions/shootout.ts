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
