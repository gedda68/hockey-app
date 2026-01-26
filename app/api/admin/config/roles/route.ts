// app/api/admin/config/roles/route.ts
// CRUD API for member_roles (enhanced for config management)

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// GET - List all roles
export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const category = searchParams.get("category");
    const clubId = searchParams.get("clubId");

    const query: any = {};

    if (activeOnly) {
      query.active = true;
    }

    if (category) {
      query.category = category;
    }

    if (clubId) {
      // Get club-specific or global roles
      query.$or = [{ clubId: clubId }, { clubId: null }];
    }

    const roles = await db
      .collection("member_roles")
      .find(query)
      .sort({ displayOrder: 1, name: 1 })
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
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!body.category) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }

    // Check for duplicate
    const existing = await db.collection("member_roles").findOne({
      name: { $regex: new RegExp(`^${body.name}$`, "i") },
      clubId: body.clubId || null,
    });

    if (existing) {
      return NextResponse.json(
        { error: "This role already exists" },
        { status: 409 }
      );
    }

    const roleId = `role-${body.name
      .toLowerCase()
      .replace(/\s+/g, "-")}-${Math.random().toString(36).substr(2, 6)}`;

    const lastRole = await db
      .collection("member_roles")
      .find()
      .sort({ displayOrder: -1 })
      .limit(1)
      .toArray();

    const nextOrder = lastRole.length > 0 ? lastRole[0].displayOrder + 1 : 100;

    const role = {
      roleId,
      name: body.name,
      description: body.description || "",
      category: body.category,
      clubId: body.clubId || null,
      icon: body.icon || "👤",
      color: body.color || "#6b7280",
      defaultPermissions: body.defaultPermissions || [],
      active: body.active !== false,
      displayOrder: body.displayOrder || nextOrder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: body.createdBy || "admin",
    };

    await db.collection("member_roles").insertOne(role);

    console.log(`✅ Created role: ${role.name} (${roleId})`);

    return NextResponse.json(role, { status: 201 });
  } catch (error: any) {
    console.error("Error creating role:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update role
export async function PUT(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const body = await request.json();

    if (!body.roleId) {
      return NextResponse.json(
        { error: "roleId is required" },
        { status: 400 }
      );
    }

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.displayOrder !== undefined)
      updateData.displayOrder = body.displayOrder;
    if (body.defaultPermissions !== undefined)
      updateData.defaultPermissions = body.defaultPermissions;

    const result = await db
      .collection("member_roles")
      .updateOne({ roleId: body.roleId }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const updated = await db
      .collection("member_roles")
      .findOne({ roleId: body.roleId });

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
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get("id");

    if (!roleId) {
      return NextResponse.json(
        { error: "roleId is required" },
        { status: 400 }
      );
    }

    // Check if role is in use
    const usageCount = await db.collection("members").countDocuments({
      roles: roleId,
    });

    if (usageCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: This role is assigned to ${usageCount} member(s)`,
          usageCount,
        },
        { status: 409 }
      );
    }

    const result = await db.collection("member_roles").deleteOne({ roleId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    console.log(`✅ Deleted role: ${roleId}`);

    return NextResponse.json({
      success: true,
      roleId,
      deleted: true,
    });
  } catch (error: any) {
    console.error("Error deleting role:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
