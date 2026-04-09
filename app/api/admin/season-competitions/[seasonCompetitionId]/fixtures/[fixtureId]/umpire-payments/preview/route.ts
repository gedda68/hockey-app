// GET .../fixtures/[fixtureId]/umpire-payments/preview
// Preview honoraria from association schedule × fixture matchLevel × slot qualification.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAuth, requireResourceAccess } from "@/lib/auth/middleware";
import { canPreviewUmpirePayments } from "@/lib/auth/umpirePaymentAccess";
import { previewUmpirePaymentsForFixture } from "@/lib/officiating/umpireMatchPayment";
import type { FixtureUmpireSlot } from "@/types";

type Params = {
  params: Promise<{
    seasonCompetitionId: string;
    fixtureId: string;
  }>;
};

const SCHEDULE_COL = "association_umpire_payment_schedules";

export async function GET(request: NextRequest, { params }: Params) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  if (!canPreviewUmpirePayments(user)) {
    return NextResponse.json(
      { error: "Forbidden - Insufficient permissions" },
      { status: 403 },
    );
  }

  try {
    const { seasonCompetitionId, fixtureId } = await params;
    const { searchParams } = new URL(request.url);
    const defaultQualificationTier =
      searchParams.get("defaultQualificationTier")?.trim() || "community";

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

    const owningAssociationId = String(sc.owningAssociationId ?? "");
    const scope = await requireResourceAccess(
      request,
      "association",
      owningAssociationId,
    );
    if (scope.response) return scope.response;

    const fixture = await db.collection("league_fixtures").findOne({
      fixtureId,
      seasonCompetitionId,
    });
    if (!fixture) {
      return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
    }

    const scheduleDoc = await db
      .collection(SCHEDULE_COL)
      .findOne({ associationId: owningAssociationId });

    const defaultCurrency = String(scheduleDoc?.defaultCurrency ?? "AUD");
    const rates = Array.isArray(scheduleDoc?.rates) ? scheduleDoc.rates : [];

    const matchLevel =
      typeof fixture.matchLevel === "string" && fixture.matchLevel.trim()
        ? fixture.matchLevel.trim()
        : "league";

    const rawUmpires = fixture.umpires as FixtureUmpireSlot[] | null | undefined;
    const umpires =
      Array.isArray(rawUmpires) && rawUmpires.length > 0
        ? rawUmpires.map((u) => ({
            umpireId: u.umpireId,
            umpireType: u.umpireType,
            qualificationTier: u.qualificationTier ?? null,
          }))
        : [];

    const lines = previewUmpirePaymentsForFixture({
      rates,
      defaultCurrency,
      matchLevel,
      defaultQualificationTier,
      umpires,
    });

    return NextResponse.json({
      fixtureId,
      seasonCompetitionId,
      owningAssociationId,
      matchLevel,
      defaultQualificationTier,
      defaultCurrency,
      scheduleRateCount: rates.length,
      lines,
    });
  } catch (error) {
    console.error("GET umpire-payments/preview error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
