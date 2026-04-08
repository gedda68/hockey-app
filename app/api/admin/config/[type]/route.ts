// app/api/admin/config/[type]/route.ts
// Unified API - Next.js 15 Compatible with Member Roles & Membership Types

import { NextRequest, NextResponse } from "next/server";
import { ObjectId, type Document } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";

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

/**
 * Normalize config rows for the admin UI.
 * `member_roles` often uses `roleId` + `active` (see config/roles/route.ts), not `id` / `isActive`.
 */
function serializeConfigItem(doc: Document): Record<string, unknown> {
  const plain = doc as unknown as Record<string, unknown>;
  const _id = plain._id;
  const _idStr = _id != null ? String(_id) : "";
  const idStr =
    typeof plain.id === "string" && plain.id.trim() !== ""
      ? plain.id
      : typeof plain.roleId === "string" && plain.roleId.trim() !== ""
        ? plain.roleId
        : _idStr;
  const isActive = Boolean(plain.isActive ?? plain.active ?? true);
  return {
    ...plain,
    _id: _idStr || undefined,
    id: idStr,
    isActive,
  };
}

async function findItemByLogicalId(
  collection: import("mongodb").Collection<Document>,
  logicalId: string,
): Promise<Document | null> {
  const byCustomId = await collection.findOne({ id: logicalId });
  if (byCustomId) return byCustomId;
  const byRoleId = await collection.findOne({ roleId: logicalId });
  if (byRoleId) return byRoleId;
  if (ObjectId.isValid(logicalId)) {
    try {
      return await collection.findOne({ _id: new ObjectId(logicalId) });
    } catch {
      return null;
    }
  }
  return null;
}

// GET - List all items of a type
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ type: string }> },
) {
  try {
    const { type } = await context.params;

    const { response: authRes } = await requirePermission(
      request,
      "system.settings",
    );
    if (authRes) return authRes;

    const mapping =
      CONFIG_TYPE_MAPPING[type as keyof typeof CONFIG_TYPE_MAPPING];
    if (!mapping) {
      return NextResponse.json(
        { error: "Invalid configuration type" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();


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


    return NextResponse.json(
      items.map((doc) => serializeConfigItem(doc as Document)),
    );
  } catch (error: unknown) {
    console.error("💥 Error fetching config items:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// POST - Create new item
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ type: string }> },
) {
  try {
    const { type } = await context.params;

    const { response: authRes } = await requirePermission(
      request,
      "system.settings",
    );
    if (authRes) return authRes;

    const mapping =
      CONFIG_TYPE_MAPPING[type as keyof typeof CONFIG_TYPE_MAPPING];
    if (!mapping) {
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

    // Get next display order
    const lastItem = await db
      .collection(mapping.collection)
      .findOne(mapping.configType ? { configType: mapping.configType } : {}, {
        sort: { displayOrder: -1 },
      });

    const newItem: Record<string, unknown> = {
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

    return NextResponse.json({
      message: "Item created successfully",
      item: newItem,
    });
  } catch (error: unknown) {
    console.error("💥 Error creating:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// PUT - Update item
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ type: string }> },
) {
  try {
    const { type } = await context.params;

    const { response: authRes } = await requirePermission(
      request,
      "system.settings",
    );
    if (authRes) return authRes;

    const mapping =
      CONFIG_TYPE_MAPPING[type as keyof typeof CONFIG_TYPE_MAPPING];
    if (!mapping) {
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

    const coll = db.collection(mapping.collection);
    const item = await findItemByLogicalId(coll, body.id);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: "system",
    };

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.code !== undefined) updateData.code = body.code?.trim() || null;
    if (body.description !== undefined)
      updateData.description = body.description?.trim() || null;
    if (body.isActive !== undefined) {
      if (mapping.collection === "member_roles") {
        updateData.active = body.isActive;
      } else {
        updateData.isActive = body.isActive;
      }
    }
    if (body.displayOrder !== undefined)
      updateData.displayOrder = body.displayOrder;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.annualFee !== undefined)
      updateData.annualFee = parseFloat(body.annualFee) || 0;

    await coll.updateOne({ _id: item._id }, { $set: updateData });

    return NextResponse.json({
      message: "Item updated successfully",
    });
  } catch (error: unknown) {
    console.error("💥 Error updating:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// DELETE - Delete item
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ type: string }> },
) {
  try {
    const { type } = await context.params;

    const { response: authRes } = await requirePermission(
      request,
      "system.settings",
    );
    if (authRes) return authRes;

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


    if (!id) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const coll = db.collection(mapping.collection);
    const item = await findItemByLogicalId(coll, id);

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

    await coll.deleteOne({ _id: item._id });

    return NextResponse.json({
      message: "Item deleted successfully",
    });
  } catch (error: unknown) {
    console.error("💥 Error deleting:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
