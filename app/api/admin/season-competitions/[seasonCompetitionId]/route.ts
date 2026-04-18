// app/api/admin/season-competitions/[seasonCompetitionId]/route.ts
// Manage a SeasonCompetition lifecycle + configuration (divisions/eligibility source-of-truth).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requireAnyPermission,
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import {
  ClubNominatedVenueSchema,
  FinalsSeriesConfigSchema,
  SeasonBlockoutPeriodSchema,
  SeasonCompetitionSchema,
} from "@/lib/db/schemas/competition.schema";
import { AwardsLabelsSchema } from "@/lib/db/schemas/competitionAwards.schema";
import { z, ZodError } from "zod";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";
import { invalidateStandingsBundleCache } from "@/lib/competitions/standingsReadCache";

type Params = { params: Promise<{ seasonCompetitionId: string }> };

const UpdateSeasonCompetitionSchema = z.object({
  divisions: SeasonCompetitionSchema.shape.divisions.optional(),
  status: SeasonCompetitionSchema.shape.status.optional(),
  resultApprovalRequired:
    SeasonCompetitionSchema.shape.resultApprovalRequired.optional(),
  ladderRules: SeasonCompetitionSchema.shape.ladderRules.optional(),
  logoUrl: z.union([z.string().max(2048), z.null()]).optional(),
  displayName: z.union([z.string().max(160), z.null()]).optional(),
  homeAndAway: z.boolean().optional(),
  blockoutPeriods: z.array(SeasonBlockoutPeriodSchema).max(40).optional(),
  specialMatchPeriods: z.array(SeasonBlockoutPeriodSchema).max(20).optional(),
  finalsSeries: FinalsSeriesConfigSchema.optional(),
  clubNominatedVenues: z.array(ClubNominatedVenueSchema).max(120).optional(),
  /** Custom display names for standard competition awards (public + admin). */
  awardsLabels: AwardsLabelsSchema.nullable().optional(),
});

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["published", "archived"],
  published: ["in_progress", "archived"],
  in_progress: ["completed", "archived"],
  completed: ["archived"],
  archived: [],
};

export async function GET(request: NextRequest, { params }: Params) {
  const { response } = await requireAnyPermission(request, [
    "competitions.manage",
    "competitions.fixtures",
  ]);
  if (response) return response;

  try {
    const { seasonCompetitionId } = await params;
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

    const scopeCheck = await requireResourceAccess(
      request,
      "association",
      sc.owningAssociationId,
    );
    if (scopeCheck.response) return scopeCheck.response;

    return NextResponse.json({ ...sc, _id: sc._id?.toString?.() });
  } catch (error: unknown) {
    console.error("GET /api/admin/season-competitions/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, response } = await requirePermission(
    request,
    "competitions.manage",
  );
  if (response) return response;

  try {
    const { seasonCompetitionId } = await params;
    const body = await request.json();
    const validated = UpdateSeasonCompetitionSchema.parse(body);

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const existing = await db.collection("season_competitions").findOne({
      seasonCompetitionId,
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Season competition not found" },
        { status: 404 },
      );
    }

    const scopeCheck = await requireResourceAccess(
      request,
      "association",
      existing.owningAssociationId,
    );
    if (scopeCheck.response) return scopeCheck.response;

    const update: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: user.userId,
    };

    if (validated.divisions !== undefined) update.divisions = validated.divisions;
    if (validated.resultApprovalRequired !== undefined)
      update.resultApprovalRequired = validated.resultApprovalRequired;
    if (validated.ladderRules !== undefined) update.ladderRules = validated.ladderRules;
    if (validated.logoUrl !== undefined) {
      update.logoUrl =
        validated.logoUrl === null || validated.logoUrl === ""
          ? null
          : validated.logoUrl.trim();
    }
    if (validated.displayName !== undefined) {
      update.displayName =
        validated.displayName === null || validated.displayName === ""
          ? null
          : validated.displayName.trim();
    }
    if (validated.homeAndAway !== undefined) update.homeAndAway = validated.homeAndAway;
    if (validated.blockoutPeriods !== undefined)
      update.blockoutPeriods = validated.blockoutPeriods;
    if (validated.specialMatchPeriods !== undefined)
      update.specialMatchPeriods = validated.specialMatchPeriods;
    if (validated.finalsSeries !== undefined) update.finalsSeries = validated.finalsSeries;
    if (validated.clubNominatedVenues !== undefined)
      update.clubNominatedVenues = validated.clubNominatedVenues;

    if (validated.awardsLabels !== undefined) {
      if (validated.awardsLabels === null) {
        update.awardsLabels = null;
      } else {
        const prev =
          (existing as { awardsLabels?: Record<string, string> }).awardsLabels ?? {};
        update.awardsLabels = { ...prev, ...validated.awardsLabels };
      }
    }

    if (validated.status !== undefined) {
      const from = existing.status ?? "draft";
      const to = validated.status;
      const allowed = VALID_TRANSITIONS[from] ?? [];
      if (from !== to && !allowed.includes(to)) {
        return NextResponse.json(
          { error: `Cannot transition seasonCompetition from "${from}" to "${to}"` },
          { status: 409 },
        );
      }
      update.status = to;
    }

    await db.collection("season_competitions").updateOne(
      { seasonCompetitionId },
      { $set: update },
    );

    const updated = await db.collection("season_competitions").findOne({
      seasonCompetitionId,
    });

    invalidateStandingsBundleCache(seasonCompetitionId);

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "season_competition",
      action: "patch",
      resourceType: "season_competition",
      resourceId: seasonCompetitionId,
      summary: `Updated season competition (${Object.keys(validated).join(", ")})`,
      before: {
        status: existing.status,
        divisions: existing.divisions,
        resultApprovalRequired: existing.resultApprovalRequired,
        ladderRules: existing.ladderRules,
        logoUrl: (existing as { logoUrl?: unknown }).logoUrl,
        displayName: (existing as { displayName?: unknown }).displayName,
        homeAndAway: (existing as { homeAndAway?: unknown }).homeAndAway,
        blockoutPeriods: (existing as { blockoutPeriods?: unknown }).blockoutPeriods,
        specialMatchPeriods: (existing as { specialMatchPeriods?: unknown }).specialMatchPeriods,
        finalsSeries: (existing as { finalsSeries?: unknown }).finalsSeries,
        clubNominatedVenues: (existing as { clubNominatedVenues?: unknown })
          .clubNominatedVenues,
      },
      after: {
        status: updated?.status,
        divisions: updated?.divisions,
        resultApprovalRequired: updated?.resultApprovalRequired,
        ladderRules: updated?.ladderRules,
        logoUrl: (updated as { logoUrl?: unknown } | null)?.logoUrl,
        displayName: (updated as { displayName?: unknown } | null)?.displayName,
        homeAndAway: (updated as { homeAndAway?: unknown } | null)?.homeAndAway,
        blockoutPeriods: (updated as { blockoutPeriods?: unknown } | null)?.blockoutPeriods,
        specialMatchPeriods: (updated as { specialMatchPeriods?: unknown } | null)
          ?.specialMatchPeriods,
        finalsSeries: (updated as { finalsSeries?: unknown } | null)?.finalsSeries,
        clubNominatedVenues: (updated as { clubNominatedVenues?: unknown } | null)
          ?.clubNominatedVenues,
      },
      metadata: { owningAssociationId: existing.owningAssociationId },
    });

    return NextResponse.json({ ...updated, _id: updated?._id?.toString?.() });
  } catch (error: unknown) {
    console.error("PATCH /api/admin/season-competitions/[id] error:", error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

