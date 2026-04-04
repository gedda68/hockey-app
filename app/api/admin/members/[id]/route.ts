// app/api/admin/members/[id]/route.ts
// Members API - Get, Update, Delete individual member

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";

// GET - Get single member by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    console.log("🔍 GET member:", id);

    const client = await clientPromise;
    const db = client.db();

    const member = await db.collection("members").findOne({ memberId: id });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    console.log("✅ Found member:", member.personalInfo.displayName);

    return NextResponse.json({ member });
  } catch (error: unknown) {
    console.error("💥 Error fetching member:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// PUT - Update member
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    const resolvedParams = await params;
    const memberId = resolvedParams.id;
    const body = await request.json();

    const client = await clientPromise;
    const db = client.db();

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

    return NextResponse.json({
      success: true,
      member: updatedMember,
    });
  } catch (error: unknown) {
    console.error("Error updating member:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update member" },
      { status: 500 },
    );
  }
}

// DELETE - Delete/Deactivate member
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    const { id } = await context.params;

    console.log("🗑️ Deactivating member:", id);

    const client = await clientPromise;
    const db = client.db();

    // Check if member exists
    const member = await db.collection("members").findOne({ memberId: id });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

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

    console.log("✅ Deactivated member:", id);

    return NextResponse.json({
      message: "Member deactivated successfully",
    });
  } catch (error: unknown) {
    console.error("💥 Error deactivating member:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
