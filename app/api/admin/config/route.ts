// app/api/admin/config/route.ts
// API endpoint to fetch configuration items

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const configType = searchParams.get("configType");

    const client = await clientPromise;
    const db = client.db("hockey-app"); // Replace with your database name
    const collection = db.collection("config");

    // Build query filter
    const filter: any = {};

    if (activeOnly) {
      filter.isActive = true;
    }

    if (configType) {
      filter.configType = configType;
    }

    // Fetch config items, sorted by configType and displayOrder
    const configItems = await collection
      .find(filter)
      .sort({ configType: 1, displayOrder: 1 })
      .toArray();

    return NextResponse.json(configItems);
  } catch (error) {
    console.error("Error fetching config items:", error);
    return NextResponse.json(
      { error: "Failed to fetch config items" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const client = await clientPromise;
    const db = client.db("hockey-app"); // Replace with your database name
    const collection = db.collection("config");

    // Validate required fields
    if (!body.configType || !body.id || !body.name) {
      return NextResponse.json(
        { error: "configType, id, and name are required" },
        { status: 400 },
      );
    }

    // Create new config item matching your schema
    const newConfig = {
      configType: body.configType,
      id: body.id,
      name: body.name,
      code: body.code || null,
      description: body.description || null,
      isActive: body.isActive !== undefined ? body.isActive : true,
      displayOrder: body.displayOrder || 0,
      usageCount: 0,
      lastUsed: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: body.createdBy || "system",
      updatedBy: null,
      clubId: body.clubId || null,
      // Include any additional type-specific fields
      ...(body.icon && { icon: body.icon }),
      ...(body.color && { color: body.color }),
      ...(body.category && { category: body.category }),
      ...(body.defaultPermissions && {
        defaultPermissions: body.defaultPermissions,
      }),
      ...(body.phone && { phone: body.phone }),
      ...(body.website && { website: body.website }),
      ...(body.shortName && { shortName: body.shortName }),
    };

    const result = await collection.insertOne(newConfig);

    return NextResponse.json(
      { _id: result.insertedId, ...newConfig },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating config item:", error);
    return NextResponse.json(
      { error: "Failed to create config item" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { _id, ...updates } = body;

    if (!_id) {
      return NextResponse.json({ error: "_id is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("hockey-app"); // Replace with your database name
    const collection = db.collection("config");

    // Import ObjectId for MongoDB
    const { ObjectId } = await import("mongodb");

    const result = await collection.updateOne(
      { _id: new ObjectId(_id) },
      {
        $set: {
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Config item not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating config item:", error);
    return NextResponse.json(
      { error: "Failed to update config item" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const _id = searchParams.get("_id");

    if (!_id) {
      return NextResponse.json({ error: "_id is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("hockey-app"); // Replace with your database name
    const collection = db.collection("config");

    // Import ObjectId for MongoDB
    const { ObjectId } = await import("mongodb");

    const result = await collection.deleteOne({ _id: new ObjectId(_id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Config item not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting config item:", error);
    return NextResponse.json(
      { error: "Failed to delete config item" },
      { status: 500 },
    );
  }
}
