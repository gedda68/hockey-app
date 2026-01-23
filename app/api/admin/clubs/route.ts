//app/api/admin/clubs/route.ts

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// --- GET: FETCH CLUBS ---
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Get unique names to prevent duplicates from your JSON
    const distinctNames = await db.collection("clubs").distinct("name");

    // Map names to the actual 'id' field found in your hockey-app.clubs.json
    const clubsData = await Promise.all(
      distinctNames.map(async (name) => {
        const doc = await db.collection("clubs").findOne({ name });
        return {
          name: doc.name,
          id: doc.id, // This matches the "id" field in your JSON
        };
      })
    );

    return NextResponse.json(clubsData);
  } catch (error: any) {
    console.error("CLUBS_GET_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// --- HELPER: LOG CHANGES ---
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
      changes:
        oldValues && newValues
          ? getChangedFields(oldValues, newValues)
          : undefined,
      reason,
    };

    await db.collection("club_change_logs").insertOne(changeLog);
    console.log("✅ Change logged:", changeType, "for", clubName);
  } catch (error) {
    console.error("❌ Failed to log change:", error);
  }
}

// --- HELPER: DETECT CHANGES ---
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

  const nestedFields = ["colors", "address", "contact"];
  nestedFields.forEach((field) => {
    if (JSON.stringify(oldValues[field]) !== JSON.stringify(newValues[field])) {
      changes.push({
        field,
        displayName: field.charAt(0).toUpperCase() + field.slice(1),
        oldValue: oldValues[field],
        newValue: newValues[field],
      });
    }
  });

  return changes;
}

// --- POST: CREATE CLUB ---
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name || !body.id) {
      return NextResponse.json(
        { error: "Name and ID are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");
    const existing = await db.collection("clubs").findOne({ id: body.id });

    if (existing) {
      return NextResponse.json(
        { error: "Club already exists" },
        { status: 400 }
      );
    }

    const clubData = {
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      active: body.active !== undefined ? body.active : true,
    };

    await db.collection("clubs").insertOne(clubData);
    await logClubChange(
      db,
      body.id,
      body.name,
      "created",
      undefined,
      clubData,
      "Initial Creation",
      body.userId,
      body.userName
    );

    return NextResponse.json({ message: "Club created", club: clubData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// --- PUT: UPDATE CLUB ---
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, userId, userName, reason } = body;

    if (!id)
      return NextResponse.json({ error: "Club ID required" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("hockey-app");
    const oldData = await db.collection("clubs").findOne({ id });

    if (!oldData)
      return NextResponse.json({ error: "Club not found" }, { status: 404 });

    const newData = {
      ...oldData,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    // Cleanup internal MongoDB _id if present in body
    delete (newData as any)._id;

    await db.collection("clubs").updateOne({ id }, { $set: newData });

    await logClubChange(
      db,
      id,
      oldData.name,
      "updated",
      oldData,
      newData,
      reason || "Club details updated",
      userId,
      userName
    );

    return NextResponse.json({ message: "Club updated", club: newData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// --- DELETE: REMOVE CLUB ---
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");
    const userName = searchParams.get("userName");

    if (!id)
      return NextResponse.json({ error: "ID required" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("hockey-app");
    const club = await db.collection("clubs").findOne({ id });

    if (!club)
      return NextResponse.json({ error: "Club not found" }, { status: 404 });

    await db.collection("clubs").deleteOne({ id });
    await logClubChange(
      db,
      id,
      club.name,
      "deleted",
      club,
      undefined,
      "Club archived/removed",
      userId || "system",
      userName || "Admin"
    );

    return NextResponse.json({ message: "Club deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
