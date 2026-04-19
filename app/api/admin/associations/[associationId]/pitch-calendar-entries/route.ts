// GET/POST — Epic V3 admin: training / private pitch blocks (public calendar never exposes hire details).

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import {
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import {
  CreatePitchCalendarEntryBodySchema,
  PitchCalendarEntryDocSchema,
} from "@/lib/db/schemas/pitchCalendarEntry.schema";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";
import {
  assertVenuePitchForAssociation,
  clubBelongsToAssociation,
} from "@/lib/admin/assertVenuePitchForAssociation";

type Params = { params: Promise<{ associationId: string }> };

const PERMS = ["competitions.manage", "competitions.fixtures"] as const;

function newEntryId() {
  return `pcal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function GET(request: NextRequest, { params }: Params) {
  const { response } = await requireAnyPermission(request, [...PERMS]);
  if (response) return response;

  try {
    const { associationId } = await params;
    const scope = await requireResourceAccess(request, "association", associationId);
    if (scope.response) return scope.response;

    const from = request.nextUrl.searchParams.get("from")?.trim();
    const to = request.nextUrl.searchParams.get("to")?.trim();
    if (!from || !to) {
      return NextResponse.json(
        { error: "Query parameters from and to (ISO datetimes) are required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const rows = await db
      .collection("pitch_calendar_entries")
      .find({
        associationId,
        scheduledStart: { $gte: from, $lte: to },
      })
      .sort({ scheduledStart: 1, entryId: 1 })
      .toArray();

    return NextResponse.json({
      entries: rows.map((r) => ({ ...r, _id: r._id?.toString?.() })),
    });
  } catch (error: unknown) {
    console.error("GET pitch-calendar-entries error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response } = await requireAnyPermission(request, [...PERMS]);
  if (response) return response;

  try {
    const { associationId } = await params;
    const scope = await requireResourceAccess(request, "association", associationId);
    if (scope.response) return scope.response;

    const body = CreatePitchCalendarEntryBodySchema.parse(await request.json());

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const okPitch = await assertVenuePitchForAssociation(
      db,
      associationId,
      body.venueId,
      body.pitchId,
    );
    if (!okPitch) {
      return NextResponse.json(
        { error: "venueId and pitchId must refer to an active venue pitch in this association" },
        { status: 400 },
      );
    }

    if (body.displayKind === "training" && body.trainingOrganizer === "club" && body.trainingClubId) {
      const okClub = await clubBelongsToAssociation(db, body.trainingClubId, associationId);
      if (!okClub) {
        return NextResponse.json(
          { error: "trainingClubId is not a club under this association" },
          { status: 400 },
        );
      }
    }

    const nowIso = new Date().toISOString();
    const entryId = newEntryId();
    const baseDoc: Record<string, unknown> = {
      entryId,
      associationId,
      venueId: body.venueId,
      pitchId: body.pitchId,
      scheduledStart: body.scheduledStart,
      scheduledEnd: body.scheduledEnd ?? null,
      displayKind: body.displayKind,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: user.userId,
      updatedBy: user.userId,
    };
    if (body.displayKind === "training") {
      baseDoc.trainingOrganizer = body.trainingOrganizer;
      if (body.trainingOrganizer === "club" && body.trainingClubId) {
        baseDoc.trainingClubId = body.trainingClubId;
      }
    }
    const doc = PitchCalendarEntryDocSchema.parse(baseDoc);

    await db.collection("pitch_calendar_entries").insertOne(doc);

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "venue",
      action: "pitch_calendar_create",
      resourceType: "pitch_calendar_entry",
      resourceId: entryId,
      summary: `Pitch calendar entry (${body.displayKind})`,
      metadata: { associationId, venueId: body.venueId, pitchId: body.pitchId },
    });

    return NextResponse.json({ ...doc, _id: undefined });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("POST pitch-calendar-entries error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
