// app/api/clubs/[clubId]/members/[memberId]/route.ts
// Requires sign-in, a member permission and access to the club on every method.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { guardClubRoute, stripProtectedMemberFields } from "@/lib/clubs/guardClubRoute";

// GET - View a member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; memberId: string }> },
) {
  try {
    const { clubId: clubIdOrSlug, memberId } = await params;

    const guard = await guardClubRoute(request, clubIdOrSlug, ["member.view", "club.members"]);
    if (guard.response) return guard.response;
    const actualClubId = guard.club.clubId;

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const collection = db.collection("members");
    const member = await collection.findOne({ memberId, clubId: actualClubId });

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
  { params }: { params: Promise<{ clubId: string; memberId: string }> },
) {
  try {
    const { clubId: clubIdOrSlug, memberId } = await params;

    const guard = await guardClubRoute(request, clubIdOrSlug, ["member.edit", "club.members"]);
    if (guard.response) return guard.response;
    const actualClubId = guard.club.clubId;

    const updates = stripProtectedMemberFields(await request.json());

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const collection = db.collection("members");

    const result = await collection.updateOne(
      { memberId, clubId: actualClubId },
      {
        $set: {
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const updatedMember = await collection.findOne({
      memberId,
      clubId: actualClubId,
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
  { params }: { params: Promise<{ clubId: string; memberId: string }> },
) {
  try {
    const { clubId: clubIdOrSlug, memberId } = await params;

    const guard = await guardClubRoute(request, clubIdOrSlug, ["member.delete"]);
    if (guard.response) return guard.response;
    const actualClubId = guard.club.clubId;

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const collection = db.collection("members");

    const result = await collection.deleteOne({
      memberId,
      clubId: actualClubId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Failed to delete member" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, message: "Member deleted" });
  } catch (error) {
    console.error("Error deleting member:", error);
    return NextResponse.json(
      { error: "Failed to delete member" },
      { status: 500 },
    );
  }
}
