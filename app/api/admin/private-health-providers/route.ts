// app/api/admin/private-health-providers/route.ts
// CRUD operations for private health providers

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// GET - List all private health providers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const category = searchParams.get("category");

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    // Build query
    const query: any = {};
    if (activeOnly) query.isActive = true;
    if (category) query.category = category;

    const providers = await db
      .collection("private_health_providers")
      .find(query)
      .sort({ displayOrder: 1 })
      .toArray();

    return NextResponse.json(providers);
  } catch (error: any) {
    console.error("Error fetching health providers:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new provider
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    // Check for duplicate
    const existing = await db.collection("private_health_providers").findOne({
      name: body.name,
    });

    if (existing) {
      return NextResponse.json(
        { error: "Provider with this name already exists" },
        { status: 400 }
      );
    }

    // Generate providerId
    const providerId = `provider-${body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}`;

    const newProvider = {
      providerId,
      name: body.name,
      shortName: body.shortName || body.name,
      phone: body.phone || "",
      website: body.website || "",
      category: body.category || "Other",
      isActive: body.isActive !== false,
      displayOrder: body.displayOrder || 99,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection("private_health_providers").insertOne(newProvider);

    console.log(`✅ Created health provider: ${newProvider.name}`);

    return NextResponse.json(newProvider, { status: 201 });
  } catch (error: any) {
    console.error("Error creating health provider:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update provider
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const updateData = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    delete updateData.providerId; // Don't update providerId
    delete updateData._id; // Don't update _id

    await db
      .collection("private_health_providers")
      .updateOne({ providerId: body.providerId }, { $set: updateData });

    const updated = await db.collection("private_health_providers").findOne({
      providerId: body.providerId,
    });

    console.log(`✅ Updated health provider: ${body.providerId}`);

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating health provider:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete provider
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");

    if (!providerId) {
      return NextResponse.json(
        { error: "providerId is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    // Check if in use
    const inUse = await db.collection("members").findOne({
      "healthcare.privateHealth.provider": providerId,
    });

    if (inUse) {
      return NextResponse.json(
        {
          error: "Cannot delete provider that is in use",
          inUse: true,
        },
        { status: 400 }
      );
    }

    await db.collection("private_health_providers").deleteOne({ providerId });

    console.log(`✅ Deleted health provider: ${providerId}`);

    return NextResponse.json({ success: true, providerId });
  } catch (error: any) {
    console.error("Error deleting health provider:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
