// GET/POST /api/admin/associations/[associationId]/official-register (F1 baseline).

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { PostOfficialRegisterBodySchema } from "@/lib/db/schemas/officialRegister.schema";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";

type Params = { params: Promise<{ associationId: string }> };

const COL = "association_official_register";

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { associationId } = await params;

    const { response: authRes } = await requirePermission(
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

    const association = await db
      .collection("associations")
      .findOne({ associationId });
    if (!association) {
      return NextResponse.json({ error: "Association not found" }, { status: 404 });
    }

    const rows = await db
      .collection(COL)
      .find({ associationId })
      .sort({ displayName: 1 })
      .toArray();

    return NextResponse.json({
      officials: rows.map((d) => ({
        ...d,
        _id: d._id?.toString?.(),
      })),
    });
  } catch (error) {
    console.error("GET official-register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
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

    const body = PostOfficialRegisterBodySchema.parse(await request.json());

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const association = await db
      .collection("associations")
      .findOne({ associationId });
    if (!association) {
      return NextResponse.json({ error: "Association not found" }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const officialRecordId = randomUUID();

    const doc = {
      officialRecordId,
      associationId,
      displayName: body.displayName.trim(),
      memberId: body.memberId?.trim() || null,
      umpireNumber: body.umpireNumber?.trim() || null,
      primaryClubId: body.primaryClubId?.trim() || null,
      allocationAvailability: body.allocationAvailability ?? "available",
      availabilityNote: body.availabilityNote?.trim() || null,
      unavailableUntil: body.unavailableUntil?.trim() || null,
      qualificationCodes: body.qualificationCodes ?? [],
      levelLabel: body.levelLabel?.trim() || null,
      expiresAt: body.expiresAt ?? null,
      isActive: body.isActive ?? true,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: user.userId,
      updatedBy: user.userId,
    };

    await db.collection(COL).insertOne(doc);

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "umpire_payment",
      action: "official_register_create",
      resourceType: "association",
      resourceId: associationId,
      summary: `Official register: ${doc.displayName}`,
      metadata: { officialRecordId },
    });

    return NextResponse.json(doc);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("POST official-register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
