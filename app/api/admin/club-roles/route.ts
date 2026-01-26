// app/api/admin/club-roles/route.ts
// CRUD operations for club roles

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// GET - List all roles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const category = searchParams.get("category");
    const clubId = searchParams.get("clubId");

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    // Build query
    const query: any = {};
    if (activeOnly) query.isActive = true;
    if (category) query.category = category;
    if (clubId) {
      query.$or = [
        { clubId: clubId },
        { clubId: null }, // Include global roles
      ];
    } else if (clubId === null) {
      query.clubId = null; // Only global roles
    }

    const roles = await db
      .collection("club_roles")
      .find(query)
      .sort({ category: 1, displayOrder: 1 })
      .toArray();

    return NextResponse.json(roles);
  } catch (error: any) {
    console.error("Error fetching roles:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new role
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    // Check for duplicate
    const existing = await db.collection("club_roles").findOne({
      name: body.name,
      clubId: body.clubId || null,
    });

    if (existing) {
      return NextResponse.json(
        { error: "Role with this name already exists" },
        { status: 400 }
      );
    }

    // Generate roleId
    const roleId = `role-${body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}`;

    const newRole = {
      roleId,
      name: body.name,
      description: body.description || "",
      category: body.category || "Support",
      icon: body.icon || "🏑",
      color: body.color || "#3b82f6",
      clubId: body.clubId || null,
      isActive: body.isActive !== false,
      displayOrder: body.displayOrder || 99,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection("club_roles").insertOne(newRole);

    console.log(`✅ Created role: ${newRole.name}`);

    return NextResponse.json(newRole, { status: 201 });
  } catch (error: any) {
    console.error("Error creating role:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update role
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const updateData = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    delete updateData.roleId; // Don't update roleId
    delete updateData._id; // Don't update _id
    delete updateData.usageCount; // Don't update usage count directly

    await db
      .collection("club_roles")
      .updateOne({ roleId: body.roleId }, { $set: updateData });

    const updated = await db.collection("club_roles").findOne({
      roleId: body.roleId,
    });

    console.log(`✅ Updated role: ${body.roleId}`);

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating role:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete role
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get("roleId");

    if (!roleId) {
      return NextResponse.json(
        { error: "roleId is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    // Check if in use
    const inUse = await db.collection("members").findOne({
      roles: roleId,
    });

    if (inUse) {
      return NextResponse.json(
        {
          error: "Cannot delete role that is in use by members",
          inUse: true,
        },
        { status: 400 }
      );
    }

    await db.collection("club_roles").deleteOne({ roleId });

    console.log(`✅ Deleted role: ${roleId}`);

    return NextResponse.json({ success: true, roleId });
  } catch (error: any) {
    console.error("Error deleting role:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
