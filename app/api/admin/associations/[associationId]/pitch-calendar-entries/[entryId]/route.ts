// PATCH/DELETE — Epic V3 pitch calendar entries (full body replace on PATCH).

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

type Params = { params: Promise<{ associationId: string; entryId: string }> };

const PERMS = ["competitions.manage", "competitions.fixtures"] as const;

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, response } = await requireAnyPermission(request, [...PERMS]);
  if (response) return response;

  try {
    const { associationId, entryId } = await params;
    const scope = await requireResourceAccess(request, "association", associationId);
    if (scope.response) return scope.response;

    const body = CreatePitchCalendarEntryBodySchema.parse(await request.json());

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const existing = await db.collection("pitch_calendar_entries").findOne({
      entryId,
      associationId,
    });
    if (!existing) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

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
    const baseDoc: Record<string, unknown> = {
      entryId,
      associationId,
      venueId: body.venueId,
      pitchId: body.pitchId,
      scheduledStart: body.scheduledStart,
      scheduledEnd: body.scheduledEnd ?? null,
      displayKind: body.displayKind,
      createdAt: String(existing.createdAt ?? nowIso),
      updatedAt: nowIso,
      createdBy: existing.createdBy as string | undefined,
      updatedBy: user.userId,
    };
    if (body.displayKind === "training") {
      baseDoc.trainingOrganizer = body.trainingOrganizer;
      if (body.trainingOrganizer === "club" && body.trainingClubId) {
        baseDoc.trainingClubId = body.trainingClubId;
      }
    }
    const doc = PitchCalendarEntryDocSchema.parse(baseDoc);

    await db.collection("pitch_calendar_entries").replaceOne({ entryId, associationId }, doc);

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "venue",
      action: "pitch_calendar_patch",
      resourceType: "pitch_calendar_entry",
      resourceId: entryId,
      summary: `Updated pitch calendar entry`,
      before: {
        displayKind: existing.displayKind,
        scheduledStart: existing.scheduledStart,
      },
      after: { displayKind: doc.displayKind, scheduledStart: doc.scheduledStart },
      metadata: { associationId },
    });

    return NextResponse.json({ ...doc, _id: undefined });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("PATCH pitch-calendar-entry error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { user, response } = await requireAnyPermission(request, [...PERMS]);
  if (response) return response;

  try {
    const { associationId, entryId } = await params;
    const scope = await requireResourceAccess(request, "association", associationId);
    if (scope.response) return scope.response;

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const res = await db.collection("pitch_calendar_entries").deleteOne({
      entryId,
      associationId,
    });
    if (res.deletedCount === 0) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "venue",
      action: "pitch_calendar_delete",
      resourceType: "pitch_calendar_entry",
      resourceId: entryId,
      summary: `Deleted pitch calendar entry`,
      metadata: { associationId },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("DELETE pitch-calendar-entry error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
