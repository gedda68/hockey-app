// app/api/clubs/[clubId]/members/[memberId]/route.ts
// GET and UPDATE individual member

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// GET - Get member by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { clubId: string; memberId: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    // Find club by slug
    const club = await db.collection("clubs").findOne({ slug: params.clubId });
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Find member
    const member = await db.collection("members").findOne({
      clubId: club.clubId,
      memberId: params.memberId,
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json(member);
  } catch (error: any) {
    console.error("Error fetching member:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update member
export async function PUT(
  request: NextRequest,
  { params }: { params: { clubId: string; memberId: string } }
) {
  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    // Find club by slug
    const club = await db.collection("clubs").findOne({ slug: params.clubId });
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Check member exists
    const existingMember = await db.collection("members").findOne({
      clubId: club.clubId,
      memberId: params.memberId,
    });

    if (!existingMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Prepare update data
    const updateData = {
      ...body,
      updatedAt: new Date().toISOString(),
      updatedBy: "admin", // TODO: Get from session
    };

    // Don't update these fields
    delete updateData._id;
    delete updateData.memberId;
    delete updateData.clubId;
    delete updateData.createdAt;
    delete updateData.createdBy;

    // Update member
    await db.collection("members").updateOne(
      {
        clubId: club.clubId,
        memberId: params.memberId,
      },
      { $set: updateData }
    );

    // Handle family relationships updates (remove old, add new reverse relationships)
    if (body.familyRelationships) {
      // Remove old reverse relationships
      if (existingMember.familyRelationships) {
        for (const oldRel of existingMember.familyRelationships) {
          await db.collection("members").updateOne(
            { memberId: oldRel.relatedMemberId },
            {
              $pull: {
                familyRelationships: {
                  relatedMemberId: params.memberId,
                },
              },
            }
          );
        }
      }

      // Add new reverse relationships
      for (const rel of body.familyRelationships) {
        if (rel.relatedMemberId) {
          await db.collection("members").updateOne(
            { memberId: rel.relatedMemberId },
            {
              $push: {
                familyRelationships: {
                  relationshipId: `famrel-${Date.now()}-rev`,
                  relatedMemberId: params.memberId,
                  relationshipType: rel.relationshipType,
                  forwardRelation: rel.reverseRelation,
                  reverseRelation: rel.forwardRelation,
                  createdAt: new Date().toISOString(),
                  createdBy: "system",
                },
              },
            }
          );
        }
      }
    }

    // Get updated member
    const updatedMember = await db.collection("members").findOne({
      clubId: club.clubId,
      memberId: params.memberId,
    });

    console.log(`✅ Updated member: ${params.memberId}`);

    return NextResponse.json(updatedMember);
  } catch (error: any) {
    console.error("Error updating member:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete member
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clubId: string; memberId: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    // Find club by slug
    const club = await db.collection("clubs").findOne({ slug: params.clubId });
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Get member to find family relationships
    const member = await db.collection("members").findOne({
      clubId: club.clubId,
      memberId: params.memberId,
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Remove reverse family relationships
    if (member.familyRelationships) {
      for (const rel of member.familyRelationships) {
        await db.collection("members").updateOne(
          { memberId: rel.relatedMemberId },
          {
            $pull: {
              familyRelationships: {
                relatedMemberId: params.memberId,
              },
            },
          }
        );
      }
    }

    // Delete member
    await db.collection("members").deleteOne({
      clubId: club.clubId,
      memberId: params.memberId,
    });

    console.log(`✅ Deleted member: ${params.memberId}`);

    return NextResponse.json({ success: true, memberId: params.memberId });
  } catch (error: any) {
    console.error("Error deleting member:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
