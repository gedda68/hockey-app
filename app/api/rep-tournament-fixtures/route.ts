// GET — published rep tournament fixtures (public read, D4)

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

function publicFixture(
  f: Record<string, unknown>,
  requiresApproval: boolean,
) {
  const result = f.result as Record<string, unknown> | null | undefined;
  const resultStatus = f.resultStatus as string | null | undefined;
  const matchCompleted = f.status === "completed";
  const showResult =
    !!result &&
    (resultStatus === "approved" ||
      (!requiresApproval && matchCompleted));

  return {
    fixtureId: f.fixtureId,
    tournamentId: f.tournamentId,
    phase: f.phase,
    drawMatchId: f.drawMatchId ?? null,
    bracketTag: f.bracketTag ?? null,
    knockoutRoundLabel: f.knockoutRoundLabel ?? null,
    knockoutRoundIndex: f.knockoutRoundIndex ?? null,
    matchOrder: f.matchOrder ?? null,
    homeSourceLabel: f.homeSourceLabel ?? null,
    awaySourceLabel: f.awaySourceLabel ?? null,
    poolId: f.poolId,
    poolLabel: f.poolLabel,
    poolRound: f.poolRound,
    sequence: f.sequence,
    homeEntryId: f.homeEntryId ?? null,
    awayEntryId: f.awayEntryId ?? null,
    homeTeamName: f.homeTeamName,
    awayTeamName: f.awayTeamName,
    homeTeamId: f.homeTeamId,
    awayTeamId: f.awayTeamId,
    status: f.status,
    venueName: f.venueName,
    addressLine: f.addressLine,
    scheduledStart: f.scheduledStart,
    scheduledEnd: f.scheduledEnd,
    timezone: f.timezone,
    result: showResult ? result : null,
    resultStatus: showResult ? resultStatus : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const tournamentId = request.nextUrl.searchParams.get("tournamentId")?.trim();
    if (!tournamentId) {
      return NextResponse.json(
        { error: "tournamentId query parameter is required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const tournament = await db.collection("rep_tournaments").findOne({ tournamentId });
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const requiresApproval = Boolean(tournament.resultApprovalRequired);

    const fixtures = await db
      .collection("rep_tournament_fixtures")
      .find({ tournamentId, published: true })
      .sort({ sequence: 1 })
      .toArray();

    return NextResponse.json({
      tournamentId,
      title: tournament.title ?? tournamentId,
      requiresResultApproval: requiresApproval,
      championEntryId: tournament.championEntryId ?? null,
      championTeamName: tournament.championTeamName ?? null,
      fixtures: fixtures.map((x) => publicFixture(x as Record<string, unknown>, requiresApproval)),
    });
  } catch (error: unknown) {
    console.error("GET /api/rep-tournament-fixtures error:", error);
    return NextResponse.json({ error: "Failed to load fixtures" }, { status: 500 });
  }
}
