/**
 * POST /api/member/payments/simulate
 *
 * Dummy/test payment endpoint. Simulates a successful payment for outstanding
 * fees without involving a real payment gateway.
 *
 * In production, this flow would be replaced by a Stripe webhook handler that
 * performs the same database writes after confirming a real payment intent.
 *
 * Supports two item types:
 *   1. "payment"      — an existing payments record (pending registration fee)
 *                       → marks the payment as "paid"
 *   2. "role-request" — a role_request with requiresFee=true
 *                       → creates a payment record, then marks the request
 *                          as feePaid=true and advances to awaiting_approval
 *
 * Body:
 *   {
 *     items: Array<{ type: "payment" | "role-request"; sourceId: string }>
 *   }
 *
 * Response:
 *   {
 *     paymentRef: string       — human-readable receipt reference
 *     paidAt: string           — ISO timestamp
 *     itemsProcessed: number
 *     totalCents: number
 *     receipts: ProcessedItem[]
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";

interface SimulatePaymentBody {
  items: Array<{ type: "payment" | "role-request" | "tournament-allocation"; sourceId: string; itemId?: string }>;
}

interface ProcessedItem {
  type: "payment" | "role-request" | "tournament-allocation";
  sourceId: string;
  amountCents: number;
  status: "ok" | "skipped" | "error";
  reason?: string;
}

// Generates a readable receipt reference like SIM-2025-A3F7
function generateRef(): string {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `SIM-${year}-${suffix}`;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberId = session.memberId;
  if (!memberId) {
    return NextResponse.json(
      { error: "No member account linked to this session" },
      { status: 400 }
    );
  }

  let body: SimulatePaymentBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { items } = body;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "No items provided" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db("hockey-app");
  const now = new Date();
  const paidAt = now.toISOString();
  const paymentRef = generateRef();
  const receipts: ProcessedItem[] = [];
  let totalCents = 0;

  for (const item of items) {
    if (item.type === "payment") {
      // ── Existing payment record ─────────────────────────────────────────
      const pay = await db
        .collection("payments")
        .findOne({ paymentId: item.sourceId, memberId });

      if (!pay) {
        receipts.push({ type: item.type, sourceId: item.sourceId, amountCents: 0, status: "error", reason: "Payment not found or does not belong to this member" });
        continue;
      }
      if (pay.status === "paid") {
        receipts.push({ type: item.type, sourceId: item.sourceId, amountCents: 0, status: "skipped", reason: "Already paid" });
        continue;
      }
      if (pay.status === "cancelled" || pay.status === "refunded") {
        receipts.push({ type: item.type, sourceId: item.sourceId, amountCents: 0, status: "skipped", reason: `Payment is ${pay.status}` });
        continue;
      }

      const amountCents = Math.round((pay.amount as number) * 100);

      await db.collection("payments").updateOne(
        { paymentId: item.sourceId },
        {
          $set: {
            status: "paid",
            paidDate: now,
            transactionId: paymentRef,
            paymentMethod: "simulated",
            updatedAt: now,
          },
        }
      );

      totalCents += amountCents;
      receipts.push({ type: item.type, sourceId: item.sourceId, amountCents, status: "ok" });

    } else if (item.type === "role-request") {
      // ── Role-request fee ─────────────────────────────────────────────────
      const rr = await db
        .collection("role_requests")
        .findOne({ requestId: item.sourceId, memberId, requiresFee: true });

      if (!rr) {
        receipts.push({ type: item.type, sourceId: item.sourceId, amountCents: 0, status: "error", reason: "Role request not found or does not belong to this member" });
        continue;
      }
      if (rr.feePaid) {
        receipts.push({ type: item.type, sourceId: item.sourceId, amountCents: 0, status: "skipped", reason: "Fee already recorded" });
        continue;
      }
      if (rr.status !== "pending_payment") {
        receipts.push({ type: item.type, sourceId: item.sourceId, amountCents: 0, status: "skipped", reason: `Request is already ${rr.status}` });
        continue;
      }

      const amountCents = (rr.feeAmountCents as number) ?? 0;

      // Create a payment record for this role fee
      const newPaymentId = `PAY-${Date.now().toString(36).toUpperCase()}`;
      await db.collection("payments").insertOne({
        paymentId: newPaymentId,
        memberId,
        amount: amountCents / 100,
        lineItems: [
          {
            itemId: `rr-${rr.requestId}`,
            feeId: rr.requestId,
            type: "other",
            name: rr.feeDescription ?? `${rr.requestedRole} registration fee`,
            amount: amountCents / 100,
            gstIncluded: false,
          },
        ],
        status: "paid",
        seasonYear: rr.seasonYear ?? new Date().getFullYear().toString(),
        paymentMethod: "simulated",
        transactionId: paymentRef,
        paidDate: now,
        createdAt: now,
        updatedAt: now,
      });

      // Advance the role request to awaiting_approval
      await db.collection("role_requests").updateOne(
        { requestId: item.sourceId },
        {
          $set: {
            feePaid: true,
            paymentId: newPaymentId,
            paymentDate: paidAt,
            status: "awaiting_approval",
            updatedAt: now,
          },
        }
      );

      totalCents += amountCents;
      receipts.push({ type: item.type, sourceId: item.sourceId, amountCents, status: "ok" });
    } else if (item.type === "tournament-allocation") {
      // ── Tournament member allocation ──────────────────────────────────────
      const alloc = await db
        .collection("member_tournament_fees")
        .findOne({ allocationId: item.sourceId, memberId });

      if (!alloc) {
        receipts.push({ type: item.type, sourceId: item.sourceId, amountCents: 0, status: "error", reason: "Allocation not found or does not belong to this member" });
        continue;
      }

      // Create a payment record covering the outstanding items
      const outstandingItems = (alloc.items as Array<Record<string, unknown>>).filter(
        (i) => i.status === "outstanding" && (!item.itemId || i.itemId === item.itemId)
      );

      if (outstandingItems.length === 0) {
        receipts.push({ type: item.type, sourceId: item.sourceId, amountCents: 0, status: "skipped", reason: "No outstanding items" });
        continue;
      }

      const amountCents = outstandingItems.reduce((s, i) => s + (i.amountCents as number), 0);
      const newPaymentId = `PAY-${Date.now().toString(36).toUpperCase()}`;

      await db.collection("payments").insertOne({
        paymentId: newPaymentId,
        memberId,
        amount: amountCents / 100,
        lineItems: outstandingItems.map((i) => ({
          itemId:  i.itemId,
          feeId:   i.itemId,
          type:    "other",
          name:    i.name,
          amount:  (i.amountCents as number) / 100,
          gstIncluded: false,
        })),
        status: "paid",
        seasonYear: alloc.season,
        paymentMethod: "simulated",
        transactionId: paymentRef,
        paidDate: now,
        createdAt: now,
        updatedAt: now,
      });

      // Mark items as paid on the allocation
      const paidItemIds = new Set(outstandingItems.map((i) => i.itemId as string));
      const updatedItems = (alloc.items as Array<Record<string, unknown>>).map((i) =>
        paidItemIds.has(i.itemId as string)
          ? { ...i, status: "paid", paymentId: newPaymentId, paidDate: now.toISOString() }
          : i
      );
      const newPaidCents = (alloc.paidCents as number) + amountCents;
      const newOutstandingCents = Math.max(0, (alloc.outstandingCents as number) - amountCents);
      const allPaid = newOutstandingCents === 0;

      await db.collection("member_tournament_fees").updateOne(
        { allocationId: item.sourceId },
        {
          $set: {
            items: updatedItems,
            paidCents: newPaidCents,
            outstandingCents: newOutstandingCents,
            status: allPaid ? "paid" : "partially-paid",
            updatedAt: now,
          },
        }
      );

      totalCents += amountCents;
      receipts.push({ type: item.type, sourceId: item.sourceId, amountCents, status: "ok" });

    } else {
      receipts.push({ type: (item as { type: string }).type as "payment", sourceId: item.sourceId, amountCents: 0, status: "error", reason: "Unknown item type" });
    }
  }

  const successCount = receipts.filter((r) => r.status === "ok").length;

  return NextResponse.json({
    paymentRef,
    paidAt,
    itemsProcessed: successCount,
    totalCents,
    receipts,
  });
}
