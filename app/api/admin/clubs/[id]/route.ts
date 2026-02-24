// app/api/admin/clubs/[id]/route.ts
// FIXED: Returns correct structure { club: ... }

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const client = await clientPromise;
    const db = client.db();

    // Find club by id
    const club = await db.collection("clubs").findOne({ id });

    if (!club) {
      console.error(`Club not found: ${id}`);
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Remove MongoDB _id
    const { _id, ...clubData } = club;

    console.log(`✅ Found club: ${clubData.name}`);

    // Return in expected format
    return NextResponse.json({ club: clubData });
  } catch (error: any) {
    console.error("Error fetching club:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const payload = await req.json();
    const client = await clientPromise;
    const db = client.db();

    // Check club exists
    const existing = await db.collection("clubs").findOne({ id });
    if (!existing) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Update club
    const updatedData = {
      ...payload,
      id, // Ensure ID stays the same
      updatedAt: new Date().toISOString(),
    };

    // Remove _id if present
    delete (updatedData as any)._id;

    await db.collection("clubs").updateOne({ id }, { $set: updatedData });

    console.log(`✅ Updated club: ${updatedData.name}`);

    return NextResponse.json({
      message: "Club updated",
      club: updatedData,
    });
  } catch (error: any) {
    console.error("Error updating club:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
