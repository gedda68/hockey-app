// app/api/clubs/[clubId]/members/route.ts
// Complete API: Create member + List members (with unique ID check)

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// Helper to generate member ID
function generateMemberId(clubShortName: string, sequence: number): string {
  const paddedSequence = sequence.toString().padStart(7, "0");
  return `${clubShortName}-${paddedSequence}`;
}

// Helper to find next available member ID
async function getNextAvailableMemberId(
  db: any,
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
      console.log(`✅ Found available member ID: ${memberId}`);
      return memberId;
    }

    console.log(`⚠️ Member ID ${memberId} already exists, trying next...`);
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

    console.log("===========================================");
    console.log("📝 CREATE Member Request");
    console.log("clubId (slug):", clubId);

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Find club by slug
    const club = await db.collection("clubs").findOne({ slug: clubId });
    if (!club) {
      console.error("❌ Club not found");
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    console.log("✅ Club found:", {
      id: club.id,
      name: club.name,
      slug: club.slug,
    });

    // Get form data
    const formData = await request.json();

    // Get club's short name for member ID prefix
    const clubShortName =
      club.shortName || club.slug.substring(0, 3).toUpperCase();
    console.log("🏷️ Club short name:", clubShortName);

    // Get next available member ID (checks for uniqueness)
    const memberId = await getNextAvailableMemberId(db, club.id, clubShortName);

    console.log("🆔 Generated unique member ID:", memberId);

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

    console.log("💾 Inserting member into database...");

    // Insert member
    const result = await db.collection("members").insertOne(memberData);

    console.log("✅ Member created successfully:", memberId);

    // Handle family relationships - add reverse relationships
    if (
      formData.familyRelationships &&
      formData.familyRelationships.length > 0
    ) {
      console.log("🔗 Processing family relationships...");
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
      console.log("✅ Family relationships processed");
    }

    console.log("===========================================");

    return NextResponse.json({
      ...memberData,
      _id: result.insertedId,
    });
  } catch (error: any) {
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

    console.log("===========================================");
    console.log("📥 GET Members List Request");
    console.log("clubId (slug):", clubId);

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Find club by slug
    console.log("🔍 Looking for club with slug:", clubId);
    const club = await db.collection("clubs").findOne({ slug: clubId });

    if (!club) {
      console.error("❌ Club not found with slug:", clubId);
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    console.log("✅ Club found:", {
      id: club.id,
      name: club.name,
      slug: club.slug,
    });

    // ✅ Get all members using club.id
    console.log("🔍 Looking for members with clubId:", club.id);

    const members = await db
      .collection("members")
      .find({ clubId: club.id })
      .sort({ "personalInfo.lastName": 1, "personalInfo.firstName": 1 })
      .toArray();

    console.log(`✅ Found ${members.length} members`);
    console.log("===========================================");

    return NextResponse.json(members);
  } catch (error) {
    console.error("💥 Error fetching members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}
