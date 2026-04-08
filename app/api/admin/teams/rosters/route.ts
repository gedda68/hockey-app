// app/api/admin/teams/rosters/route.ts
// GET  — list rosters (filtered by season / clubId)
// POST — create a new roster

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";

export async function GET(request: NextRequest) {
  try {
    const { response: authRes } = await requirePermission(request, "team.roster");
    if (authRes) return authRes;

    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season");
    const clubId = searchParams.get("clubId");

    if (clubId && clubId !== "all") {
      const { response: scopeRes } = await requireResourceAccess(
        request,
        "club",
        clubId,
      );
      if (scopeRes) return scopeRes;
    }

    const client = await clientPromise;
    const db = client.db();

    const query: Record<string, unknown> = {};
    if (season) query.season = season;
    if (clubId && clubId !== "all") query.clubId = clubId;

    const rosters = await db
      .collection("teamRosters")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    const userAccess = { clubId: null, clubName: null, isSuperAdmin: true };

    return NextResponse.json({ rosters, userAccess });
  } catch (error: unknown) {
    console.error("Error fetching rosters:", error);
    return NextResponse.json({ error: "Failed to fetch rosters" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { response: authRes } = await requirePermission(request, "team.edit");
    if (authRes) return authRes;

    const body = await request.json();
    const { clubId, category, division, gender, season } = body;

    if (!clubId || !category || !division || !gender || !season) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { response: scopeRes } = await requireResourceAccess(
      request,
      "club",
      clubId,
    );
    if (scopeRes) return scopeRes;

    const client = await clientPromise;
    const db = client.db();

    // Try id field first, then fall back to _id / clubId fields
    const club =
      (await db.collection("clubs").findOne({ id: clubId })) ??
      (await db.collection("clubs").findOne({
        $or: [{ _id: clubId }, { clubId }],
      }));

    if (!club) {
      return NextResponse.json({ error: "Club not found", clubId }, { status: 404 });
    }

    const newRoster = {
      id: `roster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      clubId:        club.id ?? club.clubId ?? club._id?.toString(),
      clubName:      club.name,
      clubShortName: club.shortName,
      clubColors:    club.colors ?? { primary: "#06054e", secondary: "#3b82f6" },
      clubLogo:      club.logo ?? null,
      category,
      division,
      gender,
      season,
      teams:         [],
      shadowPlayers: [],
      withdrawn:     [],
      createdAt:     new Date().toISOString(),
      lastUpdated:   new Date().toISOString(),
    };

    await db.collection("teamRosters").insertOne(newRoster);

    return NextResponse.json({ success: true, roster: newRoster });
  } catch (error: unknown) {
    console.error("Error creating roster:", error);
    return NextResponse.json({ error: "Failed to create roster" }, { status: 500 });
  }
}
