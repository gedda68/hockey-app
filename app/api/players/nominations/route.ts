// app/api/players/nominations/route.ts
// Public endpoint — identity-gated.
// Access either via name+DOB (anonymous) or memberId (session-authenticated via /api/auth/me).
// Returns all rep nominations for the matched player, enriched with tournament details.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { escapeRegex } from "@/lib/utils/regex";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const firstName = (searchParams.get("firstName") ?? "").trim();
    const lastName  = (searchParams.get("lastName")  ?? "").trim();
    const dob       = (searchParams.get("dob")        ?? "").trim();
    const memberIdParam = (searchParams.get("memberId") ?? "").trim();

    const client = await clientPromise;
    const db = client.db("hockey-app");

    let player: Record<string, any> | null = null;

    // ── Path A: Session-authenticated lookup by memberId ─────────────────────
    if (memberIdParam) {
      // Verify the session owns this memberId (prevent enumeration)
      const session = await getSession();
      if (!session?.memberId || session.memberId !== memberIdParam) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
      }
      player = await db.collection("players").findOne({
        $or: [{ linkedMemberId: memberIdParam }, { playerId: memberIdParam }],
      });
      if (!player) {
        // Also try looking up the member and getting their linked player
        const member = await db.collection("members").findOne({ memberId: memberIdParam });
        if (member) {
          player = await db.collection("players").findOne({ linkedMemberId: memberIdParam }) ?? null;
          // If still no player, synthesise a minimal player object from the member
          if (!player && member) {
            player = {
              playerId: memberIdParam,
              firstName: member.personalInfo?.firstName ?? "",
              lastName: member.personalInfo?.lastName ?? "",
              dateOfBirth: member.personalInfo?.dateOfBirth ?? "",
              gender: member.personalInfo?.gender ?? null,
              clubName: null,
              linkedMemberId: memberIdParam,
            };
          }
        }
      }
      if (!player) {
        return NextResponse.json({ found: false, nominations: [] });
      }
    }

    // ── Path B: Anonymous lookup by name + DOB ────────────────────────────────
    else {
      if (!firstName || !lastName || !dob) {
        return NextResponse.json(
          { error: "firstName, lastName and dob are required (or memberId with valid session)" },
          { status: 400 },
        );
      }
      player = await db.collection("players").findOne({
        firstName:   { $regex: `^${escapeRegex(firstName)}$`, $options: "i" },
        lastName:    { $regex: `^${escapeRegex(lastName)}$`,  $options: "i" },
        dateOfBirth: dob,
      });
      if (!player) {
        return NextResponse.json({ found: false, nominations: [] });
      }
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
  } catch (error: unknown) {
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
