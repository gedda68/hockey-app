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
import { resolveUmpireDisplayMap } from "@/lib/officiating/resolveUmpireDisplay";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";
import type { UmpirePaymentLineStatus } from "@/lib/db/schemas/umpireMatchPayment.schema";
import { toCsvRow } from "@/lib/utils/csvEscape";
import { recordExpenseLedgerForPaidUmpireLine } from "@/lib/finance/expenseLedgerFromUmpireLine";

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
    const format = searchParams.get("format")?.trim().toLowerCase();
    const jsonLimit = Math.min(
      200,
      Math.max(1, Number(searchParams.get("limit") ?? "80") || 80),
    );
    const csvLimit = Math.min(
      5000,
      Math.max(1, Number(searchParams.get("limit") ?? "2000") || 2000),
    );
    const limit = format === "csv" ? csvLimit : jsonLimit;

    const client = await clientPromise;
    const db = client.db();

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

    const umpireIds = lines.map((d) => String(d.umpireId ?? ""));
    const displayMap = await resolveUmpireDisplayMap(db, associationId, umpireIds);

    if (format === "csv") {
      const header = [
        "paymentLineId",
        "fixtureId",
        "seasonCompetitionId",
        "umpireId",
        "displayName",
        "umpireType",
        "qualificationTier",
        "matchLevel",
        "amountCents",
        "currency",
        "status",
        "createdAt",
        "approvedAt",
        "paidAt",
      ];
      let csv = "\uFEFF" + toCsvRow(header);
      for (const d of lines) {
        const uid = String(d.umpireId ?? "");
        const disp = displayMap.get(uid)?.displayName ?? "";
        csv += toCsvRow([
          String(d.paymentLineId ?? ""),
          String(d.fixtureId ?? ""),
          String(d.seasonCompetitionId ?? ""),
          uid,
          disp,
          String(d.umpireType ?? ""),
          String(d.qualificationTier ?? ""),
          String(d.matchLevel ?? ""),
          d.amountCents == null ? "" : String(d.amountCents),
          String(d.currency ?? ""),
          String(d.status ?? ""),
          String(d.createdAt ?? ""),
          String(d.approvedAt ?? ""),
          String(d.paidAt ?? ""),
        ]);
      }
      const safeName = associationId.replace(/[^\w.-]+/g, "_");
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="umpire-honoraria-${safeName}.csv"`,
        },
      });
    }

    const enriched = lines.map((d) => {
      const uid = String(d.umpireId ?? "");
      const hit = displayMap.get(uid);
      return {
        ...d,
        displayName: hit?.displayName,
        displaySource: hit?.source,
        linkedMemberId: hit?.memberId,
        _id: d._id?.toString?.(),
      };
    });

    return NextResponse.json({ lines: enriched });
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
    const db = client.db();
    const nowIso = new Date().toISOString();

    const updatedStatus: string[] = [];
    const updatedAmount: string[] = [];
    const errors: string[] = [];

    for (const item of body.items) {
      let doc = await db.collection(LINES_COL).findOne({
        paymentLineId: item.paymentLineId,
        associationId,
      });
      if (!doc) {
        errors.push(`${item.paymentLineId}: not found`);
        continue;
      }

      if (item.amountCents !== undefined) {
        if (doc.status !== "pending") {
          errors.push(`${item.paymentLineId}: amount edit only when pending`);
        } else {
          const before = doc.amountCents;
          await db.collection(LINES_COL).updateOne(
            { paymentLineId: item.paymentLineId, associationId },
            { $set: { amountCents: item.amountCents } },
          );
          updatedAmount.push(item.paymentLineId);
          await logPlatformAudit({
            userId: user.userId,
            userEmail: user.email,
            category: "umpire_payment",
            action: "adjust_line_amount",
            resourceType: "association",
            resourceId: associationId,
            summary: `Adjusted pending umpire line amount (${item.paymentLineId})`,
            before: { amountCents: before },
            after: { amountCents: item.amountCents },
            metadata: {
              paymentLineId: item.paymentLineId,
              fixtureId: doc.fixtureId,
            },
          });
          doc = await db.collection(LINES_COL).findOne({
            paymentLineId: item.paymentLineId,
            associationId,
          });
          if (!doc) continue;
        }
      }

      if (item.status !== undefined) {
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
        updatedStatus.push(item.paymentLineId);

        if (to === "paid") {
          try {
            await recordExpenseLedgerForPaidUmpireLine({
              db,
              associationId,
              paymentLineId: String(doc.paymentLineId ?? item.paymentLineId),
              amountCents: doc.amountCents as number | null | undefined,
              fixtureId: String(doc.fixtureId ?? ""),
              seasonCompetitionId: String(doc.seasonCompetitionId ?? ""),
              umpireId: String(doc.umpireId ?? ""),
              paidAtIso: nowIso,
              createdBy: user.userId,
            });
          } catch (e) {
            console.error("[umpire-payment-lines] expense ledger mirror failed:", e);
          }
        }
      }
    }

    if (updatedStatus.length > 0) {
      await logPlatformAudit({
        userId: user.userId,
        userEmail: user.email,
        category: "umpire_payment",
        action: "patch_lines",
        resourceType: "association",
        resourceId: associationId,
        summary: `Status update on ${updatedStatus.length} umpire payment line(s)`,
        metadata: { paymentLineIds: updatedStatus, errors },
      });
    }

    return NextResponse.json({
      updatedStatus,
      updatedAmount,
      errors,
    });
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
    const db = client.db();

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
