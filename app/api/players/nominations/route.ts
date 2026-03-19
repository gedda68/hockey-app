// app/api/players/nominations/route.ts
// Public endpoint — identity-gated (name + DOB).
// Returns all rep nominations for the matched player, enriched with tournament details.
// No auth required, but access is limited to the player's own records by requiring exact name+DOB.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const firstName = (searchParams.get("firstName") ?? "").trim();
    const lastName  = (searchParams.get("lastName")  ?? "").trim();
    const dob       = (searchParams.get("dob")        ?? "").trim(); // YYYY-MM-DD

    if (!firstName || !lastName || !dob) {
      return NextResponse.json(
        { error: "firstName, lastName and dob are required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // ── 1. Look up the player ─────────────────────────────────────────────────
    const player = await db.collection("players").findOne({
      firstName:   { $regex: `^${firstName}$`, $options: "i" },
      lastName:    { $regex: `^${lastName}$`,  $options: "i" },
      dateOfBirth: dob,
    });

    if (!player) {
      return NextResponse.json({ found: false, nominations: [] });
    }

    // ── 2. Fetch their nominations ────────────────────────────────────────────
    const orQuery: Record<string, any>[] = [{ playerId: player.playerId }];
    if (player.linkedMemberId) {
      orQuery.push({ memberId: player.linkedMemberId });
    }

    const nominations = await db
      .collection("rep_nominations")
      .find({ $or: orQuery })
      .sort({ season: -1, nominatedAt: -1 })
      .toArray();

    if (nominations.length === 0) {
      return NextResponse.json({
        found: true,
        player: safePLayer(player),
        nominations: [],
      });
    }

    // ── 3. Enrich with tournament details ─────────────────────────────────────
    // Build unique season+ageGroup pairs to batch-fetch tournament records
    const pairs = [
      ...new Set(nominations.map((n) => `${n.season}||${n.ageGroup}`)),
    ];
    const tournamentDocs = await db
      .collection("rep_tournaments")
      .find({
        $or: pairs.map((p) => {
          const [season, ageGroup] = p.split("||");
          return { season, ageGroup };
        }),
      })
      .toArray();

    const tMap = new Map(
      tournamentDocs.map((t) => [`${t.season}||${t.ageGroup}`, t]),
    );

    const enriched = nominations.map((n) => {
      const t = tMap.get(`${n.season}||${n.ageGroup}`);
      return {
        nominationId:     n.nominationId,
        season:           n.season,
        ageGroup:         n.ageGroup,
        clubName:         n.clubName ?? "",
        nominatedAt:      n.nominatedAt,
        updatedAt:        n.updatedAt ?? n.nominatedAt,
        status:           n.status ?? "pending",
        nominationType:   n.nominationType ?? "player",
        role:             n.role ?? null,
        notes:            n.notes ?? "",
        // Tournament details — try multiple field name variants
        tournamentTitle:   t?.tournamentTitle ?? t?.title ?? t?.name ?? null,
        tournamentLocation:t?.location ?? t?.venue ?? t?.tournamentLocation ?? null,
        tournamentStartDate: t?.startDate ?? t?.tournamentStartDate ?? null,
        tournamentEndDate:   t?.endDate   ?? t?.tournamentEndDate   ?? null,
        // Safe snapshot subset — contact info the player submitted
        snapshotEmail:    n.playerSnapshot?.email ?? null,
        snapshotPhone:    n.playerSnapshot?.phone ?? null,
        snapshotDate:     n.playerSnapshot?.snapshotDate ?? null,
      };
    });

    return NextResponse.json({
      found: true,
      player: safePLayer(player),
      nominations: enriched,
    });
  } catch (error: any) {
    console.error("GET /api/players/nominations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch nominations" },
      { status: 500 },
    );
  }
}

// Only expose safe, non-sensitive fields about the player
function safePLayer(player: Record<string, any>) {
  return {
    playerId:      player.playerId,
    firstName:     player.firstName,
    lastName:      player.lastName,
    preferredName: player.preferredName ?? null,
    dateOfBirth:   player.dateOfBirth,
    gender:        player.gender ?? null,
    clubName:      player.clubName ?? null,
  };
}
