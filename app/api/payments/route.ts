// app/api/payments/route.ts
// Payment management APIs

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// ============================================================================
// GET /api/payments
// List payments with filters
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const memberId = searchParams.get("memberId");
    const status = searchParams.get("status");
    const seasonYear = searchParams.get("seasonYear");
    const limit = parseInt(searchParams.get("limit") || "50");

    const client = await clientPromise;
    const db = client.db();

    // Build query
    const query: any = {};

    if (memberId) query.memberId = memberId;
    if (status) query.status = status;
    if (seasonYear) query.seasonYear = seasonYear;

    // Fetch payments
    const payments = await db
      .collection("payments")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    // Enrich with member details
    const memberIds = [...new Set(payments.map((p: any) => p.memberId))];
    const members = await db
      .collection("members")
      .find(
        { memberId: { $in: memberIds } },
        {
          projection: {
            memberId: 1,
            "personalInfo.firstName": 1,
            "personalInfo.lastName": 1,
            "contact.primaryEmail": 1,
          },
        }
      )
      .toArray();

    const memberMap = new Map(members.map((m) => [m.memberId, m]));

    const enriched = payments.map((payment: any) => {
      const member = memberMap.get(payment.memberId);
      return {
        ...payment,
        _id: payment._id.toString(),
        memberDetails: member
          ? {
              firstName: member.personalInfo?.firstName,
              lastName: member.personalInfo?.lastName,
              email: member.contact?.primaryEmail,
            }
          : null,
      };
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments", details: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/payments
// Create manual payment record (admin use)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { memberId, amount, lineItems, paymentMethod, notes } = body;

    if (!memberId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: memberId, amount" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Verify member exists
    const member = await db.collection("members").findOne({ memberId });
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const paymentId = `PAY-${Date.now().toString(36).toUpperCase()}`;

    const payment = {
      paymentId,
      memberId,
      amount,
      status: "pending",
      lineItems: lineItems || [],
      paymentMethod: paymentMethod || "manual",
      notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("payments").insertOne(payment);

    return NextResponse.json(
      {
        message: "Payment created successfully",
        payment,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "Failed to create payment", details: error.message },
      { status: 500 }
    );
  }
}
