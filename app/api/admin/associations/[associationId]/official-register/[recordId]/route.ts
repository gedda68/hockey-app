// PATCH/DELETE .../official-register/[recordId]

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { PatchOfficialRegisterBodySchema } from "@/lib/db/schemas/officialRegister.schema";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";

type Params = {
  params: Promise<{ associationId: string; recordId: string }>;
};

const COL = "association_official_register";

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { associationId, recordId } = await params;

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

    const body = PatchOfficialRegisterBodySchema.parse(await request.json());

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const existing = await db.collection(COL).findOne({
      associationId,
      officialRecordId: recordId,
    });
    if (!existing) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const $set: Record<string, unknown> = { updatedAt: nowIso, updatedBy: user.userId };

    if (body.displayName !== undefined) $set.displayName = body.displayName.trim();
    if (body.memberId !== undefined)
      $set.memberId = body.memberId?.trim() || null;
    if (body.umpireNumber !== undefined)
      $set.umpireNumber = body.umpireNumber?.trim() || null;
    if (body.qualificationCodes !== undefined)
      $set.qualificationCodes = body.qualificationCodes;
    if (body.levelLabel !== undefined)
      $set.levelLabel = body.levelLabel?.trim() || null;
    if (body.expiresAt !== undefined) $set.expiresAt = body.expiresAt;
    if (body.isActive !== undefined) $set.isActive = body.isActive;

    const nextMember = $set.memberId ?? existing.memberId;
    const nextUmp = $set.umpireNumber ?? existing.umpireNumber;
    if (!String(nextMember ?? "").trim() && !String(nextUmp ?? "").trim()) {
      return NextResponse.json(
        { error: "memberId and/or umpireNumber required" },
        { status: 400 },
      );
    }

    await db.collection(COL).updateOne(
      { associationId, officialRecordId: recordId },
      { $set },
    );

    const next = await db.collection(COL).findOne({
      associationId,
      officialRecordId: recordId,
    });

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "umpire_payment",
      action: "official_register_patch",
      resourceType: "association",
      resourceId: associationId,
      summary: `Official register updated (${recordId})`,
    });

    return NextResponse.json({
      ...next,
      _id: next?._id?.toString?.(),
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("PATCH official-register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { associationId, recordId } = await params;

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

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const res = await db.collection(COL).deleteOne({
      associationId,
      officialRecordId: recordId,
    });
    if (res.deletedCount === 0) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "umpire_payment",
      action: "official_register_delete",
      resourceType: "association",
      resourceId: associationId,
      summary: `Official register deleted (${recordId})`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE official-register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
