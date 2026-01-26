// app/api/admin/relationship-types/route.ts
// CRUD operations for relationship types

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// GET - List all relationship types
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
      .collection("relationship_types")
      .find(query)
      .sort({ category: 1, displayOrder: 1 })
      .toArray();

    return NextResponse.json(types);
  } catch (error: any) {
    console.error("Error fetching relationship types:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new relationship type
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    // Check for duplicate
    const existing = await db.collection("relationship_types").findOne({
      forward: body.forward,
      reverse: body.reverse,
    });

    if (existing) {
      return NextResponse.json(
        { error: "Relationship type with this combination already exists" },
        { status: 400 }
      );
    }

    // Generate typeId
    const typeId =
      `reltype-${body.forward.toLowerCase()}-${body.reverse.toLowerCase()}`.replace(
        /[^a-z0-9-]/g,
        "-"
      );

    const newType = {
      typeId,
      forward: body.forward,
      reverse: body.reverse,
      category: body.category || "Other",
      isActive: body.isActive !== false,
      displayOrder: body.displayOrder || 99,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection("relationship_types").insertOne(newType);

    console.log(
      `✅ Created relationship type: ${newType.forward} ↔ ${newType.reverse}`
    );

    return NextResponse.json(newType, { status: 201 });
  } catch (error: any) {
    console.error("Error creating relationship type:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update relationship type
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
      .collection("relationship_types")
      .updateOne({ typeId: body.typeId }, { $set: updateData });

    const updated = await db.collection("relationship_types").findOne({
      typeId: body.typeId,
    });

    console.log(`✅ Updated relationship type: ${body.typeId}`);

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating relationship type:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete relationship type
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
      "familyRelationships.relationshipType": typeId,
    });

    if (inUse) {
      return NextResponse.json(
        {
          error: "Cannot delete relationship type that is in use",
          inUse: true,
        },
        { status: 400 }
      );
    }

    await db.collection("relationship_types").deleteOne({ typeId });

    console.log(`✅ Deleted relationship type: ${typeId}`);

    return NextResponse.json({ success: true, typeId });
  } catch (error: any) {
    console.error("Error deleting relationship type:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
