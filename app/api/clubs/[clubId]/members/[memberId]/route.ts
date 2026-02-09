// app/api/clubs/[clubId]/members/[memberId]/route.ts
// Member API routes with authorization and audit logging

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getSessionUser } from "@/lib/get-session-user";
import {
  canViewMember,
  canEditMember,
  canDeleteMember,
  getEditableFields,
  validateLimitedEdit,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-utils";
import { logMemberChange, detectChanges } from "@/lib/audit-log";

// GET - View a member
export async function GET(
  request: NextRequest,
  { params }: { params: { clubId: string; memberId: string } },
) {
  try {
    const { clubId, memberId } = params;
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    // Check authorization
    if (!canViewMember(user, clubId, memberId)) {
      return NextResponse.json(
        forbiddenResponse("You do not have permission to view this member"),
        { status: 403 },
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey");
    const collection = db.collection("members");

    const member = await collection.findOne({ memberId, clubId });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json(member);
  } catch (error) {
    console.error("Error fetching member:", error);
    return NextResponse.json(
      { error: "Failed to fetch member" },
      { status: 500 },
    );
  }
}

// PUT - Update a member
export async function PUT(
  request: NextRequest,
  { params }: { params: { clubId: string; memberId: string } },
) {
  try {
    const { clubId, memberId } = params;
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    // Check authorization
    const { canEdit, isLimitedEdit } = canEditMember(user, clubId, memberId);

    if (!canEdit) {
      return NextResponse.json(
        forbiddenResponse("You do not have permission to edit this member"),
        { status: 403 },
      );
    }

    const updates = await request.json();

    // Validate limited edit permissions
    if (isLimitedEdit) {
      const allowedFields = getEditableFields(user, isLimitedEdit);
      const validation = validateLimitedEdit(updates, allowedFields);

      if (!validation.isValid) {
        return NextResponse.json(
          {
            error: "Invalid fields for limited edit",
            invalidFields: validation.invalidFields,
            message: `You can only edit: ${allowedFields.join(", ")}`,
          },
          { status: 403 },
        );
      }
    }

    const client = await clientPromise;
    const db = client.db("hockey");
    const collection = db.collection("members");

    // Get current member for audit log
    const currentMember = await collection.findOne({ memberId, clubId });

    if (!currentMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Add metadata
    updates.updatedAt = new Date().toISOString();
    updates.updatedBy = user.userId;

    // Update member
    const result = await collection.updateOne(
      { memberId, clubId },
      { $set: updates },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Get updated member for audit log
    const updatedMember = await collection.findOne({ memberId, clubId });

    // Log the change
    const changes = detectChanges(currentMember, updatedMember);

    await logMemberChange({
      userId: user.userId,
      userName: user.name,
      memberId,
      clubId,
      action: "update",
      changes,
      before: currentMember,
      after: updatedMember,
      metadata: {
        isLimitedEdit,
        userRole: user.role,
      },
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error("Error updating member:", error);
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 },
    );
  }
}

// DELETE - Delete a member
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clubId: string; memberId: string } },
) {
  try {
    const { clubId, memberId } = params;
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    // Check authorization
    if (!canDeleteMember(user, clubId, memberId)) {
      return NextResponse.json(
        forbiddenResponse("You do not have permission to delete this member"),
        { status: 403 },
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey");
    const collection = db.collection("members");

    // Get member before deletion for audit log
    const member = await collection.findOne({ memberId, clubId });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Delete member
    const result = await collection.deleteOne({ memberId, clubId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Failed to delete member" },
        { status: 500 },
      );
    }

    // Log the deletion
    await logMemberChange({
      userId: user.userId,
      userName: user.name,
      memberId,
      clubId,
      action: "delete",
      before: member,
      metadata: {
        userRole: user.role,
      },
    });

    return NextResponse.json({ success: true, message: "Member deleted" });
  } catch (error) {
    console.error("Error deleting member:", error);
    return NextResponse.json(
      { error: "Failed to delete member" },
      { status: 500 },
    );
  }
}
