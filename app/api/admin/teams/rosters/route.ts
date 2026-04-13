// app/api/admin/teams/rosters/route.ts
// GET  — list rosters (filtered by season / clubId)
// POST — create a new roster

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  getUserFromRequest,
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import {
  clubAssociationId,
  findSlot,
  getAssociationSeasonRosterDoc,
  normalizeClubId,
  rosterTripleKey,
} from "@/lib/rosters/associationRosterDivisions";

export async function GET(request: NextRequest) {
  try {
    const { response: authRes } = await requirePermission(request, "team.roster");
    if (authRes) return authRes;

    const user = await getUserFromRequest(request);
    const isSuperAdmin = user?.role === "super-admin";
    const userAssociationId = user?.associationId ?? null;

    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season");
    let clubId = searchParams.get("clubId");

    if (!isSuperAdmin && user?.clubId) {
      if (!clubId || clubId === "all") {
        clubId = user.clubId;
      } else if (clubId !== user.clubId) {
        return NextResponse.json(
          { error: "You can only view rosters for your club" },
          { status: 403 },
        );
      }
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    // Association-scoped users (no clubId) should only see rosters for clubs they directly govern.
    // "Directly responsible" here means the club's governing associationId/parentAssociationId matches the user's associationId
    // (we intentionally do NOT include descendant associations in the hierarchy).
    let allowedClubIds: string[] | null = null;
    const isAssociationScopedUser = !isSuperAdmin && !user?.clubId && !!userAssociationId;
    if (isAssociationScopedUser) {
      const clubs = await db
        .collection("clubs")
        .find({
          $or: [
            { parentAssociationId: userAssociationId },
            { associationId: userAssociationId },
            { parentAssocId: userAssociationId },
          ],
        })
        .project({ id: 1, clubId: 1, _id: 1 })
        .toArray();
      allowedClubIds = clubs.map(normalizeClubId).filter(Boolean);
    }

    if (clubId && clubId !== "all") {
      const { response: scopeRes } = await requireResourceAccess(
        request,
        "club",
        clubId,
      );
      if (scopeRes) return scopeRes;
    }

    const query: Record<string, unknown> = {};
    if (season) query.season = season;
    if (clubId && clubId !== "all") {
      if (allowedClubIds && !allowedClubIds.includes(clubId)) {
        return NextResponse.json(
          { error: "You can only view rosters for clubs in your association" },
          { status: 403 },
        );
      }
      query.clubId = clubId;
    } else if (allowedClubIds) {
      // If there are no clubs directly governed by this association, return an empty list (do not fall back to "all rosters").
      query.clubId = allowedClubIds.length ? { $in: allowedClubIds } : "__none__";
    }

    const rosters = await db
      .collection("teamRosters")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    const userAccess = {
      clubId: user?.clubId ?? null,
      clubName: null as string | null,
      associationId: userAssociationId,
      isSuperAdmin,
    };

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
    const db = client.db(process.env.DB_NAME || "hockey-app");

    // Try id field first, then fall back to _id / clubId fields
    const club =
      (await db.collection("clubs").findOne({ id: clubId })) ??
      (await db.collection("clubs").findOne({
        $or: [{ _id: clubId }, { clubId }],
      }));

    if (!club) {
      return NextResponse.json({ error: "Club not found", clubId }, { status: 404 });
    }

    const canonicalClubId = normalizeClubId(club);

    const dup = await db.collection("teamRosters").findOne({
      clubId: canonicalClubId,
      season: String(season),
      category,
      division,
      gender,
    });
    if (dup) {
      return NextResponse.json(
        {
          error:
            "A roster already exists for this club in that division. Add another team inside that roster instead of creating a new roster row.",
          code: "duplicate_roster_triple",
        },
        { status: 409 },
      );
    }

    const assocId = clubAssociationId(club);
    if (assocId) {
      const catalog = await getAssociationSeasonRosterDoc(db, assocId, String(season));
      if (catalog?.slots?.length) {
        const slot = findSlot(catalog.slots, category, division, gender);
        if (!slot) {
          return NextResponse.json(
            {
              error:
                "That division is not offered by the governing association for this season. The association must publish roster divisions first.",
              code: "slot_not_in_catalog",
            },
            { status: 400 },
          );
        }
      }
    }

    const newRoster = {
      id: `roster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      clubId:        canonicalClubId,
      divisionKey:   rosterTripleKey(category, division, gender),
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
