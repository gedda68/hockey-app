// app/api/admin/tournaments/[id]/route.ts
// GET    – single tournament
// PUT    – update tournament (re-calculates nomination period end date if not custom)
// DELETE – remove tournament

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";
import { upsertNominationPeriod } from "../route";
import { PatchRepTournamentBodySchema } from "@/lib/db/schemas/repTournament.schema";
import {
  normalizeRepTournamentHost,
  RepTournamentHostError,
} from "@/lib/tournaments/resolveRepTournamentHost";
import {
  requireRepTournamentResourceAccess,
  type RepTournamentHostDoc,
} from "@/lib/auth/repTournamentScope";
import type { TournamentHostType } from "@/types/tournaments";

function buildFilter(id: string) {
  return ObjectId.isValid(id)
    ? { _id: new ObjectId(id) }
    : { tournamentId: id };
}

// ─── GET /api/admin/tournaments/[id] ─────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = await requirePermission(request, "selection.manage");
  if (response) return response;
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db("hockey-app");

    const tournament = await db.collection("rep_tournaments").findOne(buildFilter(id));
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const scope = await requireRepTournamentResourceAccess(
      request,
      tournament as RepTournamentHostDoc,
    );
    if (scope.response) return scope.response;

    return NextResponse.json({ ...tournament, _id: tournament._id.toString() });
  } catch (error: unknown) {
    console.error("GET /api/admin/tournaments/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch tournament" }, { status: 500 });
  }
}

// ─── PUT /api/admin/tournaments/[id] ─────────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requirePermission(request, "selection.manage");
  if (response) return response;
  try {
    const { id } = await params;
    const body = PatchRepTournamentBodySchema.parse(await request.json());

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const existing = await db.collection("rep_tournaments").findOne(buildFilter(id));
    if (!existing) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const scopeExisting = await requireRepTournamentResourceAccess(
      request,
      existing as RepTournamentHostDoc,
    );
    if (scopeExisting.response) return scopeExisting.response;

    const newStart = body.startDate ?? existing.startDate;
    const newEnd = body.endDate ?? existing.endDate;
    if (newEnd < newStart) {
      return NextResponse.json(
        { error: "Tournament end date must be on or after start date" },
        { status: 400 },
      );
    }

    const isLegacy =
      !existing.hostType &&
      !String(existing.hostId ?? "").trim() &&
      !String(existing.brandingAssociationId ?? "").trim();

    if (isLegacy && (!body.hostType || !body.hostId?.trim())) {
      return NextResponse.json(
        {
          error:
            "This tournament has no host on file. Send hostType and hostId on this update to complete migration.",
        },
        { status: 400 },
      );
    }

    const hostChanging =
      isLegacy ||
      body.hostType !== undefined ||
      body.hostId !== undefined ||
      body.brandingAssociationId !== undefined;

    let hostNorm: {
      hostType: TournamentHostType;
      hostId: string;
      brandingAssociationId: string;
    } | null = null;

    if (hostChanging) {
      const ht = (body.hostType ?? existing.hostType) as TournamentHostType | undefined;
      const hid = String(body.hostId ?? existing.hostId ?? "").trim();
      if (!ht || !hid) {
        return NextResponse.json(
          {
            error:
              "hostType and hostId are required when updating host fields (or migrating a legacy tournament).",
          },
          { status: 400 },
        );
      }
      try {
        hostNorm = await normalizeRepTournamentHost(db, {
          hostType: ht,
          hostId: hid,
          brandingAssociationId:
            body.brandingAssociationId ??
            (existing.brandingAssociationId as string | undefined) ??
            undefined,
        });
      } catch (e: unknown) {
        if (e instanceof RepTournamentHostError) {
          return NextResponse.json({ error: e.message }, { status: e.status });
        }
        throw e;
      }
      const scopeNew = await requireRepTournamentResourceAccess(request, hostNorm);
      if (scopeNew.response) return scopeNew.response;
    }

    const now = new Date().toISOString();
    const updateFields: Record<string, unknown> = {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.gender !== undefined && { gender: body.gender }),
      ...(body.startDate !== undefined && { startDate: body.startDate }),
      ...(body.endDate !== undefined && { endDate: body.endDate }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.additionalInfo !== undefined && { additionalInfo: body.additionalInfo }),
      ...(body.nominationFee !== undefined && { nominationFee: body.nominationFee }),
      ...(body.season !== undefined && { season: body.season }),
      ...(body.ageGroup !== undefined && { ageGroup: body.ageGroup }),
      ...(hostNorm && {
        hostType: hostNorm.hostType,
        hostId: hostNorm.hostId,
        brandingAssociationId: hostNorm.brandingAssociationId,
      }),
      updatedAt: now,
    };

    const result = await db
      .collection("rep_tournaments")
      .findOneAndUpdate(buildFilter(id), { $set: updateFields }, { returnDocument: "after" });

    if (!result) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "tournament",
      action: "update",
      resourceType: "rep_tournament",
      resourceId: String(existing.tournamentId ?? id),
      summary: `Updated tournament "${existing.title ?? id}"`,
      before: {
        title: existing.title,
        startDate: existing.startDate,
        endDate: existing.endDate,
        hostType: existing.hostType,
        hostId: existing.hostId,
        brandingAssociationId: existing.brandingAssociationId,
      },
      after: {
        title: result?.title,
        startDate: result?.startDate,
        endDate: result?.endDate,
        hostType: result?.hostType,
        hostId: result?.hostId,
        brandingAssociationId: result?.brandingAssociationId,
      },
    });

    if (body.startDate) {
      await upsertNominationPeriod(db, {
        season: (result?.season ?? existing.season) as string,
        ageGroup: (result?.ageGroup ?? existing.ageGroup) as string,
        tournamentStartDate: body.startDate,
        tournamentId: existing.tournamentId as string,
      });
    }

    return NextResponse.json({ ...result, _id: result._id.toString() });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("PUT /api/admin/tournaments/[id] error:", error);
    return NextResponse.json({ error: "Failed to update tournament" }, { status: 500 });
  }
}

// ─── DELETE /api/admin/tournaments/[id] ──────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requirePermission(request, "selection.manage");
  if (response) return response;
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db("hockey-app");

    const existing = await db.collection("rep_tournaments").findOne(buildFilter(id));
    if (!existing) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const scopeExisting = await requireRepTournamentResourceAccess(
      request,
      existing as RepTournamentHostDoc,
    );
    if (scopeExisting.response) return scopeExisting.response;

    const result = await db.collection("rep_tournaments").deleteOne(buildFilter(id));
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "tournament",
      action: "delete",
      resourceType: "rep_tournament",
      resourceId: String(existing.tournamentId ?? id),
      summary: `Deleted tournament "${existing.title ?? id}"`,
      before: { title: existing.title, tournamentId: existing.tournamentId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("DELETE /api/admin/tournaments/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete tournament" }, { status: 500 });
  }
}
