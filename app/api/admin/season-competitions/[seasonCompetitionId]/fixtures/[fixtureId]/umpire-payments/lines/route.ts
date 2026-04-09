// POST .../umpire-payments/lines — create pending ledger rows from fixture + schedule.

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import { requireAuth, requireResourceAccess } from "@/lib/auth/middleware";
import { canManageUmpirePaymentLines } from "@/lib/auth/umpirePaymentAccess";
import { PostUmpirePaymentLinesBodySchema } from "@/lib/db/schemas/umpireMatchPayment.schema";
import { previewUmpirePaymentsForFixture } from "@/lib/officiating/umpireMatchPayment";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";
import type { FixtureUmpireSlot } from "@/types";

type Params = {
  params: Promise<{
    seasonCompetitionId: string;
    fixtureId: string;
  }>;
};

const SCHEDULE_COL = "association_umpire_payment_schedules";
const LINES_COL = "umpire_match_payment_lines";

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  if (!canManageUmpirePaymentLines(user)) {
    return NextResponse.json(
      { error: "Forbidden - association.fees required" },
      { status: 403 },
    );
  }

  try {
    const { seasonCompetitionId, fixtureId } = await params;
    const body = PostUmpirePaymentLinesBodySchema.parse(await request.json());
    const defaultQualificationTier =
      body.defaultQualificationTier?.trim() || "community";

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

    if (umpires.length === 0) {
      return NextResponse.json(
        { error: "Fixture has no umpires allocated" },
        { status: 400 },
      );
    }

    const previewLines = previewUmpirePaymentsForFixture({
      rates,
      defaultCurrency,
      matchLevel,
      defaultQualificationTier,
      umpires,
    });

    const candidates = body.includeUnpriced
      ? previewLines
      : previewLines.filter((l) => !l.missingRate && l.amountCents != null);

    if (candidates.length === 0) {
      return NextResponse.json(
        {
          error:
            "No lines to record (enable includeUnpriced or fix schedule / allocations)",
          previewLines,
        },
        { status: 400 },
      );
    }

    const nowIso = new Date().toISOString();
    const created: string[] = [];
    const skipped: string[] = [];

    for (const line of candidates) {
      const umpireType = (line.umpireType ?? "official").trim() || "official";
      const existing = await db.collection(LINES_COL).findOne({
        fixtureId,
        umpireId: line.umpireId,
        umpireType,
        status: "pending",
      });
      if (existing) {
        skipped.push(line.umpireId);
        continue;
      }

      const paymentLineId = randomUUID();
      await db.collection(LINES_COL).insertOne({
        paymentLineId,
        associationId: owningAssociationId,
        seasonCompetitionId,
        fixtureId,
        umpireId: line.umpireId,
        umpireType,
        qualificationTier: line.qualificationTier,
        matchLevel: line.matchLevel,
        amountCents: line.amountCents,
        currency: line.currency,
        status: "pending" as const,
        createdAt: nowIso,
        createdBy: user.userId,
      });
      created.push(paymentLineId);
    }

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "umpire_payment",
      action: "create_lines",
      resourceType: "fixture",
      resourceId: fixtureId,
      summary: `Created ${created.length} pending umpire payment line(s)`,
      metadata: {
        seasonCompetitionId,
        skippedDuplicatePending: skipped.length,
      },
    });

    return NextResponse.json({
      created: created.length,
      skippedDuplicatePending: skipped.length,
      paymentLineIds: created,
      skippedUmpireIds: skipped,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("POST umpire-payments/lines error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
