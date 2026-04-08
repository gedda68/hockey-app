// app/api/admin/divisions/route.ts
// Get divisions by category from database

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";

export async function GET(request: NextRequest) {
  try {
    const { response: authRes } = await requirePermission(
      request,
      "competitions.manage",
    );
    if (authRes) return authRes;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    if (!category) {
      return NextResponse.json(
        { error: "Category parameter is required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Fetch divisions for this category from the divisions collection
    const divisionsDoc = await db.collection("divisions").findOne({ category });

    if (divisionsDoc && divisionsDoc.divisions) {
      return NextResponse.json({
        category,
        divisions: divisionsDoc.divisions,
      });
    }

    // Fallback to default divisions if not in database
    const defaultDivisions = getDefaultDivisions(category);

    return NextResponse.json({
      category,
      divisions: defaultDivisions,
    });
  } catch (error: unknown) {
    console.error("Error fetching divisions:", error);
    return NextResponse.json(
      { error: "Failed to fetch divisions" },
      { status: 500 },
    );
  }
}

// Fallback default divisions
function getDefaultDivisions(category: string): string[] {
  switch (category) {
    case "junior":
      return ["U6", "U8", "U10", "U12", "U14", "U16", "U18"];
    case "senior":
      return [
        "Open",
        "Premier",
        "Division 1",
        "Division 2",
        "Division 3",
        "BHL1",
        "BHL2",
        "BHL3",
        "BHL4",
        "BHL5",
        "BHL6",
        "BHL7",
      ];
    case "masters":
      return ["O35", "O40", "O45", "O50", "O55", "O60", "O65"];
    case "social":
      return ["Mixed Social", "Recreational"];
    default:
      return [];
  }
}

// POST - Create or update divisions for a category
export async function POST(request: NextRequest) {
  try {
    const { response: authRes } = await requirePermission(
      request,
      "competitions.manage",
    );
    if (authRes) return authRes;

    const body = await request.json();
    const { category, divisions } = body;

    if (!category || !divisions || !Array.isArray(divisions)) {
      return NextResponse.json(
        { error: "Category and divisions array are required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Upsert the divisions configuration
    await db.collection("divisions").updateOne(
      { category },
      {
        $set: {
          category,
          divisions,
          lastUpdated: new Date().toISOString(),
        },
      },
      { upsert: true },
    );

    return NextResponse.json({
      success: true,
      category,
      divisions,
    });
  } catch (error: unknown) {
    console.error("Error saving divisions:", error);
    return NextResponse.json(
      { error: "Failed to save divisions" },
      { status: 500 },
    );
  }
}
