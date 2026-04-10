// GET /api/competitions/player-career?memberId=...&owningAssociationId=...
// Public cross-season stats for one member within an association (E6 follow-up).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  aggregateMemberCareerInAssociation,
} from "@/lib/competitions/playerCareerStats";
import { hasAnyPlayerStat, memberDisplayName } from "@/lib/competitions/playerSeasonStats";

export async function GET(request: NextRequest) {
  try {
    const memberId = request.nextUrl.searchParams.get("memberId")?.trim() ?? "";
    const owningAssociationId =
      request.nextUrl.searchParams.get("owningAssociationId")?.trim() ?? "";

    if (!memberId || !owningAssociationId) {
      return NextResponse.json(
        {
          error:
            "Query parameters memberId and owningAssociationId are required",
        },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const assoc = await db.collection("associations").findOne({
      associationId: owningAssociationId,
    });
    if (!assoc) {
      return NextResponse.json(
        { error: "Association not found" },
        { status: 404 },
      );
    }

    const member = await db
      .collection("members")
      .findOne({ memberId }, { projection: { memberId: 1, personalInfo: 1 } });

    const { bySeason, career } = await aggregateMemberCareerInAssociation(
      db,
      memberId,
      owningAssociationId,
    );

    return NextResponse.json({
      memberId,
      displayName: member ? memberDisplayName(member) || memberId : memberId,
      owningAssociationId,
      associationName: (assoc.name as string) ?? owningAssociationId,
      hasStats: hasAnyPlayerStat(career),
      career,
      bySeason,
    });
  } catch (error: unknown) {
    console.error("GET /api/competitions/player-career error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
