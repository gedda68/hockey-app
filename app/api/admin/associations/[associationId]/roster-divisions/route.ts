// GET/PUT — association-published roster division slots for a season (governs which triples clubs may roster).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import {
  ASSOCIATION_SEASON_ROSTER_DIVISIONS,
  type RosterDivisionSlot,
} from "@/lib/rosters/associationRosterDivisions";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ associationId: string }> },
) {
  try {
    const { associationId } = await context.params;
    if (!associationId?.trim()) {
      return NextResponse.json({ error: "associationId required" }, { status: 400 });
    }

    const { response: scopeRes } = await requireResourceAccess(
      request,
      "association",
      associationId.trim(),
    );
    if (scopeRes) return scopeRes;

    const { response: permRes } = await requireAnyPermission(request, [
      "association.view",
      "competitions.manage",
    ]);
    if (permRes) return permRes;

    const { searchParams } = new URL(request.url);
    const season =
      searchParams.get("season")?.trim() ??
      new Date().getFullYear().toString();

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const row = await db.collection(ASSOCIATION_SEASON_ROSTER_DIVISIONS).findOne({
      associationId: associationId.trim(),
      season: String(season),
    });

    return NextResponse.json({
      associationId: associationId.trim(),
      season: String(season),
      slots: (row?.slots as RosterDivisionSlot[]) ?? [],
      updatedAt: row?.updatedAt ?? null,
    });
  } catch (e: unknown) {
    console.error("GET roster-divisions:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ associationId: string }> },
) {
  try {
    const { associationId } = await context.params;
    if (!associationId?.trim()) {
      return NextResponse.json({ error: "associationId required" }, { status: 400 });
    }

    const { response: scopeRes } = await requireResourceAccess(
      request,
      "association",
      associationId.trim(),
    );
    if (scopeRes) return scopeRes;

    const { response: permRes } = await requireAnyPermission(request, [
      "association.edit",
      "competitions.manage",
    ]);
    if (permRes) return permRes;

    const body = await request.json();
    const season = String(body.season ?? "").trim();
    const rawSlots = body.slots;
    if (!season || !Array.isArray(rawSlots)) {
      return NextResponse.json(
        { error: "season and slots[] are required" },
        { status: 400 },
      );
    }

    const slots: RosterDivisionSlot[] = rawSlots.map((s: Record<string, unknown>, i: number) => ({
      category: String(s.category ?? "").trim(),
      division: String(s.division ?? "").trim(),
      gender: String(s.gender ?? "").trim().toLowerCase(),
      sortOrder: typeof s.sortOrder === "number" ? s.sortOrder : i,
      maxTeamsPerClub:
        typeof s.maxTeamsPerClub === "number" && s.maxTeamsPerClub >= 1
          ? s.maxTeamsPerClub
          : 1,
    }));

    for (const s of slots) {
      if (!s.category || !s.division || !s.gender) {
        return NextResponse.json(
          { error: "Each slot needs category, division, gender" },
          { status: 400 },
        );
      }
    }

    const now = new Date().toISOString();
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    await db.collection(ASSOCIATION_SEASON_ROSTER_DIVISIONS).updateOne(
      { associationId: associationId.trim(), season },
      {
        $set: {
          associationId: associationId.trim(),
          season,
          slots,
          updatedAt: now,
        },
      },
      { upsert: true },
    );

    return NextResponse.json({
      success: true,
      associationId: associationId.trim(),
      season,
      slots,
      updatedAt: now,
    });
  } catch (e: unknown) {
    console.error("PUT roster-divisions:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
