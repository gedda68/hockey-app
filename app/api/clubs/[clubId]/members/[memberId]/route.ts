// app/api/clubs/[clubId]/members/[memberId]/route.ts
// UPDATED: Uses clubs.id field to match members.clubId

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// GET - Fetch single member by memberId
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; memberId: string }> }
) {
  try {
    const { clubId, memberId } = await params;

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Find club by slug
    const club = await db.collection("clubs").findOne({ slug: clubId });
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // ✅ Use club.id to match members.clubId
    // This assumes your club has an "id" field and members have matching "clubId"
    const member = await db.collection("members").findOne({
      memberId: memberId,
      clubId: club.id, // Uses club.id field
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json(member);
  } catch (error) {
    console.error("Error fetching member:", error);
    return NextResponse.json(
      { error: "Failed to fetch member" },
      { status: 500 }
    );
  }
}

// PUT - Update member
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; memberId: string }> }
) {
  try {
    const { clubId, memberId } = await params;

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Find club by slug
    const club = await db.collection("clubs").findOne({ slug: clubId });
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Get update data from request
    const updateData = await request.json();

    // ✅ Use club.id to match members.clubId
    const result = await db.collection("members").findOneAndUpdate(
      {
        memberId: memberId,
        clubId: club.id,
      },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      },
      {
        returnDocument: "after",
      }
    );

    if (!result) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Handle family relationships - remove old reverse relationships
    if (updateData.familyRelationships) {
      // Get old member data to find relationships to remove
      const oldMember = await db.collection("members").findOne({
        memberId: memberId,
        clubId: club.id,
      });

      if (oldMember?.familyRelationships) {
        // Remove old reverse relationships
        for (const oldRel of oldMember.familyRelationships) {
          await db.collection("members").updateOne(
            { memberId: oldRel.relatedMemberId },
            {
              $pull: {
                familyRelationships: {
                  relatedMemberId: memberId,
                },
              },
            }
          );
        }
      }

      // Add new reverse relationships
      for (const rel of updateData.familyRelationships) {
        if (rel.relatedMemberId) {
          await db.collection("members").updateOne(
            { memberId: rel.relatedMemberId },
            {
              $push: {
                familyRelationships: {
                  relationshipId: `famrel-${Date.now()}-reverse`,
                  relatedMemberId: memberId,
                  relationshipType: rel.relationshipType,
                  forwardRelation: rel.reverseRelation,
                  reverseRelation: rel.forwardRelation,
                },
              },
            }
          );
        }
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating member:", error);
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 }
    );
  }
}

// DELETE - Remove member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; memberId: string }> }
) {
  try {
    const { clubId, memberId } = await params;

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Find club by slug
    const club = await db.collection("clubs").findOne({ slug: clubId });
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // ✅ Use club.id to match members.clubId
    // Get member to find family relationships
    const member = await db.collection("members").findOne({
      memberId: memberId,
      clubId: club.id,
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Remove reverse relationships from related members
    if (member.familyRelationships) {
      for (const rel of member.familyRelationships) {
        await db.collection("members").updateOne(
          { memberId: rel.relatedMemberId },
          {
            $pull: {
              familyRelationships: {
                relatedMemberId: memberId,
              },
            },
          }
        );
      }
    }

    // Delete the member
    const result = await db.collection("members").deleteOne({
      memberId: memberId,
      clubId: club.id,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Member deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting member:", error);
    return NextResponse.json(
      { error: "Failed to delete member" },
      { status: 500 }
    );
  }
}
