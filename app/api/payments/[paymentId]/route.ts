// app/api/payments/[paymentId]/route.ts
// Single payment operations

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// ============================================================================
// GET /api/payments/[paymentId]
// Get single payment details
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await params;

    const client = await clientPromise;
    const db = client.db();

    const payment = await db.collection("payments").findOne({ paymentId });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Get member details
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
      }
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
  } catch (error: any) {
    console.error("Error fetching payment:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment", details: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH /api/payments/[paymentId]
// Update payment status
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await params;
    const body = await request.json();

    const { status, transactionId, paidDate, notes } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    const validStatuses = [
      "pending",
      "paid",
      "failed",
      "refunded",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const payment = await db.collection("payments").findOne({ paymentId });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Build update
    const update: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === "paid" && !payment.paidDate) {
      update.paidDate = paidDate ? new Date(paidDate) : new Date();
    }

    if (transactionId) {
      update.transactionId = transactionId;
    }

    if (notes) {
      update.notes = notes;
    }

    // Update payment
    await db.collection("payments").updateOne({ paymentId }, { $set: update });

    return NextResponse.json({
      message: "Payment updated successfully",
      paymentId,
      status,
    });
  } catch (error: any) {
    console.error("Error updating payment:", error);
    return NextResponse.json(
      { error: "Failed to update payment", details: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/payments/[paymentId]
// Cancel/delete payment
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await params;

    const client = await clientPromise;
    const db = client.db();

    const payment = await db.collection("payments").findOne({ paymentId });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Only allow deletion of pending payments
    if (payment.status !== "pending") {
      return NextResponse.json(
        {
          error: "Cannot delete payment",
          details: "Only pending payments can be deleted",
        },
        { status: 400 }
      );
    }

    // Soft delete - mark as cancelled
    await db.collection("payments").updateOne(
      { paymentId },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      message: "Payment cancelled successfully",
      paymentId,
    });
  } catch (error: any) {
    console.error("Error deleting payment:", error);
    return NextResponse.json(
      { error: "Failed to delete payment", details: error.message },
      { status: 500 }
    );
  }
}
