// app/api/admin/config/relationships/route.ts
// CRUD API for config_relationships

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// GET - List all relationships
export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const query = activeOnly ? { isActive: true } : {};

    const relationships = await db
      .collection("config_relationships")
      .find(query)
      .sort({ displayOrder: 1, name: 1 })
      .toArray();

    return NextResponse.json(relationships);
  } catch (error: any) {
    console.error("Error fetching relationships:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new relationship
export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Generate ID
    const relationshipId = `rel-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Get next display order
    const lastRelationship = await db
      .collection("config_relationships")
      .find()
      .sort({ displayOrder: -1 })
      .limit(1)
      .toArray();

    const nextOrder =
      lastRelationship.length > 0 ? lastRelationship[0].displayOrder + 1 : 1;

    const relationship = {
      relationshipId,
      name: body.name,
      category: body.category || "Other",
      isActive: body.isActive !== false,
      displayOrder: body.displayOrder || nextOrder,
      usageCount: 0,
      lastUsed: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: body.createdBy || "admin",
    };

    await db.collection("config_relationships").insertOne(relationship);

    console.log(
      `✅ Created relationship: ${relationship.name} (${relationshipId})`
    );

    return NextResponse.json(relationship, { status: 201 });
  } catch (error: any) {
    console.error("Error creating relationship:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update relationship
export async function PUT(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const body = await request.json();

    if (!body.relationshipId) {
      return NextResponse.json(
        { error: "relationshipId is required" },
        { status: 400 }
      );
    }

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.displayOrder !== undefined)
      updateData.displayOrder = body.displayOrder;

    const result = await db
      .collection("config_relationships")
      .updateOne({ relationshipId: body.relationshipId }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Relationship not found" },
        { status: 404 }
      );
    }

    const updated = await db
      .collection("config_relationships")
      .findOne({ relationshipId: body.relationshipId });

    console.log(`✅ Updated relationship: ${body.relationshipId}`);

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating relationship:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete relationship
export async function DELETE(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const { searchParams } = new URL(request.url);
    const relationshipId = searchParams.get("id");

    if (!relationshipId) {
      return NextResponse.json(
        { error: "relationshipId is required" },
        { status: 400 }
      );
    }

    // Check if relationship is in use
    const usageCount = await db.collection("members").countDocuments({
      "emergencyContacts.relationship": relationshipId,
    });

    if (usageCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: This relationship is used by ${usageCount} member(s)`,
          usageCount,
        },
        { status: 409 }
      );
    }

    const result = await db
      .collection("config_relationships")
      .deleteOne({ relationshipId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Relationship not found" },
        { status: 404 }
      );
    }

    console.log(`✅ Deleted relationship: ${relationshipId}`);

    return NextResponse.json({
      success: true,
      relationshipId,
      deleted: true,
    });
  } catch (error: any) {
    console.error("Error deleting relationship:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
