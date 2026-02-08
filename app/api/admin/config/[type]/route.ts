// app/api/admin/config/[type]/route.ts
// Unified API - Next.js 15 Compatible with Member Roles & Membership Types

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// Single collection name
const COLLECTION_NAME = "config";

// Valid configuration types - maps URL types to collection names
const CONFIG_TYPE_MAPPING = {
  gender: { collection: "config", configType: "gender" },
  "relationship-type": {
    collection: "config",
    configType: "relationship-type",
  },
  salutation: { collection: "config", configType: "salutation" },
  "fee-category": { collection: "config", configType: "fee-category" },
  "role-type": { collection: "config", configType: "role-type" },
  position: { collection: "config", configType: "position" },
  "skill-level": { collection: "config", configType: "skill-level" },
  "membership-type": { collection: "membership_types", configType: null },
  "member-role": { collection: "member_roles", configType: null },
};

// Generate ID
const generateId = (type: string) => {
  return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// GET - List all items of a type
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ type: string }> },
) {
  try {
    const { type } = await context.params;

    console.log("🔍 GET request for type:", type);

    const mapping =
      CONFIG_TYPE_MAPPING[type as keyof typeof CONFIG_TYPE_MAPPING];
    if (!mapping) {
      console.log("❌ Invalid type:", type);
      return NextResponse.json(
        { error: "Invalid configuration type" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    console.log("📊 Querying collection:", mapping.collection);

    let items;
    if (mapping.configType) {
      // Unified config collection
      items = await db
        .collection(mapping.collection)
        .find({ configType: mapping.configType })
        .sort({ displayOrder: 1, name: 1 })
        .toArray();
    } else {
      // Separate collection (member_roles, membership_types)
      items = await db
        .collection(mapping.collection)
        .find({})
        .sort({ displayOrder: 1, name: 1 })
        .toArray();
    }

    console.log(`✅ Loaded ${items.length} items of type "${type}"`);

    return NextResponse.json(items);
  } catch (error: any) {
    console.error("💥 Error fetching config items:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new item
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ type: string }> },
) {
  try {
    const { type } = await context.params;

    console.log("➕ POST request for type:", type);

    const mapping =
      CONFIG_TYPE_MAPPING[type as keyof typeof CONFIG_TYPE_MAPPING];
    if (!mapping) {
      return NextResponse.json(
        { error: "Invalid configuration type" },
        { status: 400 },
      );
    }

    const body = await request.json();
    console.log("📦 Body:", body);

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Get next display order
    const lastItem = await db
      .collection(mapping.collection)
      .findOne(mapping.configType ? { configType: mapping.configType } : {}, {
        sort: { displayOrder: -1 },
      });

    const newItem: any = {
      id: generateId(type),
      name: body.name.trim(),
      description: body.description?.trim() || null,
      isActive: body.isActive !== undefined ? body.isActive : true,
      displayOrder: (lastItem?.displayOrder || 0) + 1,
      usageCount: 0,
      lastUsed: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "system",
      updatedBy: null,
    };

    // Add type-specific fields
    if (mapping.configType) {
      newItem.configType = mapping.configType;
    }

    if (body.code !== undefined) newItem.code = body.code?.trim() || null;
    if (body.category !== undefined) newItem.category = body.category;
    if (body.annualFee !== undefined)
      newItem.annualFee = parseFloat(body.annualFee) || 0;
    if (body.currency !== undefined) newItem.currency = body.currency || "AUD";

    await db.collection(mapping.collection).insertOne(newItem);

    console.log(`✅ Created: ${newItem.id}`);
    return NextResponse.json({
      message: "Item created successfully",
      item: newItem,
    });
  } catch (error: any) {
    console.error("💥 Error creating:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update item
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ type: string }> },
) {
  try {
    const { type } = await context.params;

    console.log("✏️ PUT request for type:", type);

    const mapping =
      CONFIG_TYPE_MAPPING[type as keyof typeof CONFIG_TYPE_MAPPING];
    if (!mapping) {
      return NextResponse.json(
        { error: "Invalid configuration type" },
        { status: 400 },
      );
    }

    const body = await request.json();
    console.log("📦 Body:", body);

    if (!body.id) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const item = await db
      .collection(mapping.collection)
      .findOne({ id: body.id });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const updateData: any = {
      updatedAt: new Date(),
      updatedBy: "system",
    };

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.code !== undefined) updateData.code = body.code?.trim() || null;
    if (body.description !== undefined)
      updateData.description = body.description?.trim() || null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.displayOrder !== undefined)
      updateData.displayOrder = body.displayOrder;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.annualFee !== undefined)
      updateData.annualFee = parseFloat(body.annualFee) || 0;

    await db
      .collection(mapping.collection)
      .updateOne({ id: body.id }, { $set: updateData });

    console.log(`✅ Updated: ${body.id}`);
    return NextResponse.json({
      message: "Item updated successfully",
    });
  } catch (error: any) {
    console.error("💥 Error updating:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete item
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ type: string }> },
) {
  try {
    const { type } = await context.params;

    console.log("🗑️ DELETE request for type:", type);

    const mapping =
      CONFIG_TYPE_MAPPING[type as keyof typeof CONFIG_TYPE_MAPPING];
    if (!mapping) {
      return NextResponse.json(
        { error: "Invalid configuration type" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    console.log("🗑️ Deleting ID:", id);

    if (!id) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const item = await db.collection(mapping.collection).findOne({ id });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.usageCount && item.usageCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete. This item is used in ${item.usageCount} record(s)`,
        },
        { status: 400 },
      );
    }

    await db.collection(mapping.collection).deleteOne({ id });

    console.log(`✅ Deleted: ${id}`);
    return NextResponse.json({
      message: "Item deleted successfully",
    });
  } catch (error: any) {
    console.error("💥 Error deleting:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
