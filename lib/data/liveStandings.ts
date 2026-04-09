// lib/data/liveStandings.ts
// Server-only helpers for computed standings (E4).

import clientPromise from "@/lib/mongodb";
import { computeSeasonCompetitionStandings } from "@/lib/competitions/standings";
import type { Division, Team } from "@/types";

const PUBLIC_SC_STATUSES = new Set(["published", "in_progress", "completed"]);

type ColorMap = Map<string, { primaryColor: string; secondaryColor: string }>;

let colorCachePromise: Promise<ColorMap> | null = null;

async function getClubColorMap(): Promise<ColorMap> {
  if (!colorCachePromise) {
    colorCachePromise = (async () => {
      try {
        const client = await clientPromise;
        const db = client.db("hockey-app");
        const clubs = await db
          .collection("clubs")
          .find(
            {},
            {
              projection: {
                name: 1,
                shortName: 1,
                slug: 1,
                "colors.primaryColor": 1,
                "colors.secondaryColor": 1,
              },
            },
          )
          .toArray();

        const map: ColorMap = new Map();
        for (const club of clubs) {
          const primary = club.colors?.primaryColor || "#06054e";
          const secondary = club.colors?.secondaryColor || "#1a1870";
          const entry = { primaryColor: primary, secondaryColor: secondary };

          const names = [club.name, club.shortName, club.slug].filter(
            Boolean,
          ) as string[];
          for (const n of names) map.set(n.toLowerCase(), entry);
        }

        return map;
      } catch {
        return new Map();
      }
    })();
  }
  return colorCachePromise;
}

function findColors(
  name: string,
  colorMap: ColorMap,
): { primaryColor?: string; secondaryColor?: string } {
  const lower = name.toLowerCase();
  if (colorMap.has(lower)) return colorMap.get(lower)!;
  for (const [key, colors] of colorMap) {
    if (lower.startsWith(key) || key.startsWith(lower)) return colors;
    if (lower.includes(key) || key.includes(lower)) return colors;
  }
  return {};
}

export async function listPublicSeasonCompetitions(): Promise<
  Array<{
    seasonCompetitionId: string;
    season: string;
    competitionId: string;
    competitionName: string | null;
    owningAssociationId: string;
    status: string;
  }>
> {
  const client = await clientPromise;
  const db = client.db("hockey-app");

  const scs = await db
    .collection("season_competitions")
    .find({ status: { $in: [...PUBLIC_SC_STATUSES] } })
    .project({
      seasonCompetitionId: 1,
      season: 1,
      competitionId: 1,
      owningAssociationId: 1,
      status: 1,
    })
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

  return scs
    .map((s) => ({
      seasonCompetitionId: String(s.seasonCompetitionId),
      season: String(s.season ?? ""),
      competitionId: String(s.competitionId ?? ""),
      competitionName: compNameById.get(String(s.competitionId)) ?? null,
      owningAssociationId: String(s.owningAssociationId ?? ""),
      status: String(s.status ?? ""),
    }))
    .filter((s) => s.seasonCompetitionId && s.season && s.competitionId)
    .sort((a, b) => (b.season || "").localeCompare(a.season || ""));
}

export async function getLiveStandingsDivision(
  seasonCompetitionId: string,
): Promise<Division | null> {
  const client = await clientPromise;
  const db = client.db("hockey-app");

  const sc = await db.collection("season_competitions").findOne({
    seasonCompetitionId,
  });
  if (!sc) return null;

  const status = sc.status as string | undefined;
  if (!status || !PUBLIC_SC_STATUSES.has(status)) return null;

  const requiresApproval = Boolean(sc.resultApprovalRequired);
  const standings = await computeSeasonCompetitionStandings({
    db,
    seasonCompetitionId,
    ladderRules: sc.ladderRules ?? null,
    requiresResultApproval: requiresApproval,
    publishedOnly: true,
  });

  const colorMap = await getClubColorMap();

  const teams: Team[] = standings.map((r) => {
    const club = r.teamName ?? r.teamId;
    return {
      pos: r.pos,
      club,
      pts: r.pts,
      p: r.p,
      w: r.w,
      d: r.d,
      l: r.l,
      goalsFor: r.gf,
      goalsAgainst: r.ga,
      gd: r.gd,
      ...findColors(club, colorMap),
    };
  });

  // Resolve division label from competition name + season
  const comp = await db.collection("competitions").findOne(
    { competitionId: sc.competitionId },
    { projection: { name: 1 } },
  );

  return {
    divisionName: comp?.name
      ? `${comp.name} — Ladder`
      : `Season Competition ${seasonCompetitionId} — Ladder`,
    year: sc.season ?? undefined,
    slug: seasonCompetitionId,
    teams,
  };
}

