/**
 * Matches Data Functions
 *
 * Live match data derived from MongoDB (`league_fixtures`) (E2–E4).
 */

import type {
  Match as PublicMatch,
  FixtureMatchEventPublic,
  FixtureUmpireSlot,
  Season,
  ViewType,
} from "@/types";
import clientPromise from "@/lib/mongodb";
import type { PublicTenantPayload } from "@/lib/tenant/portalHost";
import { seasonCompetitionVisibleForPortalTenant } from "@/lib/tenant/seasonCompetitionTenantGate";

// Types
interface Match {
  matchId: string;
  seasonCompetitionId: string;
  season: number;
  round: number;
  division: string;
  dateTime: string;
  venue: string;
  legacyMatchId?: string | null;
  fixtureUmpires?: FixtureUmpireSlot[] | null;
  homeTeam: {
    name: string;
    icon?: string;
  };
  awayTeam: {
    name: string;
    icon?: string;
  };
  score?: {
    home: number;
    away: number;
  };
  shootoutScore?: {
    home: number;
    away: number;
  };
  status: string;
  isFeatureGame?: boolean;
  matchEvents?: FixtureMatchEventPublic[];
}

function mapStoredMatchToPublic(m: Match): PublicMatch {
  return {
    matchId: m.matchId,
    seasonCompetitionId: m.seasonCompetitionId,
    legacyMatchId: m.legacyMatchId ?? undefined,
    fixtureUmpires: m.fixtureUmpires?.length ? m.fixtureUmpires : undefined,
    matchEvents: m.matchEvents?.length ? m.matchEvents : undefined,
    division: m.division,
    round: m.round,
    status: m.status,
    homeTeam: m.homeTeam.name,
    homeTeamIcon: m.homeTeam.icon,
    awayTeam: m.awayTeam.name,
    awayTeamIcon: m.awayTeam.icon,
    homeScore: m.score?.home ?? null,
    awayScore: m.score?.away ?? null,
    homeShootOutScore: m.shootoutScore?.home ?? null,
    awayShootOutScore: m.shootoutScore?.away ?? null,
    dateTime: m.dateTime,
    location: m.venue,
    isFeatureGame: m.isFeatureGame,
  };
}

const PUBLIC_SC_STATUSES = new Set(["published", "in_progress", "completed"]);

function parseSeasonNumber(season: unknown): number {
  const n = Number(season);
  if (!Number.isFinite(n)) return new Date().getFullYear();
  return Math.trunc(n);
}

function asIsoDate(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function normalizeMatchStatus(fixtureStatus: unknown, hasShootout: boolean): string {
  const s = String(fixtureStatus ?? "").toLowerCase();
  if (s === "in_progress") return "Live";
  if (s === "completed") return hasShootout ? "Final (SO)" : "Final";
  return "Scheduled";
}

/**
 * Get all matches (upcoming + results)
 */
export async function getMatches(): Promise<Match[]> {
  try {
    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Only show season competitions that are publicly visible
    const seasonCompetitions = await db
      .collection("season_competitions")
      .find({ status: { $in: [...PUBLIC_SC_STATUSES] } })
      .project({
        seasonCompetitionId: 1,
        season: 1,
        competitionId: 1,
        resultApprovalRequired: 1,
        status: 1,
      })
      .toArray();

    const scById = new Map<string, any>();
    for (const s of seasonCompetitions) {
      if (s.seasonCompetitionId) scById.set(String(s.seasonCompetitionId), s);
    }

    const competitionIds = Array.from(
      new Set(seasonCompetitions.map((s) => String(s.competitionId ?? "")).filter(Boolean)),
    );

    const competitions =
      competitionIds.length > 0
        ? await db
            .collection("competitions")
            .find({ competitionId: { $in: competitionIds } })
            .project({ competitionId: 1, name: 1 })
            .toArray()
        : [];

    const compNameById = new Map<string, string>();
    for (const c of competitions) {
      if (c.competitionId && c.name) compNameById.set(String(c.competitionId), String(c.name));
    }

    const seasonCompetitionIds = [...scById.keys()];
    if (seasonCompetitionIds.length === 0) return [];

    const fixtures = await db
      .collection("league_fixtures")
      .find({
        seasonCompetitionId: { $in: seasonCompetitionIds },
        published: true,
      })
      .project({
        fixtureId: 1,
        seasonCompetitionId: 1,
        round: 1,
        status: 1,
        homeTeamId: 1,
        awayTeamId: 1,
        scheduledStart: 1,
        venueName: 1,
        addressLine: 1,
        result: 1,
        resultStatus: 1,
        legacyMatchId: 1,
        umpires: 1,
        matchEvents: 1,
      })
      .toArray();

    const teamIds = new Set<string>();
    for (const f of fixtures) {
      if (f.homeTeamId) teamIds.add(String(f.homeTeamId));
      if (f.awayTeamId) teamIds.add(String(f.awayTeamId));
    }

    const teams =
      teamIds.size > 0
        ? await db
            .collection("teams")
            .find({ teamId: { $in: [...teamIds] } })
            .project({ teamId: 1, name: 1, clubId: 1 })
            .toArray()
        : [];

    const teamNameById = new Map<string, string>();
    const teamClubIdById = new Map<string, string>();
    for (const t of teams) {
      if (t.teamId && t.name) teamNameById.set(String(t.teamId), String(t.name));
      if (t.teamId && t.clubId) teamClubIdById.set(String(t.teamId), String(t.clubId));
    }

    const clubIds = Array.from(new Set([...teamClubIdById.values()].filter(Boolean)));
    const clubs =
      clubIds.length > 0
        ? await db
            .collection("clubs")
            .find({ id: { $in: clubIds } })
            .project({ id: 1, logo: 1, iconSrc: 1, icon: 1, slug: 1, name: 1 })
            .toArray()
        : [];

    const clubLogoById = new Map<string, string>();
    for (const c of clubs) {
      const iconUrl =
        (typeof c.logo === "string" && c.logo) ||
        (typeof c.iconSrc === "string" && c.iconSrc) ||
        (typeof c.icon === "string" && c.icon) ||
        "";
      if (c.id && iconUrl) clubLogoById.set(String(c.id), iconUrl);
    }

    const out: Match[] = [];
    for (const f of fixtures) {
      const sc = scById.get(String(f.seasonCompetitionId));
      if (!sc) continue;

      const season = parseSeasonNumber(sc.season);
      const division =
        compNameById.get(String(sc.competitionId)) ??
        String(sc.competitionId ?? "Competition");

      const requiresApproval = Boolean(sc.resultApprovalRequired);
      const rs = String(f.resultStatus ?? "");
      const canShowResult = requiresApproval ? rs === "approved" : String(f.status) === "completed";

      const result = (f.result ?? null) as any;
      const homeScore = canShowResult ? (typeof result?.homeScore === "number" ? result.homeScore : null) : null;
      const awayScore = canShowResult ? (typeof result?.awayScore === "number" ? result.awayScore : null) : null;
      const sh = canShowResult ? (typeof result?.shootoutHomeScore === "number" ? result.shootoutHomeScore : null) : null;
      const sa = canShowResult ? (typeof result?.shootoutAwayScore === "number" ? result.shootoutAwayScore : null) : null;
      const hasShootout = sh != null && sa != null;

      const venue =
        String(f.venueName ?? "") ||
        String(f.addressLine ?? "") ||
        "";

      const dateTime = asIsoDate(f.scheduledStart) ?? new Date().toISOString();

      const rawUmpires = f.umpires as FixtureUmpireSlot[] | null | undefined;
      const fixtureUmpires =
        Array.isArray(rawUmpires) && rawUmpires.length > 0 ? rawUmpires : null;

      const rawEvents = f.matchEvents as FixtureMatchEventPublic[] | null | undefined;
      const matchEvents =
        canShowResult && Array.isArray(rawEvents) && rawEvents.length > 0
          ? rawEvents
          : undefined;

      out.push({
        matchId: String(f.fixtureId),
        seasonCompetitionId: String(f.seasonCompetitionId),
        legacyMatchId:
          typeof f.legacyMatchId === "string" && f.legacyMatchId
            ? f.legacyMatchId
            : null,
        fixtureUmpires,
        matchEvents,
        season,
        round: Number(f.round ?? 0),
        division,
        dateTime,
        venue,
        homeTeam: {
          name: teamNameById.get(String(f.homeTeamId)) ?? String(f.homeTeamId ?? "Home"),
          icon:
            clubLogoById.get(teamClubIdById.get(String(f.homeTeamId)) ?? "") ??
            undefined,
        },
        awayTeam: {
          name: teamNameById.get(String(f.awayTeamId)) ?? String(f.awayTeamId ?? "Away"),
          icon:
            clubLogoById.get(teamClubIdById.get(String(f.awayTeamId)) ?? "") ??
            undefined,
        },
        score:
          homeScore != null && awayScore != null
            ? { home: homeScore, away: awayScore }
            : undefined,
        shootoutScore:
          hasShootout && sh != null && sa != null
            ? { home: sh, away: sa }
            : undefined,
        status: normalizeMatchStatus(f.status, hasShootout),
      });
    }

    // Stable sort: date then id
    out.sort((a, b) => {
      const t = new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
      if (t !== 0) return t;
      return a.matchId.localeCompare(b.matchId);
    });

    return out;
  } catch (error) {
    console.error("Failed to load matches:", error);
    return [];
  }
}

/**
 * Get match by ID
 */
export async function getMatchById(
  matchId: string
): Promise<Match | undefined> {
  const matches = await getMatches();
  return matches.find((m) => m.matchId === matchId);
}

/**
 * Match centre: fetch one published fixture by fixtureId with tenant gating.
 */
export async function getPublicMatchById(
  fixtureId: string,
  tenant: PublicTenantPayload | null,
): Promise<PublicMatch | null> {
  const id = fixtureId.trim();
  if (!id) return null;

  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");

  const fx = await db.collection("league_fixtures").findOne({
    fixtureId: id,
    published: true,
  });
  if (!fx) return null;

  const scId = String(fx.seasonCompetitionId ?? "");
  if (!scId) return null;
  const sc = await db.collection("season_competitions").findOne({
    seasonCompetitionId: scId,
  });
  if (!sc) return null;

  const owner = String(sc.owningAssociationId ?? "");
  const visible = await seasonCompetitionVisibleForPortalTenant(db, owner, tenant);
  if (!visible) return null;

  const status = sc.status as string | undefined;
  if (!status || !PUBLIC_SC_STATUSES.has(status)) return null;

  const teamIds = [fx.homeTeamId, fx.awayTeamId]
    .filter(Boolean)
    .map((x) => String(x));

  const teams =
    teamIds.length > 0
      ? await db
          .collection("teams")
          .find({ teamId: { $in: teamIds } })
          .project({ teamId: 1, name: 1, clubId: 1 })
          .toArray()
      : [];

  const teamNameById = new Map<string, string>();
  const teamClubIdById = new Map<string, string>();
  for (const t of teams) {
    if (t.teamId && t.name) teamNameById.set(String(t.teamId), String(t.name));
    if (t.teamId && t.clubId) teamClubIdById.set(String(t.teamId), String(t.clubId));
  }

  const clubIds = Array.from(new Set([...teamClubIdById.values()].filter(Boolean)));
  const clubs =
    clubIds.length > 0
      ? await db
          .collection("clubs")
          .find({ id: { $in: clubIds } })
          .project({ id: 1, logo: 1, iconSrc: 1, icon: 1 })
          .toArray()
      : [];

  const clubLogoById = new Map<string, string>();
  for (const c of clubs) {
    const iconUrl =
      (typeof c.logo === "string" && c.logo) ||
      (typeof c.iconSrc === "string" && c.iconSrc) ||
      (typeof c.icon === "string" && c.icon) ||
      "";
    if (c.id && iconUrl) clubLogoById.set(String(c.id), iconUrl);
  }

  const homeTeamId = String(fx.homeTeamId ?? "");
  const awayTeamId = String(fx.awayTeamId ?? "");

  const requiresApproval = Boolean(sc.resultApprovalRequired);
  const rs = String(fx.resultStatus ?? "");
  const canShowResult = requiresApproval
    ? rs === "approved"
    : String(fx.status) === "completed";
  const result = (fx.result ?? null) as any;
  const homeScore = canShowResult ? (typeof result?.homeScore === "number" ? result.homeScore : null) : null;
  const awayScore = canShowResult ? (typeof result?.awayScore === "number" ? result.awayScore : null) : null;
  const sh = canShowResult ? (typeof result?.shootoutHomeScore === "number" ? result.shootoutHomeScore : null) : null;
  const sa = canShowResult ? (typeof result?.shootoutAwayScore === "number" ? result.shootoutAwayScore : null) : null;
  const hasShootout = sh != null && sa != null;

  const rawUmpires = fx.umpires as FixtureUmpireSlot[] | null | undefined;
  const fixtureUmpires = Array.isArray(rawUmpires) && rawUmpires.length > 0 ? rawUmpires : undefined;

  const rawEvents = fx.matchEvents as FixtureMatchEventPublic[] | null | undefined;
  const matchEvents =
    canShowResult && Array.isArray(rawEvents) && rawEvents.length > 0 ? rawEvents : undefined;

  const venue =
    String(fx.venueName ?? "") ||
    String(fx.addressLine ?? "") ||
    "";
  const dateTime = asIsoDate(fx.scheduledStart) ?? new Date().toISOString();

  const m: Match = {
    matchId: String(fx.fixtureId ?? id),
    seasonCompetitionId: scId,
    season: parseSeasonNumber(sc.season),
    round: Number(fx.round ?? 0),
    division: String(sc.competitionId ?? ""),
    dateTime,
    venue,
    legacyMatchId: fx.legacyMatchId ? String(fx.legacyMatchId) : null,
    fixtureUmpires: fixtureUmpires ?? null,
    homeTeam: {
      name: teamNameById.get(homeTeamId) ?? "Home",
      icon: clubLogoById.get(teamClubIdById.get(homeTeamId) ?? "") || undefined,
    },
    awayTeam: {
      name: teamNameById.get(awayTeamId) ?? "Away",
      icon: clubLogoById.get(teamClubIdById.get(awayTeamId) ?? "") || undefined,
    },
    score: homeScore != null && awayScore != null ? { home: homeScore, away: awayScore } : undefined,
    shootoutScore: hasShootout ? { home: sh!, away: sa! } : undefined,
    status: normalizeMatchStatus(fx.status, hasShootout),
    matchEvents,
  };

  return mapStoredMatchToPublic(m);
}

export type PublicMatchCentre = {
  match: PublicMatch;
  teamNameById: Record<string, string>;
  venue: { name: string | null; addressLine: string | null };
  umpires: FixtureUmpireSlot[] | null;
};

export async function getPublicMatchCentreById(
  fixtureId: string,
  tenant: PublicTenantPayload | null,
): Promise<PublicMatchCentre | null> {
  const id = fixtureId.trim();
  if (!id) return null;

  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");

  const fx = await db.collection("league_fixtures").findOne({
    fixtureId: id,
    published: true,
  });
  if (!fx) return null;

  const scId = String(fx.seasonCompetitionId ?? "");
  if (!scId) return null;
  const sc = await db.collection("season_competitions").findOne({
    seasonCompetitionId: scId,
  });
  if (!sc) return null;

  const owner = String(sc.owningAssociationId ?? "");
  const visible = await seasonCompetitionVisibleForPortalTenant(db, owner, tenant);
  if (!visible) return null;

  const status = sc.status as string | undefined;
  if (!status || !PUBLIC_SC_STATUSES.has(status)) return null;

  const teamIds = [fx.homeTeamId, fx.awayTeamId]
    .filter(Boolean)
    .map((x) => String(x));

  const teams =
    teamIds.length > 0
      ? await db
          .collection("teams")
          .find({ teamId: { $in: teamIds } })
          .project({ teamId: 1, name: 1, clubId: 1 })
          .toArray()
      : [];

  const teamNameById = new Map<string, string>();
  const teamClubIdById = new Map<string, string>();
  for (const t of teams) {
    if (t.teamId && t.name) teamNameById.set(String(t.teamId), String(t.name));
    if (t.teamId && t.clubId) teamClubIdById.set(String(t.teamId), String(t.clubId));
  }

  const clubIds = Array.from(new Set([...teamClubIdById.values()].filter(Boolean)));
  const clubs =
    clubIds.length > 0
      ? await db
          .collection("clubs")
          .find({ id: { $in: clubIds } })
          .project({ id: 1, logo: 1, iconSrc: 1, icon: 1 })
          .toArray()
      : [];

  const clubLogoById = new Map<string, string>();
  for (const c of clubs) {
    const iconUrl =
      (typeof c.logo === "string" && c.logo) ||
      (typeof c.iconSrc === "string" && c.iconSrc) ||
      (typeof c.icon === "string" && c.icon) ||
      "";
    if (c.id && iconUrl) clubLogoById.set(String(c.id), iconUrl);
  }

  const homeTeamId = String(fx.homeTeamId ?? "");
  const awayTeamId = String(fx.awayTeamId ?? "");

  const requiresApproval = Boolean(sc.resultApprovalRequired);
  const rs = String(fx.resultStatus ?? "");
  const canShowResult = requiresApproval
    ? rs === "approved"
    : String(fx.status) === "completed";
  const result = (fx.result ?? null) as any;
  const homeScore = canShowResult ? (typeof result?.homeScore === "number" ? result.homeScore : null) : null;
  const awayScore = canShowResult ? (typeof result?.awayScore === "number" ? result.awayScore : null) : null;
  const sh = canShowResult ? (typeof result?.shootoutHomeScore === "number" ? result.shootoutHomeScore : null) : null;
  const sa = canShowResult ? (typeof result?.shootoutAwayScore === "number" ? result.shootoutAwayScore : null) : null;
  const hasShootout = sh != null && sa != null;

  const rawUmpires = fx.umpires as FixtureUmpireSlot[] | null | undefined;
  const fixtureUmpires =
    Array.isArray(rawUmpires) && rawUmpires.length > 0 ? rawUmpires : null;

  const rawEvents = fx.matchEvents as FixtureMatchEventPublic[] | null | undefined;
  const matchEvents =
    canShowResult && Array.isArray(rawEvents) && rawEvents.length > 0 ? rawEvents : undefined;

  const venueName = fx.venueName ? String(fx.venueName) : null;
  const addressLine = fx.addressLine ? String(fx.addressLine) : null;
  const venue =
    venueName || addressLine ? String(venueName ?? addressLine) : "";
  const dateTime = asIsoDate(fx.scheduledStart) ?? new Date().toISOString();

  const m: Match = {
    matchId: String(fx.fixtureId ?? id),
    seasonCompetitionId: scId,
    season: parseSeasonNumber(sc.season),
    round: Number(fx.round ?? 0),
    division: String(sc.competitionId ?? ""),
    dateTime,
    venue,
    legacyMatchId: fx.legacyMatchId ? String(fx.legacyMatchId) : null,
    fixtureUmpires: fixtureUmpires ?? null,
    homeTeam: {
      name: teamNameById.get(homeTeamId) ?? "Home",
      icon: clubLogoById.get(teamClubIdById.get(homeTeamId) ?? "") || undefined,
    },
    awayTeam: {
      name: teamNameById.get(awayTeamId) ?? "Away",
      icon: clubLogoById.get(teamClubIdById.get(awayTeamId) ?? "") || undefined,
    },
    score: homeScore != null && awayScore != null ? { home: homeScore, away: awayScore } : undefined,
    shootoutScore: hasShootout ? { home: sh!, away: sa! } : undefined,
    status: normalizeMatchStatus(fx.status, hasShootout),
    matchEvents,
  };

  const match = mapStoredMatchToPublic(m);

  return {
    match,
    teamNameById: Object.fromEntries(teamNameById.entries()),
    venue: { name: venueName, addressLine },
    umpires: fixtureUmpires,
  };
}

/**
 * Get matches by division
 */
export async function getMatchesByDivision(division: string): Promise<Match[]> {
  const matches = await getMatches();
  return matches.filter((m) => m.division === division);
}

/**
 * Get matches by season
 */
export async function getMatchesBySeason(season: number): Promise<Match[]> {
  const matches = await getMatches();
  return matches.filter((m) => m.season === season);
}

/**
 * Get matches by status
 */
export async function getMatchesByStatus(status: string): Promise<Match[]> {
  const matches = await getMatches();
  return matches.filter((m) => m.status === status);
}

/**
 * Get upcoming matches
 */
export async function getUpcomingMatches(): Promise<Match[]> {
  const matches = await getMatches();
  const now = new Date();

  return matches
    .filter((m) => {
      const matchDate = new Date(m.dateTime);
      return matchDate > now || m.status === "Scheduled";
    })
    .sort(
      (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    );
}

/**
 * Get completed matches (results)
 */
export async function getCompletedMatches(): Promise<Match[]> {
  const matches = await getMatches();

  return matches
    .filter((m) => m.status.toLowerCase().includes("final"))
    .sort(
      (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
    );
}

/**
 * Get feature games
 */
export async function getFeatureGames(): Promise<Match[]> {
  const matches = await getMatches();
  return matches.filter((m) => m.isFeatureGame);
}

/**
 * Get all divisions
 */
export async function getDivisions(): Promise<string[]> {
  const matches = await getMatches();
  const divisions = new Set(matches.map((m) => m.division));
  return Array.from(divisions).sort();
}

export type SeasonCompetitionOption = {
  seasonCompetitionId: string;
  season: string;
  competitionId: string;
  competitionName: string | null;
  label: string;
};

/** Public options for filtering matches by season competition (competition + season). */
export async function getSeasonCompetitionOptions(): Promise<SeasonCompetitionOption[]> {
  const client = await clientPromise;
  const db = client.db("hockey-app");

  const scs = await db
    .collection("season_competitions")
    .find({ status: { $in: [...PUBLIC_SC_STATUSES] } })
    .project({ seasonCompetitionId: 1, season: 1, competitionId: 1 })
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
    if (c.competitionId && c.name) compNameById.set(String(c.competitionId), String(c.name));
  }

  return scs
    .map((s) => {
      const scId = String(s.seasonCompetitionId ?? "");
      const season = String(s.season ?? "");
      const competitionId = String(s.competitionId ?? "");
      const competitionName = compNameById.get(competitionId) ?? null;
      const label = `${competitionName ?? competitionId} ${season}`.trim();
      return { seasonCompetitionId: scId, season, competitionId, competitionName, label };
    })
    .filter((s) => s.seasonCompetitionId && s.season && s.competitionId)
    .sort((a, b) => b.season.localeCompare(a.season) || a.label.localeCompare(b.label));
}

/** Rounds available for a given season competition (published fixtures only). */
export async function getRoundsForSeasonCompetition(
  seasonCompetitionId: string,
): Promise<string[]> {
  const client = await clientPromise;
  const db = client.db("hockey-app");
  const fixtures = await db
    .collection("league_fixtures")
    .find({ seasonCompetitionId, published: true })
    .project({ round: 1 })
    .toArray();
  const rounds = new Set<number>();
  for (const f of fixtures) {
    const r = Number(f.round);
    if (Number.isFinite(r) && r > 0) rounds.add(Math.trunc(r));
  }
  return ["All", ...Array.from(rounds).sort((a, b) => a - b).map(String)];
}

/**
 * Get all seasons
 */
export async function getSeasons(): Promise<Season[]> {
  const matches = await getMatches();
  const currentYear = await getCurrentSeason();

  if (!Array.isArray(matches) || matches.length === 0) {
    const y = new Date().getFullYear();
    return [{ year: y, isCurrent: y === currentYear }];
  }

  const seasonYears = new Set(matches.map((m) => m.season));
  const now = new Date().getFullYear();

  return Array.from(seasonYears)
    .filter((s) => s && s >= 2020 && s <= now + 1)
    .sort((a, b) => b - a)
    .map((year) => ({
      year,
      isCurrent: year === currentYear,
    }));
}

/**
 * Get all rounds
 */
export async function getRounds(): Promise<string[]> {
  const matches = await getMatches();
  const rounds = new Set<number>();

  matches.forEach((m) => {
    if (m.round > 0 && m.round < 90) {
      rounds.add(m.round);
    }
  });

  return Array.from(rounds)
    .sort((a, b) => a - b)
    .map((r) => r.toString());
}

/**
 * Get current season
 */
export async function getCurrentSeason(): Promise<number> {
  try {
    const client = await clientPromise;
    const db = client.db("hockey-app");
    const latest = await db
      .collection("season_competitions")
      .find({ status: { $in: [...PUBLIC_SC_STATUSES] } })
      .project({ season: 1 })
      .sort({ season: -1 })
      .limit(1)
      .toArray();
    if (latest[0]?.season) return parseSeasonNumber(latest[0].season);
    return new Date().getFullYear();
  } catch {
    return new Date().getFullYear();
  }
}

/**
 * Get matches for a team
 */
export async function getMatchesForTeam(teamName: string): Promise<Match[]> {
  const matches = await getMatches();

  return matches.filter(
    (m) => m.homeTeam.name === teamName || m.awayTeam.name === teamName
  );
}

/**
 * Get recent matches (last 10)
 */
export async function getRecentMatches(limit: number = 10): Promise<Match[]> {
  const matches = await getCompletedMatches();
  return matches.slice(0, limit);
}

/**
 * Filter matches by multiple criteria
 */
export async function filterMatches(filters: {
  division?: string;
  season?: number;
  seasonCompetitionId?: string;
  round?: string;
  status?: string;
  view?: ViewType;
}): Promise<PublicMatch[]> {
  let matches = await getMatches();

  if (filters.view === "upcoming") {
    const now = new Date();
    matches = matches.filter(
      (m) =>
        m.status === "Scheduled" || new Date(m.dateTime).getTime() >= now.getTime(),
    );
  } else if (filters.view === "results") {
    matches = matches.filter((m) =>
      ["Final", "Live"].includes(String(m.status)),
    );
  }

  if (filters.seasonCompetitionId) {
    matches = matches.filter((m) => m.seasonCompetitionId === filters.seasonCompetitionId);
  } else if (filters.division && filters.division !== "All") {
    matches = matches.filter((m) => m.division === filters.division);
  }

  if (filters.season) {
    matches = matches.filter((m) => m.season === filters.season);
  }

  if (filters.round && filters.round !== "All") {
    matches = matches.filter((m) => m.round.toString() === filters.round);
  }

  if (filters.status && filters.status !== "All") {
    matches = matches.filter((m) => m.status === filters.status);
  }

  return matches.map(mapStoredMatchToPublic);
}

/**
 * Get match stats data (placeholder - returns empty for now)
 */
export async function getMatchStatsData(): Promise<any> {
  // This would typically load from matchstats.json
  // For now, return empty object to prevent errors
  return {
    topScorers: [],
    topAssists: [],
    teamStats: [],
  };
}
