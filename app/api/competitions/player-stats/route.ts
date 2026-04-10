// GET /api/competitions/player-stats?seasonCompetitionId=...&memberId=...&limit=25
// Public player stats for a season (E6), same visibility as standings/fixtures.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  aggregatePlayerStatsForSeason,
  memberDisplayName,
  type PlayerFixtureStatRow,
} from "@/lib/competitions/playerSeasonStats";

const PUBLIC_SC_STATUSES = new Set(["published", "in_progress", "completed"]);

export async function GET(request: NextRequest) {
  try {
    const seasonCompetitionId =
      request.nextUrl.searchParams.get("seasonCompetitionId")?.trim() ?? "";
    if (!seasonCompetitionId) {
      return NextResponse.json(
        { error: "Query parameter seasonCompetitionId is required" },
        { status: 400 },
      );
    }

    const memberIdFilter =
      request.nextUrl.searchParams.get("memberId")?.trim() || null;
    const limitRaw = request.nextUrl.searchParams.get("limit");
    const limit = Math.min(
      50,
      Math.max(1, limitRaw ? parseInt(limitRaw, 10) || 25 : 25),
    );

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const sc = await db.collection("season_competitions").findOne({
      seasonCompetitionId,
    });
    if (!sc) {
      return NextResponse.json(
        { error: "Season competition not found" },
        { status: 404 },
      );
    }

    const status = sc.status as string | undefined;
    if (!status || !PUBLIC_SC_STATUSES.has(status)) {
      return NextResponse.json({
        seasonCompetitionId,
        season: sc.season ?? null,
        leaderboard: [],
        player: null,
      });
    }

    const requiresApproval = Boolean(sc.resultApprovalRequired);

    const raw = await db
      .collection("league_fixtures")
      .find({ seasonCompetitionId, published: true })
      .project({
        fixtureId: 1,
        round: 1,
        homeTeamId: 1,
        awayTeamId: 1,
        status: 1,
        result: 1,
        resultStatus: 1,
        matchEvents: 1,
      })
      .toArray();

    const fixtures = raw.map((f) => ({
      fixtureId: String(f.fixtureId),
      round: f.round,
      homeTeamId: String(f.homeTeamId ?? ""),
      awayTeamId: String(f.awayTeamId ?? ""),
      status: f.status,
      result: f.result,
      resultStatus: f.resultStatus,
      matchEvents: f.matchEvents,
    }));

    const { totalsByMember, fixturesByMember } = aggregatePlayerStatsForSeason(
      fixtures,
      requiresApproval,
    );

    const memberIds = [...totalsByMember.keys()];
    const members =
      memberIds.length > 0
        ? await db
            .collection("members")
            .find({ memberId: { $in: memberIds } })
            .project({ memberId: 1, personalInfo: 1 })
            .toArray()
        : [];

    const displayById = new Map<string, string>();
    for (const m of members) {
      const id = String(m.memberId ?? "");
      if (id) displayById.set(id, memberDisplayName(m) || id);
    }

    const leaderboard = [...totalsByMember.values()]
      .map((t) => ({
        memberId: t.memberId,
        displayName: displayById.get(t.memberId) ?? t.memberId,
        goals: t.goals,
        assists: t.assists,
        greenCards: t.greenCards,
        yellowCards: t.yellowCards,
        redCards: t.redCards,
        matchesWithEvents: t.matchesWithEvents,
      }))
      .filter(
        (r) =>
          r.goals > 0 ||
          r.assists > 0 ||
          r.greenCards > 0 ||
          r.yellowCards > 0 ||
          r.redCards > 0,
      )
      .sort((a, b) => {
        if (b.goals !== a.goals) return b.goals - a.goals;
        if (b.assists !== a.assists) return b.assists - a.assists;
        return a.memberId.localeCompare(b.memberId);
      })
      .slice(0, limit);

    let player: {
      memberId: string;
      displayName: string;
      totals: (typeof leaderboard)[number];
      fixtures: PlayerFixtureStatRow[];
    } | null = null;

    if (memberIdFilter) {
      const t = totalsByMember.get(memberIdFilter);
      const fx = fixturesByMember.get(memberIdFilter) ?? [];
      if (t && (t.goals + t.assists + t.greenCards + t.yellowCards + t.redCards > 0)) {
        player = {
          memberId: memberIdFilter,
          displayName: displayById.get(memberIdFilter) ?? memberIdFilter,
          totals: {
            memberId: t.memberId,
            displayName: displayById.get(memberIdFilter) ?? memberIdFilter,
            goals: t.goals,
            assists: t.assists,
            greenCards: t.greenCards,
            yellowCards: t.yellowCards,
            redCards: t.redCards,
            matchesWithEvents: t.matchesWithEvents,
          },
          fixtures: fx,
        };
      }
    }

    return NextResponse.json({
      seasonCompetitionId,
      season: sc.season ?? null,
      requiresResultApproval: requiresApproval,
      leaderboard,
      player,
    });
  } catch (error: unknown) {
    console.error("GET /api/competitions/player-stats error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
