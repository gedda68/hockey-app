// GET — teams under member clubs of this association (for league fixture generation UI).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";

type Params = { params: Promise<{ associationId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { response } = await requireAnyPermission(request, [
    "competitions.manage",
    "competitions.fixtures",
  ]);
  if (response) return response;

  try {
    const { associationId } = await params;
    const scope = await requireResourceAccess(
      request,
      "association",
      associationId,
    );
    if (scope.response) return scope.response;

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const clubs = await db
      .collection("clubs")
      .find({
        $or: [
          { parentAssociationId: associationId },
          { associationId },
        ],
        active: { $ne: false },
      })
      .project({ id: 1, name: 1 })
      .toArray();

    const clubIds = clubs
      .map((c) => String(c.id ?? ""))
      .filter(Boolean);
    if (!clubIds.length) {
      return NextResponse.json({ teams: [], clubs: [] });
    }

    const clubsPayload = clubs
      .map((c) => ({
        clubId: String(c.id ?? ""),
        clubName: String(c.name ?? "Club"),
      }))
      .filter((c) => c.clubId)
      .sort((a, b) => a.clubName.localeCompare(b.clubName, undefined, { sensitivity: "base" }));

    const teams = await db
      .collection("teams")
      .find({ clubId: { $in: clubIds } })
      .project({ teamId: 1, name: 1, clubId: 1 })
      .sort({ name: 1 })
      .toArray();

    const clubNameById = new Map(
      clubs.map((c) => [String(c.id), String(c.name ?? "Club")]),
    );

    return NextResponse.json({
      clubs: clubsPayload,
      teams: teams.map((t) => ({
        teamId: String(t.teamId ?? ""),
        name: String(t.name ?? "Team"),
        clubId: String(t.clubId ?? ""),
        clubName: clubNameById.get(String(t.clubId)) ?? "",
      })),
    });
  } catch (e) {
    console.error("GET league-builder-teams:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load teams" },
      { status: 500 },
    );
  }
}
