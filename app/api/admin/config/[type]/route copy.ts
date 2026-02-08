// app/api/admin/config/[type]/route.ts
// Unified API for all global configuration types - Single Collection Approach

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";

// Single collection name
const COLLECTION_NAME = "config";

// Valid configuration types
const VALID_CONFIG_TYPES = [
  "gender",
  "relationship-type",
  "salutation",
  "fee-category",
  "role-type",
  "position",
  "skill-level",
  "membership-type",
];

// Generate ID
const generateId = (type: string) => {
  return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// GET - List all items of a type
export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } },
) {
  const { user, response } = await requirePermission(request, "system.config");
  if (response) return response;

  try {
    const { type } = params;

    if (!VALID_CONFIG_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "Invalid configuration type" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Query single collection with configType filter
    const items = await db
      .collection(COLLECTION_NAME)
      .find({ configType: type })
      .sort({ displayOrder: 1, name: 1 })
      .toArray();

    console.log(
      `Loaded ${items.length} items of type "${type}" from unified config collection`,
    );
    return NextResponse.json(items);
  } catch (error: any) {
    console.error("Error fetching config items:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new item
export async function POST(
  request: NextRequest,
  { params }: { params: { type: string } },
) {
  const { user, response } = await requirePermission(request, "system.config");
  if (response) return response;

  try {
    const { type } = params;

    if (!VALID_CONFIG_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "Invalid configuration type" },
        { status: 400 },
      );
    }

    const body = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Check for duplicate name within the same type
    const existing = await db.collection(COLLECTION_NAME).findOne({
      configType: type,
      name: body.name.trim(),
    });

    if (existing) {
      return NextResponse.json(
        { error: "An item with this name already exists" },
        { status: 400 },
      );
    }

    // Get next display order for this type
    const lastItem = await db
      .collection(COLLECTION_NAME)
      .findOne({ configType: type }, { sort: { displayOrder: -1 } });

    const newItem = {
      configType: type, // ← Key field for single collection
      id: generateId(type),
      name: body.name.trim(),
      code: body.code?.trim() || null,
      description: body.description?.trim() || null,
      isActive: body.isActive !== undefined ? body.isActive : true,
      displayOrder: (lastItem?.displayOrder || 0) + 1,
      usageCount: 0,
      lastUsed: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: user.userId,
      updatedBy: null,
    };

    await db.collection(COLLECTION_NAME).insertOne(newItem);

    console.log(`Created config item: ${newItem.id} of type "${type}"`);
    return NextResponse.json({
      message: "Item created successfully",
      item: newItem,
    });
  } catch (error: any) {
    console.error("Error creating config item:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update item
export async function PUT(
  request: NextRequest,
  { params }: { params: { type: string } },
) {
  const { user, response } = await requirePermission(request, "system.config");
  if (response) return response;

  try {
    const { type } = params;

    if (!VALID_CONFIG_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "Invalid configuration type" },
        { status: 400 },
      );
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Check if item exists (query by id only, configType is implicit)
    const item = await db.collection(COLLECTION_NAME).findOne({ id: body.id });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Verify item belongs to the correct type
    if (item.configType !== type) {
      return NextResponse.json(
        { error: "Item does not belong to this configuration type" },
        { status: 400 },
      );
    }

    // If updating name, check for duplicates within the same type
    if (body.name && body.name.trim() !== item.name) {
      const duplicate = await db.collection(COLLECTION_NAME).findOne({
        configType: type,
        name: body.name.trim(),
        id: { $ne: body.id },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "An item with this name already exists" },
          { status: 400 },
        );
      }
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
      updatedBy: user.userId,
    };

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.code !== undefined) updateData.code = body.code?.trim() || null;
    if (body.description !== undefined)
      updateData.description = body.description?.trim() || null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.displayOrder !== undefined)
      updateData.displayOrder = body.displayOrder;

    await db
      .collection(COLLECTION_NAME)
      .updateOne({ id: body.id }, { $set: updateData });

    console.log(`Updated config item: ${body.id}`);
    return NextResponse.json({
      message: "Item updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating config item:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { type: string } },
) {
  const { user, response } = await requirePermission(request, "system.config");
  if (response) return response;

  try {
    const { type } = params;

    if (!VALID_CONFIG_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "Invalid configuration type" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Check if item exists
    const item = await db.collection(COLLECTION_NAME).findOne({ id });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Verify item belongs to the correct type
    if (item.configType !== type) {
      return NextResponse.json(
        { error: "Item does not belong to this configuration type" },
        { status: 400 },
      );
    }

    // Check if item is in use
    if (item.usageCount && item.usageCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete. This item is used in ${item.usageCount} record(s)`,
        },
        { status: 400 },
      );
    }

    await db.collection(COLLECTION_NAME).deleteOne({ id });

    console.log(`Deleted config item: ${id}`);
    return NextResponse.json({
      message: "Item deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting config item:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
