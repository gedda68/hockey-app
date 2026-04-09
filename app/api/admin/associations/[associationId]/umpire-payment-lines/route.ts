// GET/PATCH/DELETE /api/admin/associations/[associationId]/umpire-payment-lines

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { PatchUmpirePaymentLinesBodySchema } from "@/lib/db/schemas/umpireMatchPayment.schema";
import { isAllowedUmpirePaymentTransition } from "@/lib/officiating/umpirePaymentLineStatus";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";
import type { UmpirePaymentLineStatus } from "@/lib/db/schemas/umpireMatchPayment.schema";

type Params = { params: Promise<{ associationId: string }> };

const LINES_COL = "umpire_match_payment_lines";

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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status")?.trim();
    const seasonCompetitionId = searchParams.get("seasonCompetitionId")?.trim();
    const limit = Math.min(
      200,
      Math.max(1, Number(searchParams.get("limit") ?? "80") || 80),
    );

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const q: Record<string, unknown> = { associationId };
    if (
      status === "pending" ||
      status === "approved" ||
      status === "paid"
    ) {
      q.status = status;
    }
    if (seasonCompetitionId) q.seasonCompetitionId = seasonCompetitionId;

    const lines = await db
      .collection(LINES_COL)
      .find(q)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      lines: lines.map((d) => ({
        ...d,
        _id: d._id?.toString?.(),
      })),
    });
  } catch (error) {
    console.error("GET umpire-payment-lines error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
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

    const body = PatchUmpirePaymentLinesBodySchema.parse(await request.json());

    const client = await clientPromise;
    const db = client.db("hockey-app");
    const nowIso = new Date().toISOString();

    const updated: string[] = [];
    const errors: string[] = [];

    for (const item of body.items) {
      const doc = await db.collection(LINES_COL).findOne({
        paymentLineId: item.paymentLineId,
        associationId,
      });
      if (!doc) {
        errors.push(`${item.paymentLineId}: not found`);
        continue;
      }
      const from = doc.status as UmpirePaymentLineStatus;
      const to = item.status as UmpirePaymentLineStatus;
      if (!isAllowedUmpirePaymentTransition(from, to)) {
        errors.push(`${item.paymentLineId}: invalid transition ${from}→${to}`);
        continue;
      }

      const $set: Record<string, unknown> = { status: to };
      if (to === "approved") {
        $set.approvedAt = nowIso;
        $set.approvedBy = user.userId;
      }
      if (to === "paid") {
        $set.paidAt = nowIso;
        $set.paidBy = user.userId;
      }

      await db.collection(LINES_COL).updateOne(
        { paymentLineId: item.paymentLineId, associationId },
        { $set },
      );
      updated.push(item.paymentLineId);
    }

    if (updated.length > 0) {
      await logPlatformAudit({
        userId: user.userId,
        userEmail: user.email,
        category: "umpire_payment",
        action: "patch_lines",
        resourceType: "association",
        resourceId: associationId,
        summary: `Updated ${updated.length} umpire payment line(s)`,
        metadata: { paymentLineIds: updated, errors },
      });
    }

    return NextResponse.json({ updated, errors });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("PATCH umpire-payment-lines error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
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

    const paymentLineId = new URL(request.url).searchParams
      .get("paymentLineId")
      ?.trim();
    if (!paymentLineId) {
      return NextResponse.json(
        { error: "Query paymentLineId is required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const doc = await db.collection(LINES_COL).findOne({
      paymentLineId,
      associationId,
    });
    if (!doc) {
      return NextResponse.json({ error: "Line not found" }, { status: 404 });
    }
    if (doc.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending lines can be deleted" },
        { status: 400 },
      );
    }

    await db.collection(LINES_COL).deleteOne({ paymentLineId, associationId });

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "umpire_payment",
      action: "delete_line",
      resourceType: "association",
      resourceId: associationId,
      summary: `Deleted pending umpire payment line ${paymentLineId}`,
      metadata: { paymentLineId, fixtureId: doc.fixtureId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE umpire-payment-lines error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
