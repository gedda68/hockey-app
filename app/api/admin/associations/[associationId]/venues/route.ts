// GET/POST — Epic V1 association venue + pitch master data.

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import {
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import {
  AssociationVenueSchema,
  CreateAssociationVenueBodySchema,
  type VenuePitch,
} from "@/lib/db/schemas/associationVenue.schema";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";

type Params = { params: Promise<{ associationId: string }> };

const VENUE_PERMS = ["competitions.manage", "competitions.fixtures"] as const;

function newVenueId() {
  return `venue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function newPitchId() {
  return `pitch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePitchesForCreate(
  rows: { pitchId?: string; label: string; surface?: string }[] | undefined,
): VenuePitch[] {
  if (!rows?.length) return [];
  return rows.map((r) => ({
    pitchId: r.pitchId?.trim() || newPitchId(),
    label: r.label.trim(),
    surface: (r.surface as VenuePitch["surface"]) ?? "turf",
  }));
}

export async function GET(request: NextRequest, { params }: Params) {
  const { response } = await requireAnyPermission(request, [...VENUE_PERMS]);
  if (response) return response;

  try {
    const { associationId } = await params;
    const scope = await requireResourceAccess(
      request,
      "association",
      associationId,
    );
    if (scope.response) return scope.response;

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const assoc = await db
      .collection("associations")
      .findOne({ associationId }, { projection: { associationId: 1 } });
    if (!assoc) {
      return NextResponse.json({ error: "Association not found" }, { status: 404 });
    }

    const status = request.nextUrl.searchParams.get("status");
    const query: Record<string, unknown> = { associationId };
    if (status === "active" || status === "inactive") {
      query.status = status;
    }

    const rows = await db
      .collection("association_venues")
      .find(query)
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json({
      venues: rows.map((v) => ({
        ...v,
        _id: v._id?.toString?.(),
      })),
    });
  } catch (error: unknown) {
    console.error("GET association venues error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response } = await requireAnyPermission(request, [...VENUE_PERMS]);
  if (response) return response;

  try {
    const { associationId } = await params;
    const scope = await requireResourceAccess(
      request,
      "association",
      associationId,
    );
    if (scope.response) return scope.response;

    const body = CreateAssociationVenueBodySchema.parse(await request.json());

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const assoc = await db
      .collection("associations")
      .findOne({ associationId }, { projection: { associationId: 1 } });
    if (!assoc) {
      return NextResponse.json({ error: "Association not found" }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const venueId = newVenueId();
    const pitches = normalizePitchesForCreate(body.pitches);

    const doc = AssociationVenueSchema.parse({
      venueId,
      associationId,
      name: body.name.trim(),
      ...(body.shortCode?.trim() ? { shortCode: body.shortCode.trim() } : {}),
      status: "active" as const,
      address: body.address,
      ...(body.geo !== undefined ? { geo: body.geo } : {}),
      pitches,
      ...(body.notes?.trim() ? { notes: body.notes.trim() } : {}),
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    await db.collection("association_venues").insertOne(doc);

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "venue",
      action: "create",
      resourceType: "association_venue",
      resourceId: venueId,
      summary: `Created venue ${doc.name} (${associationId})`,
      metadata: { associationId, pitchCount: pitches.length },
    });

    return NextResponse.json({ ...doc, _id: undefined });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("POST association venues error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
