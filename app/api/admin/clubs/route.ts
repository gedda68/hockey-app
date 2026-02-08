// app/api/admin/clubs/route.ts
// Clubs API with hierarchical filtering + change logging

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

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
  userName?: string,
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
    { key: "parentAssociationId", display: "Association" },
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

// Region mappings for geolocation (backwards compatibility)
const REGION_MAPPINGS: Record<string, string[]> = {
  "Brisbane North": [
    "Chermside",
    "Aspley",
    "Albany Creek",
    "Strathpine",
    "Petrie",
  ],
  "Brisbane South": ["Sunnybank", "Calamvale", "Stretton", "Kuraby"],
  "Brisbane East": ["Cannon Hill", "Morningside", "Bulimba", "Camp Hill"],
  "Brisbane West": ["Toowong", "Indooroopilly", "Kenmore", "Chapel Hill"],
  "Brisbane Central": [
    "Brisbane CBD",
    "South Brisbane",
    "West End",
    "Fortitude Valley",
  ],
  "Gold Coast": ["Southport", "Surfers Paradise", "Burleigh Heads", "Robina"],
  "Sunshine Coast": ["Maroochydore", "Caloundra", "Noosa", "Nambour"],
  Ipswich: ["Ipswich", "Springfield", "Redbank"],
  Logan: ["Logan Central", "Springwood", "Underwood"],
};

function getRegionFromSuburb(suburb: string): string | null {
  const normalizedSuburb = suburb.trim();

  for (const [region, suburbs] of Object.entries(REGION_MAPPINGS)) {
    if (
      suburbs.some((s) => s.toLowerCase() === normalizedSuburb.toLowerCase())
    ) {
      return region;
    }
  }

  return null;
}

// --- GET: FETCH CLUBS WITH FILTERING ---
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Filters
    const associationId = searchParams.get("associationId"); // Filter by association (for hierarchy)
    const parentAssociationId = searchParams.get("parentAssociationId"); // Alternative name
    const region = searchParams.get("region"); // Suburb for geolocation (backwards compat)
    const state = searchParams.get("state");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db();

    // Build query
    const query: any = {};

    // Filter by association (priority - used by wizard)
    if (associationId || parentAssociationId) {
      query.parentAssociationId = associationId || parentAssociationId;
    }

    // Filter by region (geolocation - backwards compatibility)
    if (region && !associationId && !parentAssociationId) {
      const matchedRegion = getRegionFromSuburb(region);
      if (matchedRegion) {
        query.region = matchedRegion;
        console.log(`📍 Mapped ${region} to region: ${matchedRegion}`);
      } else {
        // If no mapping found, search in club name or general area
        query.$or = [
          { region: { $regex: region, $options: "i" } },
          { name: { $regex: region, $options: "i" } },
        ];
      }
    }

    if (state) {
      query.state = state;
    }

    if (status) {
      query.active = status === "active";
    } else {
      // Default to active clubs only
      query.active = true;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { shortName: { $regex: search, $options: "i" } },
        { id: { $regex: search, $options: "i" } },
      ];
    }

    console.log("🏛️ GET clubs - Query:", query);

    // Get total count
    const total = await db.collection("clubs").countDocuments(query);

    // Get clubs
    const clubs = await db
      .collection("clubs")
      .find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    console.log(`✅ Found ${clubs.length} clubs (${total} total)`);

    // For simple list (used by wizard), return minimal data
    if (searchParams.get("simple") === "true") {
      const simple = clubs.map((c) => ({
        id: c.id,
        name: c.name,
        shortName: c.shortName,
        associationId: c.parentAssociationId,
      }));

      return NextResponse.json({
        clubs: simple,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // Full club data
    return NextResponse.json({
      clubs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("💥 Error fetching clubs:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// --- POST: CREATE CLUB ---
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.id) {
      return NextResponse.json(
        { error: "Name and ID are required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const existing = await db.collection("clubs").findOne({ id: body.id });

    if (existing) {
      return NextResponse.json(
        { error: "Club already exists" },
        { status: 400 },
      );
    }

    const clubData = {
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      active: body.active !== undefined ? body.active : true,
      memberSequence: body.memberSequence || 0, // Initialize member sequence
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
      body.userName,
    );

    console.log(`✅ Created club: ${body.name}`);

    return NextResponse.json(
      { message: "Club created", club: clubData },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("💥 Error creating club:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// --- PUT: UPDATE CLUB ---
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, userId, userName, reason } = body;

    if (!id) {
      return NextResponse.json({ error: "Club ID required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const oldData = await db.collection("clubs").findOne({ id });

    if (!oldData) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

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
      userName,
    );

    console.log(`✅ Updated club: ${oldData.name}`);

    return NextResponse.json({ message: "Club updated", club: newData });
  } catch (error: any) {
    console.error("💥 Error updating club:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// --- DELETE: REMOVE CLUB ---
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");
    const userName = searchParams.get("userName");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const club = await db.collection("clubs").findOne({ id });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

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
      userName || "Admin",
    );

    console.log(`✅ Deleted club: ${club.name}`);

    return NextResponse.json({ message: "Club deleted successfully" });
  } catch (error: any) {
    console.error("💥 Error deleting club:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
