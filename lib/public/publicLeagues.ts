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
  /** From the competition definition; null when not set. Used by the leagues filters. */
  sport: string | null;
  country: string | null;
  state: string | null;
  region: string | null;
};

type CompetitionMeta = {
  name: string | null;
  sport: string | null;
  country: string | null;
  state: string | null;
  region: string | null;
};

function cleanStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

function competitionMeta(c: Record<string, unknown> | null | undefined): CompetitionMeta {
  const geo = (c?.geographyScope ?? {}) as Record<string, unknown>;
  return {
    name: cleanStr(c?.name),
    sport: cleanStr(c?.sport),
    country: cleanStr(geo.country),
    state: cleanStr(geo.state),
    region: cleanStr(geo.region),
  };
}

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
          .project({ competitionId: 1, name: 1, sport: 1, geographyScope: 1 })
          .toArray()
      : [];

  const compMetaById = new Map<string, CompetitionMeta>();
  for (const c of comps) {
    if (c.competitionId) compMetaById.set(String(c.competitionId), competitionMeta(c));
  }
  const noMeta = competitionMeta(null);

  return scs.map((s) => {
    const meta = compMetaById.get(String(s.competitionId)) ?? noMeta;
    return {
      seasonCompetitionId: String(s.seasonCompetitionId),
      season: String(s.season ?? ""),
      competitionId: String(s.competitionId ?? ""),
      competitionName: meta.name,
      owningAssociationId: String(s.owningAssociationId ?? ""),
      status: String(s.status ?? ""),
      sport: meta.sport,
      country: meta.country,
      state: meta.state,
      region: meta.region,
    };
  });
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
  let meta = competitionMeta(null);
  if (competitionId) {
    const c = await db.collection("competitions").findOne(
      { competitionId },
      { projection: { name: 1, sport: 1, geographyScope: 1 } },
    );
    meta = competitionMeta(c);
  }

  return {
    seasonCompetitionId: String(sc.seasonCompetitionId),
    season: String(sc.season ?? ""),
    competitionId,
    competitionName: meta.name,
    owningAssociationId: String(sc.owningAssociationId ?? ""),
    status: String(sc.status ?? ""),
    sport: meta.sport,
    country: meta.country,
    state: meta.state,
    region: meta.region,
    divisions: Array.isArray(sc.divisions)
      ? (sc.divisions as PublicLeagueDivision[])
      : [],
  };
}
