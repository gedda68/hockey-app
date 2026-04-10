// app/api/admin/tournaments/route.ts
// GET  – list tournaments (filter by season, ageGroup); D1 host scope filter
// POST – create a new tournament (auto-creates a nomination period when saved)

import { NextRequest, NextResponse } from "next/server";
import type { Db } from "mongodb";
import { ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/middleware";
import { userCanAccessRepTournament } from "@/lib/auth/repTournamentScope";
import { CreateRepTournamentBodySchema } from "@/lib/db/schemas/repTournament.schema";
import {
  normalizeRepTournamentHost,
  RepTournamentHostError,
} from "@/lib/tournaments/resolveRepTournamentHost";
import {
  requireRepTournamentResourceAccess,
  type RepTournamentHostDoc,
} from "@/lib/auth/repTournamentScope";
import {
  friday8WeeksBefore,
  defaultNominationStart,
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

    const session = await getSession();
    const visible: typeof tournaments = [];
    for (const t of tournaments) {
      if (await userCanAccessRepTournament(session, t as RepTournamentHostDoc)) {
        visible.push(t);
      }
    }

    return NextResponse.json(
      visible.map((t) => ({ ...t, _id: t._id.toString() })),
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
  const { user, response } = await requirePermission(request, "selection.manage");
  if (response) return response;
  try {
    const raw = await request.json();
    const body = CreateRepTournamentBodySchema.parse(raw);

    let hostType = body.hostType;
    let hostId = body.hostId?.trim();
    if (!hostType || !hostId) {
      if (user.associationId) {
        hostType = hostType ?? "association";
        hostId = hostId ?? user.associationId;
      } else if (user.clubId) {
        hostType = hostType ?? "club";
        hostId = hostId ?? user.clubId;
      }
    }
    if (!hostType || !hostId) {
      return NextResponse.json(
        {
          error:
            "hostType and hostId are required (association or club). Sign in with an association or club scope, or send both explicitly.",
        },
        { status: 400 },
      );
    }

    const { season, ageGroup, title, startDate, endDate, location, additionalInfo } =
      body;

    if (!season || !ageGroup || !title || !startDate || !endDate || !location) {
      return NextResponse.json(
        { error: "season, ageGroup, title, startDate, endDate and location are required" },
        { status: 400 },
      );
    }

    if (endDate < startDate) {
      return NextResponse.json(
        { error: "Tournament end date must be on or after start date" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    let hostNorm;
    try {
      hostNorm = await normalizeRepTournamentHost(db, {
        hostType,
        hostId,
        brandingAssociationId: body.brandingAssociationId,
      });
    } catch (e: unknown) {
      if (e instanceof RepTournamentHostError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      throw e;
    }

    const scope = await requireRepTournamentResourceAccess(request, hostNorm);
    if (scope.response) return scope.response;

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
      hostType: hostNorm.hostType,
      hostId: hostNorm.hostId,
      brandingAssociationId: hostNorm.brandingAssociationId,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("rep_tournaments").insertOne(tournament);

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
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
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
