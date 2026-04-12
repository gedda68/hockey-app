// POST — append a new team row to a roster (was missing; duplicate PUT lived here by mistake).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import {
  clubAssociationId,
  countClubTeamsInDivisionSlot,
  findSlot,
  getAssociationSeasonRosterDoc,
  maxTeamsAllowedForClubInSlot,
} from "@/lib/rosters/associationRosterDivisions";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ rosterId: string }> },
) {
  try {
    const { rosterId } = await context.params;

    const { response: permRes } = await requirePermission(request, "team.edit");
    if (permRes) return permRes;

    const body = await request.json();
    const name = String(body.name ?? "").trim() || "Team";

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const roster = await db.collection("teamRosters").findOne({ id: rosterId });
    if (!roster) {
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

    if (roster.clubId) {
      const { response: scopeRes } = await requireResourceAccess(
        request,
        "club",
        String(roster.clubId),
      );
      if (scopeRes) return scopeRes;
    }

    const clubId = String(roster.clubId ?? "");
    const season = String(roster.season ?? "");
    const category = String(roster.category ?? "");
    const division = String(roster.division ?? "");
    const gender = String(roster.gender ?? "");

    const club = clubId
      ? (await db.collection("clubs").findOne({
          $or: [{ id: clubId }, { clubId }],
        })) ?? null
      : null;

    const associationId = clubAssociationId(club);
    if (associationId) {
      const catalog = await getAssociationSeasonRosterDoc(db, associationId, season);
      if (catalog?.slots?.length) {
        const slot = findSlot(catalog.slots, category, division, gender);
        if (!slot) {
          return NextResponse.json(
            {
              error:
                "This roster division is not in the association’s published list for this season.",
            },
            { status: 403 },
          );
        }

        const current = await countClubTeamsInDivisionSlot(
          db,
          clubId,
          season,
          category,
          division,
          gender,
        );
        const maxAllowed = await maxTeamsAllowedForClubInSlot(
          db,
          clubId,
          associationId,
          season,
          category,
          division,
          gender,
        );

        if (current + 1 > maxAllowed) {
          return NextResponse.json(
            {
              error:
                "This club already has the maximum teams allowed in this division for the season. Request an extra team from the association.",
              code: "team_cap_exceeded",
              current,
              maxAllowed,
            },
            { status: 403 },
          );
        }
      }
    }

    const teams = Array.isArray(roster.teams) ? [...roster.teams] : [];
    teams.push({
      name,
      players: [],
    });

    const result = await db.collection("teamRosters").updateOne(
      { id: rosterId },
      {
        $set: {
          teams,
          lastUpdated: new Date().toISOString(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      teams,
      addedIndex: teams.length - 1,
    });
  } catch (e: unknown) {
    console.error("POST roster team:", e);
    return NextResponse.json(
      { error: "Failed to add team" },
      { status: 500 },
    );
  }
}
