// PATCH /api/admin/season-competitions/[seasonCompetitionId]/fixtures/[fixtureId]
// Update venue, schedule, publish state (E2).

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import {
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { PatchLeagueFixtureBodySchema } from "@/lib/db/schemas/leagueFixture.schema";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";
import { invalidateStandingsBundleCache } from "@/lib/competitions/standingsReadCache";
import {
  evaluateFixtureUmpireAssignments,
  slotHasValidCoiOverride,
} from "@/lib/officiating/umpireCoiAndAvailability";
import {
  applyUmpireAssignmentEmailNotifications,
  type UmpireSlotInput,
} from "@/lib/officiating/umpireAssignmentNotify";

type Params = {
  params: Promise<{ seasonCompetitionId: string; fixtureId: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, response } = await requireAnyPermission(request, [
    "competitions.manage",
    "competitions.fixtures",
  ]);
  if (response) return response;

  try {
    const { seasonCompetitionId, fixtureId } = await params;
    const body = PatchLeagueFixtureBodySchema.parse(await request.json());

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

    const existing = await db.collection("league_fixtures").findOne({
      fixtureId,
      seasonCompetitionId,
    });
    if (!existing) {
      return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
    }

    if (body.umpires !== undefined) {
      const proposedUmpires = body.umpires ?? [];
      const associationId = sc.owningAssociationId as string;
      const homeTeamId = existing.homeTeamId as string;
      const awayTeamId = existing.awayTeamId as string;
      const { slots } = await evaluateFixtureUmpireAssignments(db, {
        associationId,
        homeTeamId,
        awayTeamId,
        proposedUmpires,
      });
      const conflicts = slots.filter((s) => s.blockingIssues.length > 0);
      if (conflicts.length > 0) {
        const unresolved = conflicts.filter((s) => {
          const slot = proposedUmpires[s.index];
          return !slotHasValidCoiOverride(slot);
        });
        if (unresolved.length > 0) {
          return NextResponse.json(
            {
              error:
                "Umpire assignment blocked by availability or conflict-of-interest. Provide coiOverride and coiOverrideReason (min 15 characters) per blocked slot when no suitable alternative exists.",
              code: "UMPIRE_COI_OR_AVAILABILITY",
              slots,
            },
            { status: 409 },
          );
        }
      }
    }

    const nowIso = new Date().toISOString();
    const $set: Record<string, unknown> = {
      updatedAt: nowIso,
      updatedBy: user.userId,
    };

    let umpiresToPersist = body.umpires;
    if (body.umpires != null && body.notifyAssignedUmpires) {
      const umpires = body.umpires;
      const notifySlots: UmpireSlotInput[] = umpires.map((u) => ({
        umpireType: u.umpireType,
        umpireId: u.umpireId,
        isStandby: u.isStandby ?? false,
        dateNotified: u.dateNotified,
        allocationStatus: u.allocationStatus,
      }));
      const notified = await applyUmpireAssignmentEmailNotifications({
        db,
        associationId: sc.owningAssociationId as string,
        umpires: notifySlots,
        fixtureSummary: {
          fixtureId,
          seasonCompetitionId,
          scheduledStart:
            (body.scheduledStart !== undefined
              ? body.scheduledStart
              : (existing.scheduledStart as string | null)) ?? null,
          venueName:
            (body.venueName !== undefined
              ? body.venueName
              : (existing.venueName as string | null)) ?? null,
          round: existing.round as number,
        },
      });
      umpiresToPersist = umpires.map((orig, i) => ({
        ...orig,
        dateNotified: notified[i]?.dateNotified ?? orig.dateNotified,
      }));
    }

    const keys = [
      "venueId",
      "venueName",
      "addressLine",
      "scheduledStart",
      "scheduledEnd",
      "timezone",
      "status",
      "legacyMatchId",
      "matchLevel",
    ] as const;
    for (const k of keys) {
      if (body[k] !== undefined) $set[k] = body[k];
    }
    if (body.umpires !== undefined) {
      $set.umpires = umpiresToPersist;
    }

    if (body.published !== undefined) {
      $set.published = body.published;
      $set.publishedAt = body.published ? nowIso : null;
    }

    await db
      .collection("league_fixtures")
      .updateOne({ fixtureId, seasonCompetitionId }, { $set });

    const updated = await db.collection("league_fixtures").findOne({
      fixtureId,
      seasonCompetitionId,
    });

    invalidateStandingsBundleCache(seasonCompetitionId);

    const coiOverrides =
      (body.umpires ?? []).flatMap((s, i) =>
        s.coiOverride && String(s.coiOverrideReason ?? "").trim().length >= 15
          ? [
              {
                index: i,
                umpireId: s.umpireId,
                coiOverrideReason: String(s.coiOverrideReason ?? "").trim(),
              },
            ]
          : [],
      ) ?? [];

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "fixture",
      action: "patch",
      resourceType: "fixture",
      resourceId: fixtureId,
      summary: `Updated fixture (seasonCompetition=${seasonCompetitionId})`,
      before: {
        venueName: existing.venueName,
        scheduledStart: existing.scheduledStart,
        published: existing.published,
        status: existing.status,
      },
      after: {
        venueName: updated?.venueName,
        scheduledStart: updated?.scheduledStart,
        published: updated?.published,
        status: updated?.status,
      },
      metadata: {
        seasonCompetitionId,
        owningAssociationId: sc.owningAssociationId,
        ...(coiOverrides.length ? { coiOverrides } : {}),
      },
    });

    return NextResponse.json({
      ...updated,
      _id: updated?._id?.toString?.(),
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("PATCH admin fixture error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
