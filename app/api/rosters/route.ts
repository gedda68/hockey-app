//app/api/rosters/route.ts

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// Helper to extract numbers for sorting (e.g., "Under 12" -> 12)
const getNumericAge = (s: string) => parseInt(s.replace(/\D/g, "")) || 999;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const selectedYear = searchParams.get("year");

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // 1. Fetch ALL documents (metadata only) to determine available seasons
    const allMetadata = await db
      .collection("rosters")
      .find({}, { projection: { ageGroup: 1, season: 1, _id: 0 } })
      .toArray();

    // 2. Get unique seasons and sort Descending (2026, 2025...)
    const seasons = Array.from(new Set(allMetadata.map((r) => r.season)))
      .filter(Boolean)
      .sort((a, b) => parseInt(b || "0") - parseInt(a || "0"));

    // 3. Determine the target year (Default to latest season or current year)
    const targetYear =
      selectedYear || seasons[0] || new Date().getFullYear().toString();

    // 4. Fetch the FULL roster data for the specific target year
    const fullRosters = await db
      .collection("rosters")
      .find({ season: targetYear })
      .toArray();

    // 5. Sort the rosters by age group number
    const sortedRosters = fullRosters.sort(
      (a, b) => getNumericAge(a.ageGroup) - getNumericAge(b.ageGroup)
    );

    // 6. Build a list of available age groups for navigation (metadata)
    const ageGroupList = sortedRosters.map((r) => r.ageGroup);

    console.log(
      `[Public API] Serving ${sortedRosters.length} rosters for ${targetYear}`
    );

    return NextResponse.json(
      {
        seasons,
        ageGroups: ageGroupList,
        rosters: sortedRosters, // The public page.tsx needs this full array
        selectedYear: targetYear,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=59",
        },
      }
    );
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch rosters" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("hockey-app");
    const body = await request.json();

    const { ageGroup, season, ...otherData } = body;

    // Validation
    if (!ageGroup || !season) {
      return NextResponse.json(
        { error: "Missing Age Group or Season" },
        { status: 400 }
      );
    }

    // Upsert logic: Update if match {ageGroup, season}, otherwise create
    const result = await db.collection("rosters").updateOne(
      {
        ageGroup: ageGroup.trim(),
        season: season.toString(),
      },
      {
        $set: {
          ageGroup: ageGroup.trim(),
          season: season.toString(),
          ...otherData,
          lastUpdated: new Date().toLocaleDateString("en-AU"),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message:
        result.upsertedCount > 0 ? "New roster created" : "Roster updated",
    });
  } catch (error: any) {
    console.error("POST Error:", error);

    // MongoDB Unique Index violation check
    if (error.code === 11000) {
      return NextResponse.json(
        {
          error:
            "Database conflict: Multiple seasons for one age group are blocked by index.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to save roster" },
      { status: 500 }
    );
  }
}
