// app/api/admin/players/[playerId]/status/route.ts
// API for player status data - FULL DATABASE INTEGRATION

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";
import {
  assertMemberInSessionScope,
  type MemberScopeDoc,
} from "@/lib/auth/memberRouteScope";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> },
) {
  try {
    const { playerId } = await params; // ✅ AWAIT params

    const { response: authRes } = await requirePermission(request, "member.view");
    if (authRes) return authRes;

    console.log("📊 Fetching status data for player:", playerId);

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const member = await db.collection("members").findOne({ memberId: playerId });

    if (!member) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const scopeErr = await assertMemberInSessionScope(
      request,
      member as MemberScopeDoc,
    );
    if (scopeErr) return scopeErr;

    const mem = member.membership ?? {};
    const statusMap: Record<string, string> = {
      active: "active", life: "active", inactive: "inactive", suspended: "suspended",
    };
    const status = {
      current:             statusMap[(mem.status ?? "").toLowerCase()] ?? "pending",
      registrationDate:    mem.joinDate ?? mem.currentPeriodStart ?? "",
      expiryDate:          mem.currentPeriodEnd ?? "",
      renewalReminderDate: "",
      seasons:             [],
    };

    console.log("✅ Status data retrieved");

    return NextResponse.json({ status });
  } catch (error: unknown) {
    console.error("❌ Error fetching status:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch status",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> },
) {
  try {
    const { playerId } = await params; // ✅ AWAIT params
    const status = await request.json();

    const { response: authRes } = await requirePermission(request, "member.edit");
    if (authRes) return authRes;

    console.log("📝 Updating status for player:", playerId);

    // Add timestamp
    const updatedStatus = {
      ...status,
      updatedAt: new Date().toISOString(),
    };

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const doc = await db.collection("members").findOne({ memberId: playerId });
    if (!doc) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    const scopeErr = await assertMemberInSessionScope(
      request,
      doc as MemberScopeDoc,
    );
    if (scopeErr) return scopeErr;

    // Map flat status to membership.status (Title Case)
    const memberStatusMap: Record<string, string> = {
      active: "Active", inactive: "Inactive", suspended: "Suspended",
    };
    const membershipStatus = memberStatusMap[updatedStatus.current] ?? "Active";

    const result = await db.collection("members").updateOne(
      { memberId: playerId },
      {
        $set: {
          "membership.status":             membershipStatus,
          "membership.currentPeriodStart": updatedStatus.registrationDate ?? undefined,
          "membership.currentPeriodEnd":   updatedStatus.expiryDate       ?? undefined,
          updatedAt: new Date().toISOString(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    console.log("✅ Status updated successfully");

    return NextResponse.json({
      success: true,
      status: updatedStatus,
      message: "Player status updated successfully",
    });
  } catch (error: unknown) {
    console.error("❌ Error updating status:", error);
    return NextResponse.json(
      {
        error: "Failed to update status",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
