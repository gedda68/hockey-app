// app/api/admin/club-membership-types/route.ts
// CRUD operations for club membership types

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// GET - List all membership types
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const category = searchParams.get("category");

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    // Build query
    const query: any = {};
    if (activeOnly) query.isActive = true;
    if (category) query.category = category;

    const types = await db
      .collection("club_membership_types")
      .find(query)
      .sort({ displayOrder: 1 })
      .toArray();

    return NextResponse.json(types);
  } catch (error: any) {
    console.error("Error fetching membership types:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new membership type
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    // Check for duplicate
    const existing = await db.collection("club_membership_types").findOne({
      name: body.name,
    });

    if (existing) {
      return NextResponse.json(
        { error: "Membership type with this name already exists" },
        { status: 400 }
      );
    }

    // Generate typeId
    const typeId = `type-${body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}`;

    const newType = {
      typeId,
      name: body.name,
      description: body.description || "",
      basePrice: body.basePrice || 0,
      ageRange: body.ageRange || { min: 0, max: 999 },
      benefits: body.benefits || [],
      isActive: body.isActive !== false,
      category: body.category || "Playing",
      displayOrder: body.displayOrder || 99,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection("club_membership_types").insertOne(newType);

    console.log(`✅ Created membership type: ${newType.name}`);

    return NextResponse.json(newType, { status: 201 });
  } catch (error: any) {
    console.error("Error creating membership type:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update membership type
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const updateData = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    delete updateData.typeId; // Don't update typeId
    delete updateData._id; // Don't update _id

    await db
      .collection("club_membership_types")
      .updateOne({ typeId: body.typeId }, { $set: updateData });

    const updated = await db.collection("club_membership_types").findOne({
      typeId: body.typeId,
    });

    console.log(`✅ Updated membership type: ${body.typeId}`);

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating membership type:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete membership type
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeId = searchParams.get("typeId");

    if (!typeId) {
      return NextResponse.json(
        { error: "typeId is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    // Check if in use
    const inUse = await db.collection("members").findOne({
      "membership.membershipType": typeId,
    });

    if (inUse) {
      return NextResponse.json(
        {
          error: "Cannot delete membership type that is in use",
          inUse: true,
        },
        { status: 400 }
      );
    }

    await db.collection("club_membership_types").deleteOne({ typeId });

    console.log(`✅ Deleted membership type: ${typeId}`);

    return NextResponse.json({ success: true, typeId });
  } catch (error: any) {
    console.error("Error deleting membership type:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
