// app/api/admin/metadata/route.ts
import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Fetch every single roster but only the ageGroup and season fields
    const allRosters = await db
      .collection("rosters")
      .find({}, { projection: { ageGroup: 1, season: 1, _id: 0 } })
      .toArray();

    // Get unique Age Groups regardless of year
    const uniqueAgeGroups = Array.from(
      new Set(allRosters.map((r) => r.ageGroup))
    ).sort();

    // Get unique Seasons sorted newest first
    const uniqueSeasons = Array.from(
      new Set(allRosters.map((r) => r.season))
    ).sort((a, b) => Number(b) - Number(a));

    return NextResponse.json({
      ageGroups: uniqueAgeGroups,
      seasons: uniqueSeasons,
    });
  } catch (error) {
    return NextResponse.json({ ageGroups: [], seasons: [] }, { status: 500 });
  }
}
