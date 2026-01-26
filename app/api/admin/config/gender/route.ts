// app/api/admin/config/gender/route.ts
// CRUD API for config_gender

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// GET - List all gender options
export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const query = activeOnly ? { isActive: true } : {};

    const genders = await db
      .collection("config_genders")
      .find(query)
      .sort({ displayOrder: 1, name: 1 })
      .toArray();

    return NextResponse.json(genders);
  } catch (error: any) {
    console.error("Error fetching genders:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new gender option
export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check for duplicate
    const existing = await db.collection("config_gender").findOne({
      name: { $regex: new RegExp(`^${body.name}$`, "i") },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This gender option already exists" },
        { status: 409 }
      );
    }

    const genderId = `gender-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const lastGender = await db
      .collection("config_gender")
      .find()
      .sort({ displayOrder: -1 })
      .limit(1)
      .toArray();

    const nextOrder =
      lastGender.length > 0 ? lastGender[0].displayOrder + 1 : 1;

    const gender = {
      genderId,
      name: body.name,
      isActive: body.isActive !== false,
      displayOrder: body.displayOrder || nextOrder,
      usageCount: 0,
      lastUsed: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: body.createdBy || "admin",
    };

    await db.collection("config_gender").insertOne(gender);

    console.log(`✅ Created gender option: ${gender.name}`);

    return NextResponse.json(gender, { status: 201 });
  } catch (error: any) {
    console.error("Error creating gender:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update gender option
export async function PUT(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const body = await request.json();

    if (!body.genderId) {
      return NextResponse.json(
        { error: "genderId is required" },
        { status: 400 }
      );
    }

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.displayOrder !== undefined)
      updateData.displayOrder = body.displayOrder;

    const result = await db
      .collection("config_gender")
      .updateOne({ genderId: body.genderId }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Gender option not found" },
        { status: 404 }
      );
    }

    const updated = await db
      .collection("config_gender")
      .findOne({ genderId: body.genderId });

    console.log(`✅ Updated gender: ${body.genderId}`);

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating gender:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete gender option
export async function DELETE(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const { searchParams } = new URL(request.url);
    const genderId = searchParams.get("id");

    if (!genderId) {
      return NextResponse.json(
        { error: "genderId is required" },
        { status: 400 }
      );
    }

    // Check if in use
    const usageCount = await db.collection("members").countDocuments({
      "personalInfo.gender": genderId,
    });

    if (usageCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: This gender option is used by ${usageCount} member(s)`,
          usageCount,
        },
        { status: 409 }
      );
    }

    const result = await db.collection("config_gender").deleteOne({ genderId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Gender option not found" },
        { status: 404 }
      );
    }

    console.log(`✅ Deleted gender: ${genderId}`);

    return NextResponse.json({
      success: true,
      genderId,
      deleted: true,
    });
  } catch (error: any) {
    console.error("Error deleting gender:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
