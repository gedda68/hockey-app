// lib/competitions/publishing.ts — publish or unpublish a competition's matches in one go (all of them, or one round).
import type { Db } from "mongodb";

export async function setFixturesPublished(db: Db, seasonCompetitionId: string, published: boolean, round?: number | null): Promise<number> {
  const q: Record<string, unknown> = { seasonCompetitionId, status: { $nin: ["cancelled"] } };
  if (typeof round === "number" && Number.isFinite(round)) q.round = round;
  const r = await db.collection("league_fixtures").updateMany(q, { $set: { published, publishedAt: published ? new Date().toISOString() : null } });
  return r.matchedCount ?? 0;
}
