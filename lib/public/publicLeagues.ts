// Shared query for public (published) season competitions — used by API + server pages.

import clientPromise from "@/lib/mongodb";

const PUBLIC_SC_STATUSES = ["published", "in_progress", "completed"] as const;

export type PublicLeagueRow = {
  seasonCompetitionId: string;
  season: string;
  competitionId: string;
  competitionName: string | null;
  owningAssociationId: string;
  status: string;
};

export async function listPublicLeagues(opts?: {
  season?: string;
  owningAssociationId?: string;
}): Promise<PublicLeagueRow[]> {
  const client = await clientPromise;
  const db = client.db("hockey-app");

  const q: Record<string, unknown> = {
    status: { $in: [...PUBLIC_SC_STATUSES] },
  };
  if (opts?.season) q.season = opts.season;
  if (opts?.owningAssociationId)
    q.owningAssociationId = opts.owningAssociationId;

  const scs = await db
    .collection("season_competitions")
    .find(q)
    .project({
      seasonCompetitionId: 1,
      season: 1,
      competitionId: 1,
      owningAssociationId: 1,
      status: 1,
    })
    .sort({ season: -1, seasonCompetitionId: 1 })
    .toArray();

  const competitionIds = Array.from(
    new Set(scs.map((s) => String(s.competitionId ?? "")).filter(Boolean)),
  );

  const comps =
    competitionIds.length > 0
      ? await db
          .collection("competitions")
          .find({ competitionId: { $in: competitionIds } })
          .project({ competitionId: 1, name: 1 })
          .toArray()
      : [];

  const compNameById = new Map<string, string>();
  for (const c of comps) {
    if (c.competitionId && c.name)
      compNameById.set(String(c.competitionId), String(c.name));
  }

  return scs.map((s) => ({
    seasonCompetitionId: String(s.seasonCompetitionId),
    season: String(s.season ?? ""),
    competitionId: String(s.competitionId ?? ""),
    competitionName: compNameById.get(String(s.competitionId)) ?? null,
    owningAssociationId: String(s.owningAssociationId ?? ""),
    status: String(s.status ?? ""),
  }));
}

export type PublicLeagueDivision = { divisionId?: string; name?: string };

export async function getPublicLeagueById(
  seasonCompetitionId: string,
): Promise<(PublicLeagueRow & { divisions: PublicLeagueDivision[] }) | null> {
  const client = await clientPromise;
  const db = client.db("hockey-app");

  const sc = await db.collection("season_competitions").findOne({
    seasonCompetitionId,
    status: { $in: [...PUBLIC_SC_STATUSES] },
  });
  if (!sc) return null;

  const competitionId = String(sc.competitionId ?? "");
  let competitionName: string | null = null;
  if (competitionId) {
    const c = await db.collection("competitions").findOne(
      { competitionId },
      { projection: { name: 1 } },
    );
    competitionName = c?.name ? String(c.name) : null;
  }

  return {
    seasonCompetitionId: String(sc.seasonCompetitionId),
    season: String(sc.season ?? ""),
    competitionId,
    competitionName,
    owningAssociationId: String(sc.owningAssociationId ?? ""),
    status: String(sc.status ?? ""),
    divisions: Array.isArray(sc.divisions)
      ? (sc.divisions as PublicLeagueDivision[])
      : [],
  };
}
