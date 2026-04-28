// app/api/admin/members/[id]/route.ts
// Members API - Get, Update, Delete individual member

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/middleware";
import {
  assertMemberInSessionScope,
  type MemberScopeDoc,
} from "@/lib/auth/memberRouteScope";
import {
  generateTraceId,
  logAdminTelemetry,
  logAdminError,
} from "@/lib/observability/adminTelemetry";

// GET - Get single member by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { response: authRes } = await requirePermission(request, "member.view");
    if (authRes) return authRes;

    const { id } = await context.params;

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const member = await db.collection("members").findOne({ memberId: id });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const scope = await assertMemberInSessionScope(request, member as MemberScopeDoc);
    if (scope) return scope;

    return NextResponse.json({ member });
  } catch (error: unknown) {
    logAdminError("admin.member.get.error", "no-trace", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// PUT - Update member
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const traceId = generateTraceId();
  try {
    const { response: authRes } = await requirePermission(request, "member.edit");
    if (authRes) return authRes;

    const session = await getSession();
    const resolvedParams = await params;
    const memberId = resolvedParams.id;
    const body = await request.json();

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const existing = await db.collection("members").findOne({ memberId });
    if (!existing) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    const scopePut = await assertMemberInSessionScope(request, existing as MemberScopeDoc);
    if (scopePut) return scopePut;

    // Extract change log if provided
    const changeLog = body._changeLog;
    delete body._changeLog; // Remove from member data

    // Strip immutable / identity fields that must never appear in $set
    const { _id, memberId: _mid, createdAt, ...updateData } = body;

    // Update timestamp
    updateData.updatedAt = new Date().toISOString();

    // Update member
    const result = await db
      .collection("members")
      .updateOne({ memberId }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Log changes if provided
    if (changeLog && Object.keys(changeLog.changes).length > 0) {
      await db.collection("member_change_logs").insertOne({
        memberId,
        section: changeLog.section,
        changes: changeLog.changes,
        timestamp: changeLog.timestamp,
        updatedBy: session?.email || session?.userId || "system",
        updatedAt: new Date().toISOString(),
      });
    }

    // Fetch updated member
    const updatedMember = await db.collection("members").findOne({ memberId });

    logAdminTelemetry("admin.member.update", {
      traceId,
      memberId,
      updatedBy:   session?.userId ?? null,
      updaterRole: session?.role   ?? null,
      hasChangeLog: changeLog ? Object.keys(changeLog.changes).length > 0 : false,
    });

    return NextResponse.json({
      success: true,
      member: updatedMember,
    });
  } catch (error: unknown) {
    logAdminError("admin.member.update.error", traceId, error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update member",
      },
      { status: 500 },
    );
  }
}

// DELETE - Delete/Deactivate member
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const traceId = generateTraceId();
  try {
    const { response: authRes } = await requirePermission(request, "member.delete");
    if (authRes) return authRes;

    const session = await getSession();
    const { id } = await context.params;

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Check if member exists
    const member = await db.collection("members").findOne({ memberId: id });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const scopeDel = await assertMemberInSessionScope(request, member as MemberScopeDoc);
    if (scopeDel) return scopeDel;

    // Soft delete - set status to Inactive
    await db.collection("members").updateOne(
      { memberId: id },
      {
        $set: {
          "membership.status": "Inactive",
          updatedAt: new Date().toISOString(),
          updatedBy: session?.email || session?.userId || "system",
        },
      },
    );

    logAdminTelemetry("admin.member.deactivate", {
      traceId,
      memberId: id,
      deactivatedBy:   session?.userId ?? null,
      deactivatorRole: session?.role   ?? null,
    });

    return NextResponse.json({
      message: "Member deactivated successfully",
    });
  } catch (error: unknown) {
    logAdminError("admin.member.deactivate.error", traceId, error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
