// app/api/admin/members/route.ts
// Members API - List and Create

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const MEMBERS_PER_PAGE = 20;

// Generate member ID: CHC-0000001
async function generateMemberId(db: any, clubId: string): Promise<string> {
  const clubsCol = db.collection("clubs");

  // Find the club first to ensure it exists
  const club = await clubsCol.findOne({ id: clubId });
  if (!club) throw new Error("Club not found");

  const shortName = club.shortName || "CLB";

  // Use a more robust update pattern
  const updateRes = await clubsCol.findOneAndUpdate(
    { id: clubId },
    { $inc: { memberSequence: 1 } },
    {
      returnDocument: "after",
      upsert: false,
    },
  );

  // Robust check for the sequence number
  // In some driver versions, it's 'updateRes', in others 'updateRes.value'
  const updatedDoc = updateRes.value || updateRes;
  const sequence = updatedDoc?.memberSequence;

  if (!sequence) {
    throw new Error("Failed to generate member sequence");
  }

  return `${shortName}-${String(sequence).padStart(7, "0")}`;
}

// Calculate age from date of birth
function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

// GET - List members with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(
      searchParams.get("limit") || MEMBERS_PER_PAGE.toString(),
    );
    const skip = (page - 1) * limit;

    // Filters
    const clubId = searchParams.get("clubId");
    const associationId = searchParams.get("associationId");
    const status = searchParams.get("status");
    const membershipType = searchParams.get("membershipType");
    const role = searchParams.get("role");
    const search = searchParams.get("search");

    console.log("🔍 GET members - Filters:", {
      page,
      limit,
      clubId,
      associationId,
      status,
      search,
    });

    const client = await clientPromise;
    const db = client.db();

    // Build query
    const query: any = {};

    if (clubId) query.clubId = clubId;
    if (associationId) query.associationId = associationId;
    if (status) query["membership.status"] = status;
    if (membershipType) query["membership.membershipTypes"] = membershipType;
    if (role) query.roles = role;

    // Search by name, email, or member ID
    if (search) {
      query.$or = [
        { memberId: { $regex: search, $options: "i" } },
        { "personalInfo.firstName": { $regex: search, $options: "i" } },
        { "personalInfo.lastName": { $regex: search, $options: "i" } },
        { "personalInfo.displayName": { $regex: search, $options: "i" } },
        { "contact.email": { $regex: search, $options: "i" } },
      ];
    }

    // Get total count
    const total = await db.collection("members").countDocuments(query);

    // Get members
    const members = await db
      .collection("members")
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    console.log(`✅ Found ${members.length} members (${total} total)`);

    return NextResponse.json({
      members,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("💥 Error fetching members:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("➕ Creating member:", {
      clubId: body.clubId,
      name: `${body.personalInfo?.firstName} ${body.personalInfo?.lastName}`,
    });

    // Validate required fields
    if (!body.clubId) {
      return NextResponse.json(
        { error: "Club ID is required" },
        { status: 400 },
      );
    }

    if (!body.personalInfo?.firstName || !body.personalInfo?.lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 },
      );
    }

    if (!body.personalInfo?.dateOfBirth) {
      return NextResponse.json(
        { error: "Date of birth is required" },
        { status: 400 },
      );
    }

    if (!body.contact?.email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (
      !body.contact?.emergencyContact?.name ||
      !body.contact?.emergencyContact?.phone
    ) {
      return NextResponse.json(
        { error: "Emergency contact name and phone are required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Generate member ID
    const memberId = await generateMemberId(db, body.clubId);

    // Auto-generate display name if not provided
    const displayName =
      body.personalInfo.displayName ||
      `${body.personalInfo.firstName} ${body.personalInfo.lastName}`;

    // Build member object
    const newMember = {
      memberId,
      clubId: body.clubId,
      associationId: body.associationId || null,

      personalInfo: {
        salutation: body.personalInfo.salutation || null,
        firstName: body.personalInfo.firstName.trim(),
        lastName: body.personalInfo.lastName.trim(),
        displayName: displayName.trim(),
        dateOfBirth: body.personalInfo.dateOfBirth,
        gender: body.personalInfo.gender,
        photoUrl: body.personalInfo.photoUrl || null,
      },

      contact: {
        email: body.contact.email.trim().toLowerCase(),
        phone: body.contact.phone || null,
        mobile: body.contact.mobile || null,
        emergencyContact: {
          name: body.contact.emergencyContact.name.trim(),
          relationship: body.contact.emergencyContact.relationship,
          phone: body.contact.emergencyContact.phone.trim(),
          email: body.contact.emergencyContact.email || null,
        },
      },

      address: {
        street: body.address?.street || "",
        suburb: body.address?.suburb || "",
        state: body.address?.state || "",
        postcode: body.address?.postcode || "",
        country: body.address?.country || "Australia",
      },

      membership: {
        joinDate: body.membership?.joinDate || new Date().toISOString(),
        membershipTypes: body.membership?.membershipTypes || [],
        status: body.membership?.status || "Active",
        expiryDate: body.membership?.expiryDate || null,
        renewalDate: body.membership?.renewalDate || null,
      },

      roles: body.roles || [],
      teams: body.teams || [],
      userId: body.userId || null,
      medical: body.medical || null,
      notes: body.notes || null,

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system", // TODO: Get from auth context
      updatedBy: null,
    };

    // Insert member
    await db.collection("members").insertOne(newMember);

    console.log(`✅ Created member: ${memberId}`);

    return NextResponse.json(
      {
        message: "Member created successfully",
        member: newMember,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("💥 Error creating member:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// app/api/admin/members/[id]/route.ts

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db();

    // Remove immutable fields if present in body
    const { _id, memberId, createdAt, ...updateData } = body;

    const result = await db.collection("members").findOneAndUpdate(
      { memberId: id },
      {
        $set: {
          ...updateData,
          updatedAt: new Date().toISOString(),
          updatedBy: "system", // Replace with auth context later
        },
      },
      { returnDocument: "after" },
    );

    if (!result) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Update successful",
      member: result.value || result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
