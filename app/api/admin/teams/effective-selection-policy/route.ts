// GET — merged team selection policy for a club (national → … → parent association → club).
// Use from roster move / fixture validation so behaviour matches admin-configured policy.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { resolveEffectiveTeamSelectionPolicy } from "@/lib/selection/teamSelectionPolicy";
import type { Db } from "mongodb";

function dbName() {
  return process.env.DB_NAME || "hockey-app";
}

async function resolveClubCanonicalId(db: Db, clubIdOrSlug: string): Promise<string | null> {
  const club = await db.collection("clubs").findOne({
    $or: [{ slug: clubIdOrSlug }, { id: clubIdOrSlug }],
  });
  return club?.id ? String(club.id) : null;
}

export async function GET(request: NextRequest) {
  try {
    const { response: authRes } = await requirePermission(request, "team.roster");
    if (authRes) return authRes;

    const { searchParams } = new URL(request.url);
    const clubRef = searchParams.get("clubId")?.trim();
    if (!clubRef) {
      return NextResponse.json({ error: "clubId query parameter is required" }, { status: 400 });
    }

    const { response: scopeRes } = await requireResourceAccess(request, "club", clubRef);
    if (scopeRes) return scopeRes;

    const client = await clientPromise;
    const db = client.db(dbName());
    const canonicalId = await resolveClubCanonicalId(db, clubRef);
    if (!canonicalId) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const policy = await resolveEffectiveTeamSelectionPolicy(db, canonicalId);

    return NextResponse.json({
      clubId: canonicalId,
      policy,
    });
  } catch (e: unknown) {
    console.error("GET effective-selection-policy:", e);
    return NextResponse.json({ error: "Failed to resolve policy" }, { status: 500 });
  }
}
