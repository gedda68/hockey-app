/**
 * Standings Data Functions
 *
 * Load standings data from /data folder, enriched with club brand colours
 * fetched from the clubs MongoDB collection.
 */

import standingsData from "../../data/standings/standings.json";
import clientPromise from "@/lib/mongodb";

// Types
interface StandingsTeam {
  pos: number;
  club: string;
  icon: string;
  p: number;
  w: number;
  d: number;
  l: number;
  gd: number;
  pts: number;
  primaryColor?: string;
  secondaryColor?: string;
}

interface Division {
  divisionName: string;
  slug: string;
  teams: StandingsTeam[];
}

// ── Club colour cache ─────────────────────────────────────────────────────────
// Key: lower-cased club name fragment (e.g. "souths")
// Value: { primaryColor, secondaryColor }
type ColorMap = Map<string, { primaryColor: string; secondaryColor: string }>;

let colorCachePromise: Promise<ColorMap> | null = null;

async function getClubColorMap(): Promise<ColorMap> {
  if (!colorCachePromise) {
    colorCachePromise = (async () => {
      try {
        const client = await clientPromise;
        const db     = client.db("hockey-app");
        const clubs  = await db
          .collection("clubs")
          .find(
            {},
            {
              projection: {
                name:           1,
                shortName:      1,
                slug:           1,
                "colors.primaryColor":   1,
                "colors.secondaryColor": 1,
              },
            }
          )
          .toArray();

        const map: ColorMap = new Map();
        for (const club of clubs) {
          const primary   = club.colors?.primaryColor   || "#06054e";
          const secondary = club.colors?.secondaryColor || "#1a1870";
          const entry     = { primaryColor: primary, secondaryColor: secondary };

          // Index by name variants so fuzzy matching works across JSON club names
          const names = [
            club.name,
            club.shortName,
            club.slug,
          ].filter(Boolean) as string[];

          for (const n of names) {
            map.set(n.toLowerCase(), entry);
          }
        }
        return map;
      } catch {
        return new Map();
      }
    })();
  }
  return colorCachePromise;
}

/**
 * Try to find a colour entry for a standings team name.
 * Matches exact lower-cased key first, then checks if any key contains
 * the team name or vice-versa (handles "Souths HC" ↔ "Souths" etc.)
 */
function findColors(
  name: string,
  colorMap: ColorMap,
): { primaryColor?: string; secondaryColor?: string } {
  const lower = name.toLowerCase();

  // 1. Exact match
  if (colorMap.has(lower)) return colorMap.get(lower)!;

  // 2. Partial match — team name starts with a known club key
  for (const [key, colors] of colorMap) {
    if (lower.startsWith(key) || key.startsWith(lower)) return colors;
    // word-boundary check (e.g. "Souths HC" contains "souths")
    if (lower.includes(key) || key.includes(lower)) return colors;
  }

  return {};
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getStandingsYears(): Promise<string[]> {
  try {
    const data    = standingsData as any;
    const seasons = data.seasons || {};
    return Object.keys(seasons).sort((a, b) => parseInt(b) - parseInt(a));
  } catch {
    return [];
  }
}

export async function getDivisionsByYear(year: string): Promise<Division[]> {
  try {
    const data     = standingsData as any;
    const yearData = data.seasons?.[year];
    if (!yearData) return [];

    const colorMap = await getClubColorMap();
    const divisions: Division[] = [];

    for (const [divisionName, divisionData] of Object.entries(yearData)) {
      const division = divisionData as any;
      const teams: StandingsTeam[] = (division.teams || []).map((t: any) => ({
        ...t,
        ...findColors(t.club ?? "", colorMap),
      }));
      divisions.push({
        divisionName,
        slug: division.slug || divisionName.toLowerCase().replace(/\s+/g, "-"),
        teams,
      });
    }

    return divisions;
  } catch {
    return [];
  }
}

export async function getDivisionStandings(
  year: string,
  divisionName: string,
): Promise<Division | null> {
  try {
    const divisions = await getDivisionsByYear(year);
    return divisions.find((d) => d.divisionName === divisionName) || null;
  } catch {
    return null;
  }
}

export async function getAllDivisions(): Promise<string[]> {
  try {
    const data    = standingsData as any;
    const seasons = data.seasons || {};
    const divSet  = new Set<string>();
    for (const yearData of Object.values(seasons)) {
      for (const divisionName of Object.keys(yearData as any)) {
        divSet.add(divisionName);
      }
    }
    return Array.from(divSet).sort();
  } catch {
    return [];
  }
}

export async function getTopTeams(limit = 5): Promise<StandingsTeam[]> {
  try {
    const years = await getStandingsYears();
    if (years.length === 0) return [];

    const divisions = await getDivisionsByYear(years[0]);
    const allTeams: StandingsTeam[] = [];
    divisions.forEach((d) => allTeams.push(...d.teams));

    allTeams.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      return b.gd - a.gd;
    });

    return allTeams.slice(0, limit);
  } catch {
    return [];
  }
}

export async function getTeamStandings(
  teamName: string,
): Promise<{ year: string; division: string; standing: StandingsTeam }[]> {
  try {
    const data    = standingsData as any;
    const seasons = data.seasons || {};
    const results: { year: string; division: string; standing: StandingsTeam }[] = [];
    const colorMap = await getClubColorMap();

    for (const [year, yearData] of Object.entries(seasons)) {
      const divisions = yearData as any;
      for (const [divisionName, divisionData] of Object.entries(divisions)) {
        const division = divisionData as any;
        const team     = division.teams?.find((t: StandingsTeam) => t.club === teamName);
        if (team) {
          results.push({
            year,
            division: divisionName,
            standing: { ...team, ...findColors(team.club, colorMap) },
          });
        }
      }
    }

    return results.sort((a, b) => parseInt(b.year) - parseInt(a.year));
  } catch {
    return [];
  }
}

export async function getCurrentSeasonStandings(): Promise<Division[]> {
  try {
    const years = await getStandingsYears();
    if (years.length === 0) return [];
    return getDivisionsByYear(years[0]);
  } catch {
    return [];
  }
}
