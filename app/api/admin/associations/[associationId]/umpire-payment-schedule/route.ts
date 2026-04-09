// GET/PUT /api/admin/associations/[associationId]/umpire-payment-schedule
// Tiered umpire match fees: qualification × match level (F4).

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import {
  PutUmpirePaymentScheduleBodySchema,
  type AssociationUmpirePaymentSchedule,
} from "@/lib/db/schemas/umpireMatchPayment.schema";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";

type Params = { params: Promise<{ associationId: string }> };

const COL = "association_umpire_payment_schedules";

function emptySchedule(associationId: string): AssociationUmpirePaymentSchedule {
  return {
    associationId,
    defaultCurrency: "AUD",
    rates: [],
  };
}

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

    const doc = await db.collection(COL).findOne({ associationId });
    if (!doc) {
      return NextResponse.json(emptySchedule(associationId));
    }

    const { _id, ...rest } = doc as Record<string, unknown>;
    return NextResponse.json({
      ...rest,
      _id: _id != null ? String(_id) : undefined,
    });
  } catch (error) {
    console.error("GET umpire-payment-schedule error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
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

    const body = PutUmpirePaymentScheduleBodySchema.parse(await request.json());

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const association = await db
      .collection("associations")
      .findOne({ associationId });
    if (!association) {
      return NextResponse.json({ error: "Association not found" }, { status: 404 });
    }

    const prev = await db.collection(COL).findOne({ associationId });
    const nowIso = new Date().toISOString();

    await db.collection(COL).updateOne(
      { associationId },
      {
        $set: {
          associationId,
          defaultCurrency: body.defaultCurrency,
          rates: body.rates,
          qualificationLabels: body.qualificationLabels ?? null,
          matchLevelLabels: body.matchLevelLabels ?? null,
          updatedAt: nowIso,
          updatedBy: user.userId,
        },
      },
      { upsert: true },
    );

    const next = await db.collection(COL).findOne({ associationId });

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "umpire_payment",
      action: "put_schedule",
      resourceType: "association",
      resourceId: associationId,
      summary: `Umpire payment schedule: ${body.rates.length} rate row(s)`,
      before: prev
        ? { rateCount: (prev.rates as unknown[] | undefined)?.length ?? 0 }
        : { rateCount: 0 },
      after: { rateCount: body.rates.length },
    });

    const { _id, ...rest } = (next ?? {}) as Record<string, unknown>;
    return NextResponse.json({
      ...rest,
      _id: _id != null ? String(_id) : undefined,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("PUT umpire-payment-schedule error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
