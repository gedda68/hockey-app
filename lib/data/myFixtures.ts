import clientPromise from "@/lib/mongodb";
import type { Match } from "@/types";

const PUBLIC_SC_STATUSES = new Set(["published", "in_progress", "completed"]);

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

export type MyTeamsScope = { clubId?: string; associationId?: string };

/**
 * Resolve the current member's teamIds from:
 * - session.scopedRoles where scopeType="team" (coach/manager/etc.)
 * - teams.roster[].memberId matching session.memberId (players)
 *
 * Optionally filter the resulting teams to a club / association scope.
 */
export async function getMyTeamIdsForSession(opts: {
  userId: string;
  memberId?: string | null;
  scopedRoles?: Array<{ scopeType: string; scopeId?: string }>;
  scope?: MyTeamsScope;
}): Promise<string[]> {
  const teamIds = new Set<string>();

  for (const sr of opts.scopedRoles ?? []) {
    if (sr?.scopeType === "team" && typeof sr.scopeId === "string" && sr.scopeId.trim()) {
      teamIds.add(sr.scopeId.trim());
    }
  }

  const memberId = (opts.memberId ?? "").trim();
  if (memberId) {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const teamDocs = await db
      .collection("teams")
      .find(
        { "roster.memberId": memberId },
        { projection: { teamId: 1, clubId: 1 } },
      )
      .toArray();

    for (const t of teamDocs) {
      const tid = typeof t.teamId === "string" ? t.teamId.trim() : "";
      if (!tid) continue;
      teamIds.add(tid);
    }

    const mem = await db
      .collection("members")
      .findOne({ memberId }, { projection: { fanPreferences: 1 } });
    const fp = (mem as { fanPreferences?: { followedTeamIds?: string[] } } | null)?.fanPreferences;
    const followed = Array.isArray(fp?.followedTeamIds) ? fp!.followedTeamIds! : [];
    for (const tid of followed) {
      const id = String(tid ?? "").trim();
      if (id) teamIds.add(id);
    }
  }

  const ids = [...teamIds];
  if (!opts.scope?.clubId && !opts.scope?.associationId) return ids;

  // Filter to scope by looking up team → club / association.
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");

  const teams = await db
    .collection("teams")
    .find({ teamId: { $in: ids } }, { projection: { teamId: 1, clubId: 1 } })
    .toArray();

  const clubIdByTeam = new Map<string, string>();
  for (const t of teams) {
    const tid = typeof t.teamId === "string" ? t.teamId : "";
    const cid = typeof t.clubId === "string" ? t.clubId : "";
    if (tid) clubIdByTeam.set(tid, cid);
  }

  let allowedClubs: Set<string> | null = null;
  if (opts.scope.associationId) {
    const clubs = await db
      .collection("clubs")
      .find(
        {
          $or: [
            { associationId: opts.scope.associationId },
            { parentAssociationId: opts.scope.associationId },
          ],
        },
        { projection: { id: 1 } },
      )
      .toArray();
    allowedClubs = new Set(
      clubs.map((c) => (typeof c.id === "string" ? c.id : "")).filter(Boolean),
    );
  }

  return ids.filter((tid) => {
    const clubId = clubIdByTeam.get(tid) ?? "";
    if (opts.scope?.clubId) return clubId === opts.scope.clubId;
    if (allowedClubs) return allowedClubs.has(clubId);
    return true;
  });
}

/**
 * Load upcoming fixtures for the given teamIds and map them to the UI `Match` shape.
 * Uses `league_fixtures` directly so we can filter by homeTeamId/awayTeamId.
 */
export async function getMyUpcomingFixtures(opts: {
  teamIds: string[];
  limit?: number;
}): Promise<Match[]> {
  const ids = [...new Set(opts.teamIds.map((s) => s.trim()).filter(Boolean))];
  if (ids.length === 0) return [];

  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");

  const nowIso = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(); // include recent/just-started

  const rawFixtures = await db
    .collection("league_fixtures")
    .find(
      {
        published: true,
        scheduledStart: { $gte: nowIso },
        $or: [{ homeTeamId: { $in: ids } }, { awayTeamId: { $in: ids } }],
      },
      {
        projection: {
          fixtureId: 1,
          seasonCompetitionId: 1,
          competitionId: 1,
          round: 1,
          status: 1,
          homeTeamId: 1,
          awayTeamId: 1,
          scheduledStart: 1,
          venueName: 1,
          result: 1,
          resultStatus: 1,
        },
      },
    )
    .sort({ scheduledStart: 1, round: 1, fixtureId: 1 })
    .limit(Math.max(1, Math.min(50, opts.limit ?? 8)))
    .toArray();

  const teamIdSet = new Set<string>();
  const scIdSet = new Set<string>();
  for (const f of rawFixtures) {
    if (typeof f.homeTeamId === "string") teamIdSet.add(f.homeTeamId);
    if (typeof f.awayTeamId === "string") teamIdSet.add(f.awayTeamId);
    if (typeof f.seasonCompetitionId === "string") scIdSet.add(f.seasonCompetitionId);
  }

  const [teams, scs] = await Promise.all([
    teamIdSet.size > 0
      ? db
          .collection("teams")
          .find({ teamId: { $in: [...teamIdSet] } })
          .project({ teamId: 1, name: 1, clubId: 1 })
          .toArray()
      : [],
    scIdSet.size > 0
      ? db
          .collection("season_competitions")
          .find({ seasonCompetitionId: { $in: [...scIdSet] }, status: { $in: [...PUBLIC_SC_STATUSES] } })
          .project({ seasonCompetitionId: 1, competitionId: 1, season: 1, resultApprovalRequired: 1 })
          .toArray()
      : [],
  ]);

  const teamNameById = new Map<string, string>();
  for (const t of teams) {
    if (t.teamId && t.name) teamNameById.set(String(t.teamId), String(t.name));
  }

  const scById = new Map<string, any>();
  const compIdSet = new Set<string>();
  for (const s of scs) {
    const scId = String(s.seasonCompetitionId ?? "");
    if (!scId) continue;
    scById.set(scId, s);
    if (s.competitionId) compIdSet.add(String(s.competitionId));
  }

  const comps =
    compIdSet.size > 0
      ? await db
          .collection("competitions")
          .find({ competitionId: { $in: [...compIdSet] } })
          .project({ competitionId: 1, name: 1 })
          .toArray()
      : [];
  const compNameById = new Map<string, string>();
  for (const c of comps) {
    if (c.competitionId && c.name) compNameById.set(String(c.competitionId), String(c.name));
  }

  const out: Match[] = [];
  for (const f of rawFixtures) {
    const matchId = String(f.fixtureId ?? "").trim();
    const scId = String(f.seasonCompetitionId ?? "").trim();
    if (!matchId || !scId) continue;

    const sc = scById.get(scId);
    const division =
      (sc?.competitionId ? compNameById.get(String(sc.competitionId)) : null) ??
      String(f.competitionId ?? "Competition");

    const homeTeamId = typeof f.homeTeamId === "string" ? f.homeTeamId : "";
    const awayTeamId = typeof f.awayTeamId === "string" ? f.awayTeamId : "";
    const scheduled = asIsoDate(f.scheduledStart) ?? new Date().toISOString();

    const requiresApproval = Boolean(sc?.resultApprovalRequired);
    const isPublicResult =
      f.resultStatus === "approved" || (!requiresApproval && f.status === "completed" && f.result);
    const score = isPublicResult && f.result ? (f.result as any) : null;
    const hasShootout = Boolean(score?.homeShootOutScore || score?.awayShootOutScore);

    out.push({
      matchId,
      seasonCompetitionId: scId,
      division,
      round: f.round ?? "",
      status: normalizeMatchStatus(f.status, hasShootout),
      homeTeam: teamNameById.get(homeTeamId) ?? homeTeamId ?? "Home",
      awayTeam: teamNameById.get(awayTeamId) ?? awayTeamId ?? "Away",
      homeScore: typeof score?.homeScore === "number" ? score.homeScore : null,
      awayScore: typeof score?.awayScore === "number" ? score.awayScore : null,
      homeShootOutScore:
        typeof score?.homeShootOutScore === "number" ? score.homeShootOutScore : null,
      awayShootOutScore:
        typeof score?.awayShootOutScore === "number" ? score.awayShootOutScore : null,
      dateTime: scheduled,
      location: typeof f.venueName === "string" ? f.venueName : undefined,
    });
  }

  return out;
}

/**
 * Load recent results for the given teamIds (latest first) and map them to the UI `Match` shape.
 * Uses `league_fixtures` directly so we can filter by homeTeamId/awayTeamId.
 */
export async function getMyRecentFixtures(opts: {
  teamIds: string[];
  limit?: number;
}): Promise<Match[]> {
  const ids = [...new Set(opts.teamIds.map((s) => s.trim()).filter(Boolean))];
  if (ids.length === 0) return [];

  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");

  const nowIso = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // include just-finished

  const rawFixtures = await db
    .collection("league_fixtures")
    .find(
      {
        published: true,
        scheduledStart: { $lte: nowIso },
        status: { $in: ["completed", "in_progress"] },
        $or: [{ homeTeamId: { $in: ids } }, { awayTeamId: { $in: ids } }],
      },
      {
        projection: {
          fixtureId: 1,
          seasonCompetitionId: 1,
          competitionId: 1,
          round: 1,
          status: 1,
          homeTeamId: 1,
          awayTeamId: 1,
          scheduledStart: 1,
          venueName: 1,
          result: 1,
          resultStatus: 1,
        },
      },
    )
    .sort({ scheduledStart: -1, round: -1, fixtureId: -1 })
    .limit(Math.max(1, Math.min(50, opts.limit ?? 12)))
    .toArray();

  const teamIdSet = new Set<string>();
  const scIdSet = new Set<string>();
  for (const f of rawFixtures) {
    if (typeof f.homeTeamId === "string") teamIdSet.add(f.homeTeamId);
    if (typeof f.awayTeamId === "string") teamIdSet.add(f.awayTeamId);
    if (typeof f.seasonCompetitionId === "string") scIdSet.add(f.seasonCompetitionId);
  }

  const [teams, scs] = await Promise.all([
    teamIdSet.size > 0
      ? db
          .collection("teams")
          .find({ teamId: { $in: [...teamIdSet] } })
          .project({ teamId: 1, name: 1, clubId: 1 })
          .toArray()
      : [],
    scIdSet.size > 0
      ? db
          .collection("season_competitions")
          .find({ seasonCompetitionId: { $in: [...scIdSet] }, status: { $in: [...PUBLIC_SC_STATUSES] } })
          .project({ seasonCompetitionId: 1, competitionId: 1, season: 1, resultApprovalRequired: 1 })
          .toArray()
      : [],
  ]);

  const teamNameById = new Map<string, string>();
  for (const t of teams) {
    if (t.teamId && t.name) teamNameById.set(String(t.teamId), String(t.name));
  }

  const scById = new Map<string, any>();
  const compIdSet = new Set<string>();
  for (const s of scs) {
    const scId = String(s.seasonCompetitionId ?? "");
    if (!scId) continue;
    scById.set(scId, s);
    if (s.competitionId) compIdSet.add(String(s.competitionId));
  }

  const comps =
    compIdSet.size > 0
      ? await db
          .collection("competitions")
          .find({ competitionId: { $in: [...compIdSet] } })
          .project({ competitionId: 1, name: 1 })
          .toArray()
      : [];
  const compNameById = new Map<string, string>();
  for (const c of comps) {
    if (c.competitionId && c.name) compNameById.set(String(c.competitionId), String(c.name));
  }

  const out: Match[] = [];
  for (const f of rawFixtures) {
    const matchId = String(f.fixtureId ?? "").trim();
    const scId = String(f.seasonCompetitionId ?? "").trim();
    if (!matchId || !scId) continue;

    const sc = scById.get(scId);
    const division =
      (sc?.competitionId ? compNameById.get(String(sc.competitionId)) : null) ??
      String(f.competitionId ?? "Competition");

    const homeTeamId = typeof f.homeTeamId === "string" ? f.homeTeamId : "";
    const awayTeamId = typeof f.awayTeamId === "string" ? f.awayTeamId : "";
    const scheduled = asIsoDate(f.scheduledStart) ?? new Date().toISOString();

    const requiresApproval = Boolean(sc?.resultApprovalRequired);
    const isPublicResult =
      f.resultStatus === "approved" || (!requiresApproval && f.status === "completed" && f.result);
    const score = isPublicResult && f.result ? (f.result as any) : null;
    const hasShootout = Boolean(score?.homeShootOutScore || score?.awayShootOutScore);

    out.push({
      matchId,
      seasonCompetitionId: scId,
      division,
      round: f.round ?? "",
      status: normalizeMatchStatus(f.status, hasShootout),
      homeTeam: teamNameById.get(homeTeamId) ?? homeTeamId ?? "Home",
      awayTeam: teamNameById.get(awayTeamId) ?? awayTeamId ?? "Away",
      homeScore: typeof score?.homeScore === "number" ? score.homeScore : null,
      awayScore: typeof score?.awayScore === "number" ? score.awayScore : null,
      homeShootOutScore:
        typeof score?.homeShootOutScore === "number" ? score.homeShootOutScore : null,
      awayShootOutScore:
        typeof score?.awayShootOutScore === "number" ? score.awayShootOutScore : null,
      dateTime: scheduled,
      location: String(f.venueName ?? "") || "",
    });
  }

  return out;
}

