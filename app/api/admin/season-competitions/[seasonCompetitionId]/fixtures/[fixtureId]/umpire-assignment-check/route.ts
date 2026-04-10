// POST .../fixtures/[fixtureId]/umpire-assignment-check — F2 preview (no persistence).

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { z } from "zod";
import clientPromise from "@/lib/mongodb";
import {
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { FixtureUmpireSlotSchema } from "@/lib/db/schemas/leagueFixture.schema";
import { evaluateFixtureUmpireAssignments } from "@/lib/officiating/umpireCoiAndAvailability";

type Params = {
  params: Promise<{ seasonCompetitionId: string; fixtureId: string }>;
};

const BodySchema = z.object({
  umpires: z.array(FixtureUmpireSlotSchema),
});

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response } = await requireAnyPermission(request, [
    "competitions.manage",
    "competitions.fixtures",
  ]);
  if (response) return response;

  try {
    const { seasonCompetitionId, fixtureId } = await params;
    const body = BodySchema.parse(await request.json());

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
      fixtureId,
      seasonCompetitionId,
    });
    if (!fixture) {
      return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
    }

    const { slots } = await evaluateFixtureUmpireAssignments(db, {
      associationId: sc.owningAssociationId as string,
      homeTeamId: fixture.homeTeamId as string,
      awayTeamId: fixture.awayTeamId as string,
      proposedUmpires: body.umpires,
    });

    return NextResponse.json({
      ok: true,
      requestedBy: user.userId,
      slots,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("POST umpire-assignment-check error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
