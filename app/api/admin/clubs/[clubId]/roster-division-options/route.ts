// GET — slots published by the club's governing association for a season + existing roster triples for this club.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import {
  clubAssociationId,
  getAssociationSeasonRosterDoc,
  normalizeClubId,
  rosterTripleKey,
} from "@/lib/rosters/associationRosterDivisions";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { response: authRes } = await requirePermission(request, "team.roster");
    if (authRes) return authRes;

    const { id: clubIdParam } = await context.params;
    const clubId = clubIdParam?.trim();
    if (!clubId) {
      return NextResponse.json({ error: "Club id required" }, { status: 400 });
    }

    const { response: scopeRes } = await requireResourceAccess(
      request,
      "club",
      clubId,
    );
    if (scopeRes) return scopeRes;

    const { searchParams } = new URL(request.url);
    const season =
      searchParams.get("season")?.trim() ??
      new Date().getFullYear().toString();

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const club =
      (await db.collection("clubs").findOne({ id: clubId })) ??
      (await db.collection("clubs").findOne({ clubId })) ??
      (await db.collection("clubs").findOne({ slug: clubId }));

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const canonicalClubId = normalizeClubId(club);
    const associationId = clubAssociationId(club);

    const catalog = associationId
      ? await getAssociationSeasonRosterDoc(db, associationId, season)
      : null;

    const existing = await db
      .collection("teamRosters")
      .find({ clubId: canonicalClubId, season: String(season) })
      .project({ category: 1, division: 1, gender: 1 })
      .toArray();

    const existingTriples = [
      ...new Set(
        existing.map((r) =>
          rosterTripleKey(
            String(r.category ?? ""),
            String(r.division ?? ""),
            String(r.gender ?? ""),
          ),
        ),
      ),
    ];

    return NextResponse.json({
      clubId: canonicalClubId,
      associationId,
      season: String(season),
      catalogActive: Boolean(catalog?.slots?.length),
      slots: catalog?.slots ?? [],
      existingTriples,
    });
  } catch (e: unknown) {
    console.error("GET roster-division-options:", e);
    return NextResponse.json(
      { error: "Failed to load division options" },
      { status: 500 },
    );
  }
}
