// app/api/admin/nominations/periods/route.ts
// GET – return nomination periods (optionally filtered by season / ageGroup)
// PUT – upsert (create or update) a nomination period — allows admins to
//       override the start/end dates that were auto-calculated from the tournament

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";
import {
  defaultNominationStart,
  type UpsertNominationPeriodRequest,
} from "@/types/tournaments";

// ─── GET /api/admin/nominations/periods ──────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { response: authRes } = await requirePermission(
      request,
      "selection.view",
    );
    if (authRes) return authRes;

    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season");
    const ageGroup = searchParams.get("ageGroup");

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const query: Record<string, string> = {};
    if (season) query.season = season;
    if (ageGroup) query.ageGroup = ageGroup;

    const periods = await db
      .collection("rep_nomination_periods")
      .find(query)
      .sort({ season: -1, ageGroup: 1 })
      .toArray();

    return NextResponse.json(
      periods.map((p) => ({ ...p, _id: p._id.toString() })),
    );
  } catch (error: unknown) {
    console.error("GET /api/admin/nominations/periods error:", error);
    return NextResponse.json(
      { error: "Failed to fetch nomination periods" },
      { status: 500 },
    );
  }
}

// ─── PUT /api/admin/nominations/periods ──────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const { response: authRes } = await requirePermission(
      request,
      "selection.manage",
    );
    if (authRes) return authRes;

    const body: UpsertNominationPeriodRequest = await request.json();
    const {
      season,
      ageGroup,
      startDate,
      endDate,
      isStartCustom = true,
      isEndCustom = true,
      linkedTournamentId,
    } = body;

    if (!season || !ageGroup || !startDate || !endDate) {
      return NextResponse.json(
        { error: "season, ageGroup, startDate and endDate are required" },
        { status: 400 },
      );
    }

    if (endDate < startDate) {
      return NextResponse.json(
        { error: "End date must be on or after start date" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const now = new Date().toISOString();

    const result = await db.collection("rep_nomination_periods").findOneAndUpdate(
      { season, ageGroup },
      {
        $set: {
          startDate,
          endDate,
          isStartCustom,
          isEndCustom,
          ...(linkedTournamentId !== undefined && { linkedTournamentId }),
          updatedAt: now,
        },
        $setOnInsert: {
          periodId: `period-${Date.now()}`,
          season,
          ageGroup,
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    return NextResponse.json({ ...result, _id: result!._id.toString() });
  } catch (error: unknown) {
    console.error("PUT /api/admin/nominations/periods error:", error);
    return NextResponse.json(
      { error: "Failed to save nomination period" },
      { status: 500 },
    );
  }
}
