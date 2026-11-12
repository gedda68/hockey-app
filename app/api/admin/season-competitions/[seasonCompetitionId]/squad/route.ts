// GET /api/admin/season-competitions/[seasonCompetitionId]/squad[?teamId=]
// Without teamId: the teams playing in this competition.
// With teamId: that team's matches in this competition and every eligible
// player (active player-members of the team's club, plus anyone already named
// in one of its match-day lineups here).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAnyPermission, requireResourceAccess } from "@/lib/auth/middleware";
import { FIXTURE_LINEUPS_COLLECTION } from "@/lib/db/schemas/fixtureLineup.schema";
import { memberBelongsToClubFilter } from "@/lib/rosters/memberClubQuery";

type Params = { params: Promise<{ seasonCompetitionId: string }> };

function memberName(m: Record<string, unknown>): string {
  const p = (m.personalInfo ?? {}) as { firstName?: string; lastName?: string };
  const n = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
  return n || String(m.name ?? m.memberId ?? "");
}

const isPlayerRole = (m: Record<string, unknown>) =>
  Array.isArray(m.roles) && m.roles.some((r) => typeof r === "string" && /player/i.test(r));

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { seasonCompetitionId } = await params;
    const { response } = await requireAnyPermission(request, [
      "competitions.manage", "competitions.fixtures", "results.manage",
    ]);
    if (response) return response;

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");
    const sc = await db.collection("season_competitions").findOne({ seasonCompetitionId });
    if (!sc) return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    const scope = await requireResourceAccess(request, "association", sc.owningAssociationId as string);
    if (scope.response) return scope.response;

    const fixtures = await db
      .collection("league_fixtures")
      .find({ seasonCompetitionId })
      .project({ _id: 0, fixtureId: 1, round: 1, homeTeamId: 1, awayTeamId: 1, scheduledStart: 1, status: 1 })
      .toArray();

    const teamIds = [...new Set(fixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId]).filter(Boolean))] as string[];
    const teamDocs = teamIds.length
      ? await db.collection("teams").find({ teamId: { $in: teamIds } }).project({ _id: 0, teamId: 1, name: 1, clubId: 1 }).toArray()
      : [];
    const teamById = new Map(teamDocs.map((t) => [t.teamId as string, t]));
    const nameOf = (id: string) => String(teamById.get(id)?.name ?? id);

    const teamId = request.nextUrl.searchParams.get("teamId");
    if (!teamId) {
      const teams = teamIds
        .map((id) => ({ teamId: id, name: nameOf(id), clubId: (teamById.get(id)?.clubId as string) ?? null }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return NextResponse.json({ teams });
    }

    const team = teamById.get(teamId);
    if (!team) return NextResponse.json({ error: "Team is not in this competition" }, { status: 404 });

    const matches = fixtures
      .filter((f) => f.homeTeamId === teamId || f.awayTeamId === teamId)
      .map((f) => ({
        fixtureId: f.fixtureId as string,
        round: (f.round as string | undefined) ?? null,
        scheduledStart: (f.scheduledStart as string | null) ?? null,
        status: (f.status as string) ?? "scheduled",
        home: f.homeTeamId === teamId,
        opponent: nameOf((f.homeTeamId === teamId ? f.awayTeamId : f.homeTeamId) as string),
      }))
      .sort((a, b) => (a.scheduledStart ?? "￿").localeCompare(b.scheduledStart ?? "￿"));

    const lineups = await db
      .collection(FIXTURE_LINEUPS_COLLECTION)
      .find({ seasonCompetitionId, teamId })
      .project({ _id: 0, fixtureId: 1, players: 1 })
      .toArray();
    const appearances = new Map<string, number>();
    const namedIds = new Set<string>();
    for (const l of lineups) {
      for (const p of (l.players as { memberId: string; didNotPlay?: boolean }[]) ?? []) {
        namedIds.add(p.memberId);
        if (!p.didNotPlay) appearances.set(p.memberId, (appearances.get(p.memberId) ?? 0) + 1);
      }
    }

    const clubId = team.clubId as string | undefined;
    const members = await db
      .collection("members")
      .find({
        $or: [
          ...(clubId ? [memberBelongsToClubFilter(clubId)] : []),
          ...(namedIds.size ? [{ memberId: { $in: [...namedIds] } }] : []),
        ],
      })
      .project({ _id: 0, memberId: 1, personalInfo: 1, name: 1, roles: 1, membership: 1 })
      .toArray();

    const players = members
      .filter((m) => isPlayerRole(m) || namedIds.has(m.memberId as string))
      .map((m) => ({
        memberId: m.memberId as string,
        name: memberName(m),
        appearances: appearances.get(m.memberId as string) ?? 0,
        status: ((m.membership as { status?: string } | undefined)?.status) ?? null,
      }))
      .sort((a, b) => b.appearances - a.appearances || a.name.localeCompare(b.name));

    return NextResponse.json({
      team: { teamId, name: nameOf(teamId), clubId: clubId ?? null },
      matches,
      players,
    });
  } catch (e) {
    console.error("squad GET failed:", e);
    return NextResponse.json({ error: "Failed to load squad" }, { status: 500 });
  }
}
