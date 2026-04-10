// GET .../fixtures/[fixtureId]/match-events-context
// Roster options + labels for the match-events admin UI (E6).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { buildRosterOptionsForTeams } from "@/lib/competitions/matchEventRoster";

type Params = {
  params: Promise<{ seasonCompetitionId: string; fixtureId: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  const { response } = await requirePermission(request, "results.manage");
  if (response) return response;

  try {
    const { seasonCompetitionId, fixtureId } = await params;
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

    const scope = await requireResourceAccess(
      request,
      "association",
      sc.owningAssociationId as string,
    );
    if (scope.response) return scope.response;

    const fixture = await db.collection("league_fixtures").findOne({
      seasonCompetitionId,
      fixtureId,
    });
    if (!fixture) {
      return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
    }

    const homeTeamId = String(fixture.homeTeamId ?? "");
    const awayTeamId = String(fixture.awayTeamId ?? "");

    const teams =
      homeTeamId && awayTeamId
        ? await db
            .collection("teams")
            .find({ teamId: { $in: [homeTeamId, awayTeamId] } })
            .project({ teamId: 1, name: 1, displayName: 1 })
            .toArray()
        : [];

    const nameByTeam = new Map<string, string>();
    for (const t of teams) {
      const id = String(t.teamId ?? "");
      const label =
        (typeof t.displayName === "string" && t.displayName) ||
        (typeof t.name === "string" && t.name) ||
        id;
      if (id) nameByTeam.set(id, label);
    }

    const { home, away } = await buildRosterOptionsForTeams(
      db,
      homeTeamId,
      awayTeamId,
    );

    return NextResponse.json({
      seasonCompetitionId,
      fixtureId,
      round: fixture.round ?? null,
      homeTeamId,
      awayTeamId,
      homeTeamName: nameByTeam.get(homeTeamId) ?? homeTeamId,
      awayTeamName: nameByTeam.get(awayTeamId) ?? awayTeamId,
      homeRoster: home,
      awayRoster: away,
      matchEvents: fixture.matchEvents ?? [],
    });
  } catch (error: unknown) {
    console.error("GET match-events-context error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
