// app/api/payments/[paymentId]/route.ts
// Single payment operations — all methods require authentication.
// Members may only read their own payment; mutations require club.fees or above.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { requireAnyPermission } from "@/lib/auth/middleware";
import { assertPaymentMutationAccess } from "@/lib/auth/scopeGuard";

type Params = { params: Promise<{ paymentId: string }> };

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const { paymentId } = await params;
    const client = await clientPromise;
    const db = client.db();

    const payment = await db.collection("payments").findOne({ paymentId });
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Scope check: members may only read their own payment
    const ownId = session.memberId || session.userId;
    const isAdmin = ["super-admin", "association-admin", "assoc-registrar", "club-admin", "registrar"].includes(session.role);
    if (!isAdmin && payment.memberId !== ownId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const member = await db.collection("members").findOne(
      { memberId: payment.memberId },
      {
        projection: {
          memberId: 1,
          "personalInfo.firstName": 1,
          "personalInfo.lastName": 1,
          "contact.primaryEmail": 1,
          "contact.primaryPhone": 1,
        },
      },
    );

    return NextResponse.json({
      ...payment,
      _id: payment._id.toString(),
      memberDetails: member
        ? {
            firstName: member.personalInfo?.firstName,
            lastName: member.personalInfo?.lastName,
            email: member.contact?.primaryEmail,
            phone: member.contact?.primaryPhone,
          }
        : null,
    });
  } catch (error: unknown) {
    console.error("Error fetching payment:", error);
    return NextResponse.json({ error: "Failed to fetch payment" }, { status: 500 });
  }
}

// ── PATCH — update payment status ─────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, response } = await requireAnyPermission(request, [
    "club.fees",
    "association.fees",
    "system.manage",
  ]);
  if (response) return response;

  try {
    const { paymentId } = await params;
    const body = await request.json();
    const { status, transactionId, paidDate, notes } = body;

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const validStatuses = ["pending", "paid", "failed", "refunded", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const payment = await db.collection("payments").findOne({ paymentId });
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Scope: verify the caller can mutate this payment
    const scopeGuard = await assertPaymentMutationAccess(user, payment.memberId, payment.clubId);
    if (scopeGuard) return scopeGuard;

    const update: Record<string, unknown> = { status, updatedAt: new Date() };
    if (status === "paid" && !payment.paidDate) {
      update.paidDate = paidDate ? new Date(paidDate) : new Date();
    }
    if (transactionId) update.transactionId = transactionId;
    if (notes) update.notes = notes;

    await db.collection("payments").updateOne({ paymentId }, { $set: update });

    return NextResponse.json({ message: "Payment updated successfully", paymentId, status });
  } catch (error: unknown) {
    console.error("Error updating payment:", error);
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}

// ── DELETE — cancel pending payment ───────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: Params) {
  const { user, response } = await requireAnyPermission(request, [
    "club.fees",
    "association.fees",
    "system.manage",
  ]);
  if (response) return response;

  try {
    const { paymentId } = await params;
    const client = await clientPromise;
    const db = client.db();

    const payment = await db.collection("payments").findOne({ paymentId });
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const scopeGuard = await assertPaymentMutationAccess(user, payment.memberId, payment.clubId);
    if (scopeGuard) return scopeGuard;

    if (payment.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending payments can be cancelled" },
        { status: 400 },
      );
    }

    await db.collection("payments").updateOne(
      { paymentId },
      { $set: { status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() } },
    );

    return NextResponse.json({ message: "Payment cancelled successfully", paymentId });
  } catch (error: unknown) {
    console.error("Error cancelling payment:", error);
    return NextResponse.json({ error: "Failed to cancel payment" }, { status: 500 });
  }
}
