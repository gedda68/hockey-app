// GET/PATCH/DELETE — single association venue (Epic V1).

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import {
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { z } from "zod";
import {
  PatchAssociationVenueBodySchema,
  VenuePitchSchema,
} from "@/lib/db/schemas/associationVenue.schema";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";

type Params = { params: Promise<{ associationId: string; venueId: string }> };

const VENUE_PERMS = ["competitions.manage", "competitions.fixtures"] as const;

export async function GET(request: NextRequest, { params }: Params) {
  const { response } = await requireAnyPermission(request, [...VENUE_PERMS]);
  if (response) return response;

  try {
    const { associationId, venueId } = await params;
    const scope = await requireResourceAccess(
      request,
      "association",
      associationId,
    );
    if (scope.response) return scope.response;

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const v = await db.collection("association_venues").findOne({
      associationId,
      venueId,
    });
    if (!v) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...v,
      _id: v._id?.toString?.(),
    });
  } catch (error: unknown) {
    console.error("GET association venue error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, response } = await requireAnyPermission(request, [...VENUE_PERMS]);
  if (response) return response;

  try {
    const { associationId, venueId } = await params;
    const scope = await requireResourceAccess(
      request,
      "association",
      associationId,
    );
    if (scope.response) return scope.response;

    const body = PatchAssociationVenueBodySchema.parse(await request.json());

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const existing = await db.collection("association_venues").findOne({
      associationId,
      venueId,
    });
    if (!existing) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const $set: Record<string, unknown> = {
      updatedAt: nowIso,
      updatedBy: user.userId,
    };
    const $unset: Record<string, ""> = {};

    if (body.name !== undefined) $set.name = body.name;
    if (body.status !== undefined) $set.status = body.status;
    if (body.address !== undefined) $set.address = body.address;
    if (body.shortCode !== undefined) {
      if (body.shortCode === null) $unset.shortCode = "";
      else $set.shortCode = body.shortCode;
    }
    if (body.geo !== undefined) {
      if (body.geo === null) $unset.geo = "";
      else $set.geo = body.geo;
    }
    if (body.notes !== undefined) {
      if (body.notes === null) $unset.notes = "";
      else $set.notes = body.notes;
    }
    if (body.pitches !== undefined) {
      $set.pitches = z.array(VenuePitchSchema).parse(body.pitches);
    }

    const updateOp: Record<string, unknown> = { $set };
    if (Object.keys($unset).length) updateOp.$unset = $unset;

    await db.collection("association_venues").updateOne(
      { associationId, venueId },
      updateOp as never,
    );

    const updated = await db.collection("association_venues").findOne({
      associationId,
      venueId,
    });

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "venue",
      action: "patch",
      resourceType: "association_venue",
      resourceId: venueId,
      summary: `Updated venue ${String(updated?.name ?? venueId)}`,
      before: {
        name: existing.name,
        status: existing.status,
        pitchCount: Array.isArray(existing.pitches) ? existing.pitches.length : 0,
      },
      after: {
        name: updated?.name,
        status: updated?.status,
        pitchCount: Array.isArray(updated?.pitches) ? updated.pitches.length : 0,
      },
      metadata: { associationId },
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
    console.error("PATCH association venue error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { user, response } = await requireAnyPermission(request, [...VENUE_PERMS]);
  if (response) return response;

  try {
    const { associationId, venueId } = await params;
    const scope = await requireResourceAccess(
      request,
      "association",
      associationId,
    );
    if (scope.response) return scope.response;

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const existing = await db.collection("association_venues").findOne({
      associationId,
      venueId,
    });
    if (!existing) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    const fxCount = await db.collection("league_fixtures").countDocuments({
      owningAssociationId: associationId,
      venueId,
    });
    if (fxCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete venue: ${fxCount} league fixture(s) reference this venueId. Reassign or clear fixtures first.`,
          code: "VENUE_IN_USE",
        },
        { status: 409 },
      );
    }

    await db.collection("association_venues").deleteOne({ associationId, venueId });

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "venue",
      action: "delete",
      resourceType: "association_venue",
      resourceId: venueId,
      summary: `Deleted venue ${String(existing.name ?? venueId)}`,
      metadata: { associationId },
    });

    return NextResponse.json({ ok: true, venueId });
  } catch (error: unknown) {
    console.error("DELETE association venue error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
