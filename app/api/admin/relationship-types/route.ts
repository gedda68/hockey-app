// app/api/admin/relationship-types/route.ts
// API for managing relationship types (Parent, Sibling, Friend, etc.)

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { escapeRegex } from "@/lib/utils/regex";

// GET - Fetch all relationship types
export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();

    console.log("📋 Fetching relationship types...");

    // Fetch all relationship types, sorted by category then name
    const relationshipTypes = await db
      .collection("relationshipTypes")
      .find({})
      .sort({ category: 1, name: 1 })
      .toArray();

    // Remove MongoDB _id for cleaner response
    const cleanedTypes = relationshipTypes.map(({ _id, ...rest }) => rest);

    console.log(`✅ Found ${cleanedTypes.length} relationship types`);

    return NextResponse.json({
      relationshipTypes: cleanedTypes,
      count: cleanedTypes.length,
    });
  } catch (error: any) {
    console.error("❌ Error fetching relationship types:", error);
    return NextResponse.json(
      {
        error: error.message,
        relationshipTypes: [], // Return empty array on error
      },
      { status: 500 },
    );
  }
}

// POST - Create new relationship type
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Check if relationship type already exists
    const existing = await db
      .collection("relationshipTypes")
      .findOne({ name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") } });

    if (existing) {
      return NextResponse.json(
        { error: "Relationship type already exists" },
        { status: 400 },
      );
    }

    const relationshipType = {
      id: `rel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      category: category || "other",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection("relationshipTypes").insertOne(relationshipType);

    console.log(`✅ Created relationship type: ${name}`);

    // Remove _id before returning
    const { _id, ...cleanedType } = relationshipType as any;

    return NextResponse.json(
      {
        message: "Relationship type created",
        relationshipType: cleanedType,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("❌ Error creating relationship type:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update relationship type
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, category } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: "ID and name are required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("relationshipTypes").updateOne(
      { id },
      {
        $set: {
          name: name.trim(),
          category: category || "other",
          updatedAt: new Date().toISOString(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Relationship type not found" },
        { status: 404 },
      );
    }

    console.log(`✅ Updated relationship type: ${id}`);

    return NextResponse.json({
      message: "Relationship type updated",
    });
  } catch (error: any) {
    console.error("❌ Error updating relationship type:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete relationship type
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("relationshipTypes").deleteOne({ id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Relationship type not found" },
        { status: 404 },
      );
    }

    console.log(`✅ Deleted relationship type: ${id}`);

    return NextResponse.json({
      message: "Relationship type deleted",
    });
  } catch (error: any) {
    console.error("❌ Error deleting relationship type:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
