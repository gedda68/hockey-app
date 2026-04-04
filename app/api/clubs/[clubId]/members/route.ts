// app/api/clubs/[clubId]/members/route.ts
// Complete API: Create member + List members (with unique ID check)

import { NextRequest, NextResponse } from "next/server";
import type { Db } from 'mongodb';
import clientPromise from "@/lib/mongodb";

// Helper to generate member ID
function generateMemberId(clubShortName: string, sequence: number): string {
  const paddedSequence = sequence.toString().padStart(7, "0");
  return `${clubShortName}-${paddedSequence}`;
}

// Helper to find next available member ID
async function getNextAvailableMemberId(
  db: Db,
  clubId: string,
  clubShortName: string
): Promise<string> {
  let sequence = 1;
  let memberId = generateMemberId(clubShortName, sequence);

  // Keep incrementing until we find an unused ID
  while (true) {
    const existing = await db.collection("members").findOne({ memberId });

    if (!existing) {
      // This ID is available
      return memberId;
    }

    sequence++;
    memberId = generateMemberId(clubShortName, sequence);

    // Safety check to prevent infinite loop
    if (sequence > 10000) {
      throw new Error(
        "Unable to generate unique member ID after 10000 attempts"
      );
    }
  }
}

// POST - Create new member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params; // This is the slug


    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Find club by slug
    const club = await db.collection("clubs").findOne({ slug: clubId });
    if (!club) {
      console.error("❌ Club not found");
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

      id: club.id,
      name: club.name,
      slug: club.slug,
    });

    // Get form data
    const formData = await request.json();

    // Get club's short name for member ID prefix
    const clubShortName =
      club.shortName || club.slug.substring(0, 3).toUpperCase();

    // Get next available member ID (checks for uniqueness)
    const memberId = await getNextAvailableMemberId(db, club.id, clubShortName);


    // Create member document
    const memberData = {
      memberId,
      clubId: club.id, // ✅ Use club.id
      personalInfo: formData.personalInfo,
      contact: formData.contact,
      address: formData.address,
      healthcare: formData.healthcare,
      emergencyContacts: formData.emergencyContacts || [],
      membership: formData.membership,
      roles: formData.roles || [],
      playerInfo: formData.playerInfo || null,
      medical: formData.medical,
      familyRelationships: formData.familyRelationships || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };


    // Insert member
    const result = await db.collection("members").insertOne(memberData);


    // Handle family relationships - add reverse relationships
    if (
      formData.familyRelationships &&
      formData.familyRelationships.length > 0
    ) {
      for (const rel of formData.familyRelationships) {
        if (rel.relatedMemberId) {
          // Add reverse relationship to the related member
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


    return NextResponse.json({
      ...memberData,
      _id: result.insertedId,
    });
  } catch (error: unknown) {
    console.error("💥 Error creating member:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create member" },
      { status: 500 }
    );
  }
}

// GET - List all members in club
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params; // This is the slug


    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Find club by slug
    const club = await db.collection("clubs").findOne({ slug: clubId });

    if (!club) {
      console.error("❌ Club not found with slug:", clubId);
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

      id: club.id,
      name: club.name,
      slug: club.slug,
    });

    // ✅ Get all members using club.id

    const members = await db
      .collection("members")
      .find({ clubId: club.id })
      .sort({ "personalInfo.lastName": 1, "personalInfo.firstName": 1 })
      .toArray();


    return NextResponse.json(members);
  } catch (error) {
    console.error("💥 Error fetching members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}
