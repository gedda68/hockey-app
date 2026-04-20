// app/api/payments/route.ts
// Payment records — scope-aware access control enforced on every request.
//
// Scope rules (see lib/auth/scopeGuard.ts for detail):
//   super-admin          → all payments; may pass ?memberId= to narrow
//   association-admin /
//   assoc-registrar      → payments for clubs under their association
//   club-admin /
//   registrar            → payments for their club only
//   any other auth user  → their own payments only
//
// POST (create manual payment record) → requires club.fees or system.manage

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { requireAnyPermission } from "@/lib/auth/middleware";
import { buildPaymentScopeFilter } from "@/lib/auth/scopeGuard";

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const requestedMemberId = searchParams.get("memberId") || null;
    const status = searchParams.get("status");
    const seasonYear = searchParams.get("seasonYear");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

    // Resolve scope-aware filter
    const scopeResult = await buildPaymentScopeFilter(session, requestedMemberId);
    if ("response" in scopeResult) return scopeResult.response;

    const client = await clientPromise;
    const db = client.db();

    const query: Record<string, unknown> = { ...scopeResult.filter };
    if (status) query.status = status;
    if (seasonYear) query.seasonYear = seasonYear;

    const payments = await db
      .collection("payments")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    // Enrich with member details
    const memberIds = [...new Set(payments.map((p) => p.memberId).filter(Boolean))];
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
        },
      )
      .toArray();

    const memberMap = new Map(members.map((m) => [m.memberId, m]));

    const enriched = payments.map((payment) => {
      const enrichedPayment = {
        ...payment,
        _id: payment._id?.toString(),
        memberDetails: null as { firstName?: string; lastName?: string; email?: string } | null,
      };
      const member = memberMap.get(payment.memberId);
      if (member) {
        enrichedPayment.memberDetails = {
          firstName: member.personalInfo?.firstName,
          lastName: member.personalInfo?.lastName,
          email: member.contact?.primaryEmail,
        };
      }
      return enrichedPayment;
    });

    return NextResponse.json(enriched);
  } catch (error: unknown) {
    console.error("Error fetching payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

// ── POST — create manual payment record (admin only) ─────────────────────────

export async function POST(request: NextRequest) {
  const { user, response } = await requireAnyPermission(request, [
    "club.fees",
    "association.fees",
    "system.manage",
  ]);
  if (response) return response;

  try {
    const body = await request.json();
    const { memberId, amount, lineItems, paymentMethod, notes } = body;

    if (!memberId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: memberId, amount" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

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
      createdBy: user.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("payments").insertOne(payment);

    return NextResponse.json({ message: "Payment created successfully", payment }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating payment:", error);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}
