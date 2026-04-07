// app/api/admin/tournaments/route.ts
// GET  – list tournaments (filter by season, ageGroup)
// POST – create a new tournament (auto-creates a nomination period when saved)

import { NextRequest, NextResponse } from "next/server";
import type { Db } from 'mongodb';
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";
import {
  friday8WeeksBefore,
  defaultNominationStart,
  type CreateTournamentRequest,
} from "@/types/tournaments";

// ─── GET /api/admin/tournaments ───────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { response } = await requirePermission(request, "selection.manage");
  if (response) return response;
  try {
    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season");
    const ageGroup = searchParams.get("ageGroup");

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const query: Record<string, string> = {};
    if (season) query.season = season;
    if (ageGroup) query.ageGroup = ageGroup;

    const tournaments = await db
      .collection("rep_tournaments")
      .find(query)
      .sort({ season: -1, ageGroup: 1 })
      .toArray();

    return NextResponse.json(
      tournaments.map((t) => ({ ...t, _id: t._id.toString() })),
    );
  } catch (error: unknown) {
    console.error("GET /api/admin/tournaments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tournaments" },
      { status: 500 },
    );
  }
}

// ─── POST /api/admin/tournaments ──────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const { response } = await requirePermission(request, "selection.manage");
  if (response) return response;
  try {
    const body: CreateTournamentRequest = await request.json();
    const { season, ageGroup, title, startDate, endDate, location, additionalInfo } = body;

    if (!season || !ageGroup || !title || !startDate || !endDate || !location) {
      return NextResponse.json(
        { error: "season, ageGroup, title, startDate, endDate and location are required" },
        { status: 400 },
      );
    }

    // Validate dates
    if (endDate < startDate) {
      return NextResponse.json(
        { error: "Tournament end date must be on or after start date" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const now = new Date().toISOString();
    const tournamentId = `tourn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const tournament = {
      tournamentId,
      season,
      ageGroup,
      gender: body.gender ?? "mixed",
      title,
      startDate,
      endDate,
      location,
      additionalInfo: additionalInfo ?? "",
      nominationFee: body.nominationFee ?? 0,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("rep_tournaments").insertOne(tournament);

    // ── Auto-create or update nomination period for this ageGroup + season ──
    await upsertNominationPeriod(db, {
      season,
      ageGroup,
      tournamentStartDate: startDate,
      tournamentId,
    });

    return NextResponse.json(
      { ...tournament, _id: result.insertedId.toString() },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("POST /api/admin/tournaments error:", error);
    return NextResponse.json(
      { error: "Failed to create tournament" },
      { status: 500 },
    );
  }
}

// ─── Helper: upsert nomination period ────────────────────────────────────────
export async function upsertNominationPeriod(
  db: Db,
  opts: { season: string; ageGroup: string; tournamentStartDate: string; tournamentId: string },
) {
  const { season, ageGroup, tournamentStartDate, tournamentId } = opts;

  const existing = await db
    .collection("rep_nomination_periods")
    .findOne({ season, ageGroup });

  const now = new Date().toISOString();
  const calculatedEndDate = friday8WeeksBefore(tournamentStartDate);
  const defaultStartDate = defaultNominationStart(season);

  if (!existing) {
    // Create fresh period
    await db.collection("rep_nomination_periods").insertOne({
      periodId: `period-${Date.now()}`,
      season,
      ageGroup,
      startDate: defaultStartDate,
      endDate: calculatedEndDate,
      isStartCustom: false,
      isEndCustom: false,
      linkedTournamentId: tournamentId,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    // Update end date only if it hasn't been manually overridden
    const updateFields: Record<string, unknown> = {
      linkedTournamentId: tournamentId,
      updatedAt: now,
    };
    if (!existing.isEndCustom) {
      updateFields.endDate = calculatedEndDate;
    }
    await db
      .collection("rep_nomination_periods")
      .updateOne({ season, ageGroup }, { $set: updateFields });
  }
}
