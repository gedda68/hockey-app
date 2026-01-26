// app/api/admin/global-config/salutations/route.ts
// CRUD operations for global salutations

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// GET - List all salutations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    // Build query
    const query: any = {};
    if (activeOnly) query.isActive = true;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
      ];
    }

    const salutations = await db
      .collection("config_salutations")
      .find(query)
      .sort({ category: 1, displayOrder: 1 })
      .toArray();

    return NextResponse.json(salutations);
  } catch (error: any) {
    console.error("Error fetching salutations:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new salutation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    // Check for duplicate
    const existing = await db.collection("config_salutations").findOne({
      name: body.name,
    });

    if (existing) {
      return NextResponse.json(
        { error: "Salutation with this name already exists" },
        { status: 400 }
      );
    }

    // Generate salutationId
    const salutationId = `sal-${body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}`;

    const newSalutation = {
      salutationId,
      name: body.name,
      fullName: body.fullName || body.name,
      category: body.category || "Other",
      isActive: body.isActive !== false,
      displayOrder: body.displayOrder || 99,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection("config_salutations").insertOne(newSalutation);

    console.log(`✅ Created salutation: ${newSalutation.name}`);

    return NextResponse.json(newSalutation, { status: 201 });
  } catch (error: any) {
    console.error("Error creating salutation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update salutation
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const updateData = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    delete updateData.salutationId; // Don't update salutationId
    delete updateData._id; // Don't update _id
    delete updateData.usageCount; // Don't update usage count directly

    await db
      .collection("config_salutations")
      .updateOne({ salutationId: body.salutationId }, { $set: updateData });

    const updated = await db.collection("config_salutations").findOne({
      salutationId: body.salutationId,
    });

    console.log(`✅ Updated salutation: ${body.salutationId}`);

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating salutation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete salutation
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salutationId = searchParams.get("salutationId");

    if (!salutationId) {
      return NextResponse.json(
        { error: "salutationId is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    // Check if in use
    const inUse = await db.collection("members").findOne({
      "personalInfo.salutation": salutationId,
    });

    if (inUse) {
      return NextResponse.json(
        {
          error: "Cannot delete salutation that is in use",
          inUse: true,
        },
        { status: 400 }
      );
    }

    await db.collection("config_salutations").deleteOne({ salutationId });

    console.log(`✅ Deleted salutation: ${salutationId}`);

    return NextResponse.json({ success: true, salutationId });
  } catch (error: any) {
    console.error("Error deleting salutation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
