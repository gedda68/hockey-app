// app/api/admin/clubs/[clubId]/route.ts
// ENHANCED: With deactivation and change logging

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// Helper function to log changes
async function logClubChange(
  db: any,
  clubId: string,
  clubName: string,
  changeType: string,
  oldValues?: any,
  newValues?: any,
  reason?: string,
  userId?: string,
  userName?: string
) {
  try {
    const changes =
      oldValues && newValues
        ? getChangedFields(oldValues, newValues)
        : undefined;

    const changeLog = {
      id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      clubId,
      clubName,
      changeType,
      timestamp: new Date().toISOString(),
      userId: userId || "system",
      userName: userName || "System Admin",
      oldValues,
      newValues,
      changes,
      reason,
    };

    await db.collection("club_change_logs").insertOne(changeLog);
    console.log("✅ Change logged:", changeType, "for", clubName);
  } catch (error) {
    console.error("❌ Failed to log change:", error);
  }
}

function getChangedFields(oldValues: any, newValues: any) {
  const changes: any[] = [];

  const compareFields = [
    { key: "name", display: "Club Name" },
    { key: "shortName", display: "Short Name" },
    { key: "active", display: "Active Status" },
    { key: "logo", display: "Logo" },
    { key: "established", display: "Established" },
    { key: "homeGround", display: "Home Ground" },
    { key: "description", display: "Description" },
  ];

  compareFields.forEach(({ key, display }) => {
    if (oldValues[key] !== newValues[key]) {
      changes.push({
        field: key,
        displayName: display,
        oldValue: oldValues[key],
        newValue: newValues[key],
      });
    }
  });

  // Check nested objects
  if (JSON.stringify(oldValues.colors) !== JSON.stringify(newValues.colors)) {
    changes.push({
      field: "colors",
      displayName: "Club Colors",
      oldValue: oldValues.colors,
      newValue: newValues.colors,
    });
  }

  if (JSON.stringify(oldValues.address) !== JSON.stringify(newValues.address)) {
    changes.push({
      field: "address",
      displayName: "Address",
      oldValue: oldValues.address,
      newValue: newValues.address,
    });
  }

  if (JSON.stringify(oldValues.contact) !== JSON.stringify(newValues.contact)) {
    changes.push({
      field: "contact",
      displayName: "Contact Information",
      oldValue: oldValues.contact,
      newValue: newValues.contact,
    });
  }

  return changes;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    console.log("[GET] Fetching club:", clubId);

    const client = await clientPromise;
    const db = client.db("hockey-app");
    const clubsCollection = db.collection("clubs");

    const club = await clubsCollection.findOne({ id: clubId });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const { _id, ...clubData } = club;

    return NextResponse.json(clubData);
  } catch (error: any) {
    console.error("[GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch club" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const body = await request.json();

    console.log("[PUT] Updating club:", clubId);

    const client = await clientPromise;
    const db = client.db("hockey-app");
    const clubsCollection = db.collection("clubs");

    // Get existing club for comparison
    const existingClub = await clubsCollection.findOne({ id: clubId });
    if (!existingClub) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Remove MongoDB _id for comparison
    const { _id, ...oldClubData } = existingClub;

    // Prepare update data
    const updateData = {
      ...body,
      updatedAt: new Date().toISOString(),
      lastModifiedBy: body.userId || "system",
    };

    // Handle deactivation
    if (!body.active && oldClubData.active) {
      updateData.deactivatedAt = new Date().toISOString();
      updateData.deactivatedBy = body.userId || "system";
      updateData.deactivationReason =
        body.deactivationReason || "No reason provided";

      // Log deactivation
      await logClubChange(
        db,
        clubId,
        body.name,
        "deactivated",
        { active: true },
        { active: false },
        body.deactivationReason || "No reason provided",
        body.userId,
        body.userName
      );
    }

    // Handle reactivation
    if (body.active && !oldClubData.active) {
      updateData.deactivatedAt = undefined;
      updateData.deactivatedBy = undefined;
      updateData.deactivationReason = undefined;

      // Log reactivation
      await logClubChange(
        db,
        clubId,
        body.name,
        "reactivated",
        { active: false },
        { active: true },
        body.reactivationReason || "Club reactivated",
        body.userId,
        body.userName
      );
    }

    // Update in database
    await clubsCollection.updateOne({ id: clubId }, { $set: updateData });

    // Log the update (if not just activation/deactivation)
    const hasOtherChanges = getChangedFields(oldClubData, body).length > 0;
    if (hasOtherChanges) {
      await logClubChange(
        db,
        clubId,
        body.name,
        "updated",
        oldClubData,
        body,
        body.changeReason || "Club details updated",
        body.userId,
        body.userName
      );
    }

    console.log("[PUT] Club updated successfully");

    return NextResponse.json({
      message: "Club updated successfully",
      club: updateData,
    });
  } catch (error: any) {
    console.error("[PUT] Error:", error);
    return NextResponse.json(
      { error: "Failed to update club" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    console.log("[DELETE] Deleting club:", clubId);

    const client = await clientPromise;
    const db = client.db("hockey-app");
    const clubsCollection = db.collection("clubs");

    // Get club before deletion for logging
    const club = await clubsCollection.findOne({ id: clubId });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const result = await clubsCollection.deleteOne({ id: clubId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Log deletion
    await logClubChange(
      db,
      clubId,
      club.name,
      "deleted",
      club,
      undefined,
      "Club deleted",
      undefined,
      "System Admin"
    );

    console.log("[DELETE] Club deleted successfully");

    return NextResponse.json({ message: "Club deleted successfully" });
  } catch (error: any) {
    console.error("[DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete club" },
      { status: 500 }
    );
  }
}
