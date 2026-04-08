// app/api/admin/config/fee-categories/route.ts
// API for managing fee categories configuration

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";

const DEFAULT_CATEGORIES = [
  "Senior Men",
  "Senior Women",
  "Junior Boys",
  "Junior Girls",
  "Social Membership",
  "Masters Membership",
  "Volunteer",
  "Non Playing",
  "Levies",
  "Equipment",
  "Uniform",
  "Other",
];

export async function GET(request: NextRequest) {
  try {
    const { response: authRes } = await requirePermission(
      request,
      "system.settings",
    );
    if (authRes) return authRes;

    const client = await clientPromise;
    const db = client.db();

    const config = await db
      .collection("config")
      .findOne({ type: "fee-categories" });

    if (config && config.categories) {
      return NextResponse.json(config.categories);
    }

    // Return defaults if no config exists
    return NextResponse.json(DEFAULT_CATEGORIES);
  } catch (error: unknown) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { response: authRes } = await requirePermission(
      request,
      "system.settings",
    );
    if (authRes) return authRes;

    const { categories } = await request.json();

    if (!Array.isArray(categories)) {
      return NextResponse.json(
        { error: "Categories must be an array" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    await db.collection("config").updateOne(
      { type: "fee-categories" },
      {
        $set: {
          categories,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          type: "fee-categories",
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      message: "Fee categories updated successfully",
      categories,
    });
  } catch (error: unknown) {
    console.error("Error updating categories:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
