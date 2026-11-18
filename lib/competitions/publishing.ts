// lib/competitions/publishing.ts — publish or unpublish a competition's matches in one go (all of them, or one round).
import type { Db } from "mongodb";

export async function setFixturesPublished(db: Db, seasonCompetitionId: string, published: boolean, round?: number | null): Promise<number> {
  const q: Record<string, unknown> = { seasonCompetitionId, status: { $nin: ["cancelled"] } };
  if (typeof round === "number" && Number.isFinite(round)) q.round = round;
  const r = await db.collection("league_fixtures").updateMany(q, { $set: { published, publishedAt: published ? new Date().toISOString() : null } });
  return r.matchedCount ?? 0;
}

export interface RoundSummary { round: number; label: string; finals: boolean; total: number; published: number }
/** Matches counted by round (finals rounds are labelled by finals week), for the publishing screen. Cancelled matches are left out. */
export function summariseRounds(fixtures: { round?: unknown; published?: unknown; matchLevel?: unknown; status?: unknown }[]): RoundSummary[] {
  const by = new Map<number, RoundSummary>();
  const finalRounds = [...new Set(fixtures.filter((f) => f.matchLevel === "finals" && Number.isInteger(Number(f.round))).map((f) => Number(f.round)))].sort((a, b) => a - b);
  for (const f of fixtures) {
    if (f.status === "cancelled" || !Number.isInteger(Number(f.round))) continue;
    const round = Number(f.round), finals = f.matchLevel === "finals";
    const row = by.get(round) ?? { round, label: finals ? `Finals week ${finalRounds.indexOf(round) + 1}` : `Round ${round}`, finals, total: 0, published: 0 };
    row.total++; if (f.published === true) row.published++;
    by.set(round, row);
  }
  return [...by.values()].sort((a, b) => a.round - b.round);
}
