// POST .../official-register/import — bulk create (F1 follow-up).

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import {
  BulkOfficialRegisterImportSchema,
  type PostOfficialRegisterBody,
} from "@/lib/db/schemas/officialRegister.schema";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";

type Params = { params: Promise<{ associationId: string }> };

const COL = "association_official_register";

function toDoc(
  body: PostOfficialRegisterBody,
  associationId: string,
  userId: string,
  nowIso: string,
) {
  const officialRecordId = randomUUID();
  return {
    officialRecordId,
    associationId,
    displayName: body.displayName.trim(),
    memberId: body.memberId?.trim() || null,
    umpireNumber: body.umpireNumber?.trim() || null,
    primaryClubId: body.primaryClubId?.trim() || null,
    homeRegion: body.homeRegion?.trim() || null,
    nationalRegisterId:
      body.nationalRegisterId === undefined || body.nationalRegisterId === null
        ? null
        : String(body.nationalRegisterId).trim() || null,
    allocationAvailability: body.allocationAvailability ?? "available",
    availabilityNote: body.availabilityNote?.trim() || null,
    unavailableUntil: body.unavailableUntil?.trim() || null,
    qualificationCodes: body.qualificationCodes ?? [],
    levelLabel: body.levelLabel?.trim() || null,
    expiresAt: body.expiresAt ?? null,
    isActive: body.isActive ?? true,
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: userId,
    updatedBy: userId,
  };
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { associationId } = await params;

    const { user, response: authRes } = await requirePermission(
      request,
      "association.fees",
    );
    if (authRes) return authRes;
    const { response: scopeRes } = await requireResourceAccess(
      request,
      "association",
      associationId,
    );
    if (scopeRes) return scopeRes;

    const body = BulkOfficialRegisterImportSchema.parse(await request.json());

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const association = await db
      .collection("associations")
      .findOne({ associationId });
    if (!association) {
      return NextResponse.json({ error: "Association not found" }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const created: string[] = [];
    const errors: { index: number; message: string }[] = [];

    for (let i = 0; i < body.records.length; i++) {
      const row = body.records[i];
      try {
        const doc = toDoc(row, associationId, user.userId, nowIso);
        await db.collection(COL).insertOne(doc);
        created.push(doc.officialRecordId);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Insert failed";
        errors.push({ index: i, message });
      }
    }

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "umpire_payment",
      action: "official_register_bulk_import",
      resourceType: "association",
      resourceId: associationId,
      summary: `Official register bulk import: ${created.length} created, ${errors.length} failed`,
      metadata: { createdCount: created.length, errorCount: errors.length },
    });

    return NextResponse.json({
      ok: true,
      created: created.length,
      officialRecordIds: created,
      errors,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("POST official-register/import error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
