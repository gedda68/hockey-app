// GET — public competition awards for a published league or visible tournament.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getPublicLeagueById } from "@/lib/public/publicLeagues";
import { getPublicTournamentRowById } from "@/lib/public/publicTournaments";
import {
  resolvePublicTenantFromRequest,
  resolveClubAssociationId,
} from "@/lib/tenant/publicTenantRequest";
import {
  COMPETITION_AWARDS_COLLECTION,
  mergeAwardsLabels,
  DEFAULT_AWARDS_LABELS_LEAGUE,
  DEFAULT_AWARDS_LABELS,
  serializeAwardForClient,
  ensureCompetitionAwardIndexes,
} from "@/lib/competitions/competitionAwards";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const seasonCompetitionId = sp.get("seasonCompetitionId")?.trim();
    const tournamentId = sp.get("tournamentId")?.trim();

    if ((!seasonCompetitionId && !tournamentId) || (seasonCompetitionId && tournamentId)) {
      return NextResponse.json(
        { error: "Provide exactly one of seasonCompetitionId or tournamentId" },
        { status: 400 },
      );
    }

    const tenant = await resolvePublicTenantFromRequest(request);
    const client = await clientPromise;
    const db = client.db("hockey-app");
    await ensureCompetitionAwardIndexes(db);

    if (seasonCompetitionId) {
      const league = await getPublicLeagueById(seasonCompetitionId);
      if (!league) {
        return NextResponse.json({ error: "Competition not found" }, { status: 404 });
      }
      if (tenant?.kind === "association" && league.owningAssociationId !== tenant.id) {
        return NextResponse.json({ error: "Competition not found" }, { status: 404 });
      }
      if (tenant?.kind === "club") {
        const assocId = await resolveClubAssociationId(db, tenant.id);
        if (!assocId || league.owningAssociationId !== assocId) {
          return NextResponse.json({ error: "Competition not found" }, { status: 404 });
        }
      }

      const sc = await db.collection("season_competitions").findOne({ seasonCompetitionId });
      const raw = (sc as { awardsLabels?: unknown } | null)?.awardsLabels;
      const labels = mergeAwardsLabels(
        typeof raw === "object" && raw !== null ? (raw as Record<string, string>) : {},
        DEFAULT_AWARDS_LABELS_LEAGUE,
      );

      const rows = await db
        .collection(COMPETITION_AWARDS_COLLECTION)
        .find({ context: "league", seasonCompetitionId })
        .sort({ createdAt: -1 })
        .limit(500)
        .toArray();

      return NextResponse.json({
        context: "league" as const,
        seasonCompetitionId,
        competitionName: league.competitionName,
        season: league.season,
        awardsLabels: labels,
        awards: rows.map((r) => serializeAwardForClient(r as never)),
      });
    }

    const trow = await getPublicTournamentRowById(tournamentId!, { tenant });
    if (!trow) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const doc = await db.collection("rep_tournaments").findOne({ tournamentId: tournamentId! });
    const raw = (doc as { awardsLabels?: unknown } | null)?.awardsLabels;
    const labels = mergeAwardsLabels(
      typeof raw === "object" && raw !== null ? (raw as Record<string, string>) : {},
      DEFAULT_AWARDS_LABELS,
    );

    const rows = await db
      .collection(COMPETITION_AWARDS_COLLECTION)
      .find({ context: "tournament", tournamentId: tournamentId! })
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    return NextResponse.json({
      context: "tournament" as const,
      tournamentId: tournamentId!,
      title: trow.title,
      season: trow.season,
      awardsLabels: labels,
      awards: rows.map((r) => serializeAwardForClient(r as never)),
    });
  } catch (error: unknown) {
    console.error("GET /api/public/awards error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
