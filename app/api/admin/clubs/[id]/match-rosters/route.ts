// GET /api/admin/clubs/[id]/match-rosters
// A club's own upcoming/recent matches (all its teams) with the roster edit
// window for each, plus the club's eligible players. Clubs only ever see their
// own teams — never another club's.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAnyPermission, requireResourceAccess } from "@/lib/auth/middleware";
import { formatSeasonLabel } from "@/lib/competitions/seasonLabel";
import { FIXTURE_LINEUPS_COLLECTION } from "@/lib/db/schemas/fixtureLineup.schema";
import { lineupEditWindow } from "@/lib/lineups/lineupLock";
import { memberBelongsToClubFilter } from "@/lib/rosters/memberClubQuery";
import { normalizeClubId } from "@/lib/rosters/associationRosterDivisions";

type Params = { params: Promise<{ id: string }> };

const RECENT_DAYS = 7;

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { response } = await requireAnyPermission(request, ["team.roster", "team.edit"]);
    if (response) return response;
    const scope = await requireResourceAccess(request, "club", id);
    if (scope.response) return scope.response;

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");
    const club = await db.collection("clubs").findOne({ $or: [{ slug: id }, { id }, { clubId: id }] });
    if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });
    const clubId = normalizeClubId(club);

    const teams = await db
      .collection("teams")
      .find({ clubId, status: { $ne: "archived" } })
      .project({ _id: 0, teamId: 1, name: 1 })
      .toArray();
    const teamName = new Map(teams.map((t) => [t.teamId as string, String(t.name ?? t.teamId)]));
    const ownIds = [...teamName.keys()];
    if (!ownIds.length) return NextResponse.json({ club: { id: clubId, name: club.name }, matches: [], players: [] });

    const since = new Date(Date.now() - RECENT_DAYS * 86_400_000).toISOString();
    const fixtures = await db
      .collection("league_fixtures")
      .find({
        $or: [{ homeTeamId: { $in: ownIds } }, { awayTeamId: { $in: ownIds } }],
        status: { $ne: "cancelled" },
        $and: [{ $or: [{ scheduledStart: null }, { scheduledStart: { $gte: since } }] }],
      })
      .project({ _id: 0, fixtureId: 1, seasonCompetitionId: 1, round: 1, homeTeamId: 1, awayTeamId: 1, scheduledStart: 1, status: 1, venueName: 1 })
      .toArray();

    const otherIds = [...new Set(fixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId]).filter((t) => t && !teamName.has(t as string)))] as string[];
    const others = otherIds.length
      ? await db.collection("teams").find({ teamId: { $in: otherIds } }).project({ _id: 0, teamId: 1, name: 1 }).toArray()
      : [];
    const otherName = new Map(others.map((t) => [t.teamId as string, String(t.name ?? t.teamId)]));

    const scIds = [...new Set(fixtures.map((f) => f.seasonCompetitionId as string))];
    const scs = scIds.length
      ? await db.collection("season_competitions").find({ seasonCompetitionId: { $in: scIds } })
          .project({ _id: 0, seasonCompetitionId: 1, season: 1, displayName: 1, competitionName: 1 }).toArray()
      : [];
    const scLabel = new Map(scs.map((s) => [s.seasonCompetitionId as string,
      formatSeasonLabel({ season: s.season, displayName: s.displayName, competitionName: s.competitionName })]));

    const lineups = await db
      .collection(FIXTURE_LINEUPS_COLLECTION)
      .find({ fixtureId: { $in: fixtures.map((f) => f.fixtureId) }, teamId: { $in: ownIds } })
      .project({ _id: 0, fixtureId: 1, teamId: 1, players: 1 })
      .toArray();
    const named = new Map(lineups.map((l) => [`${l.fixtureId}|${l.teamId}`, (l.players as unknown[]).length]));

    const matches = fixtures.flatMap((f) =>
      [f.homeTeamId, f.awayTeamId]
        .filter((t) => teamName.has(t as string))
        .map((t) => {
          const home = f.homeTeamId === t;
          const opp = (home ? f.awayTeamId : f.homeTeamId) as string;
          return {
            fixtureId: f.fixtureId as string,
            seasonCompetitionId: f.seasonCompetitionId as string,
            competition: scLabel.get(f.seasonCompetitionId as string) ?? "",
            round: (f.round as number) ?? null,
            teamId: t as string,
            teamName: teamName.get(t as string)!,
            opponent: otherName.get(opp) ?? teamName.get(opp) ?? opp,
            home,
            scheduledStart: (f.scheduledStart as string | null) ?? null,
            venueName: (f.venueName as string | null) ?? null,
            status: (f.status as string) ?? "scheduled",
            named: named.get(`${f.fixtureId}|${t}`) ?? 0,
            window: lineupEditWindow({ scheduledStart: f.scheduledStart as string | null, status: f.status as string, actor: "club" }),
          };
        }),
    ).sort((a, b) => (a.scheduledStart ?? "￿").localeCompare(b.scheduledStart ?? "￿"));

    const members = await db
      .collection("members")
      .find(memberBelongsToClubFilter(clubId))
      .project({ _id: 0, memberId: 1, personalInfo: 1, name: 1, roles: 1, membership: 1 })
      .toArray();
    const players = members
      .filter((m) => Array.isArray(m.roles) && m.roles.some((r: unknown) => typeof r === "string" && /player/i.test(r)))
      .map((m) => {
        const p = (m.personalInfo ?? {}) as { firstName?: string; lastName?: string };
        return {
          memberId: m.memberId as string,
          name: `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || String(m.name ?? m.memberId),
          status: ((m.membership as { status?: string } | undefined)?.status) ?? null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ club: { id: clubId, name: club.name ?? id }, matches, players });
  } catch (e) {
    console.error("club match-rosters failed:", e);
    return NextResponse.json({ error: "Failed to load matches" }, { status: 500 });
  }
}
