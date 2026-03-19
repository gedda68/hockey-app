// app/api/admin/nominations/route.ts
// GET  - list nominations (filter by season, ageGroup, clubId, status)
// POST - create a new nomination

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  calcAgeForSeason,
  isEligibleForAgeGroup,
  type CreateNominationRequest,
} from "@/types/nominations";

// ─── GET /api/admin/nominations ──────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season");
    const ageGroup = searchParams.get("ageGroup");
    const clubId = searchParams.get("clubId");
    const status = searchParams.get("status");
    const playerId = searchParams.get("playerId");
    const memberId = searchParams.get("memberId");

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const query: Record<string, string> = {};
    if (season) query.season = season;
    if (ageGroup) query.ageGroup = ageGroup;
    if (clubId) query.clubId = clubId;
    if (status) query.status = status;
    if (playerId) query.playerId = playerId;
    if (memberId) query.memberId = memberId;

    const nominations = await db
      .collection("rep_nominations")
      .find(query)
      .sort({ ageGroup: 1, clubName: 1, memberName: 1 })
      .toArray();

    return NextResponse.json(
      nominations.map((n) => ({ ...n, _id: n._id.toString() })),
    );
  } catch (error: any) {
    console.error("GET /api/admin/nominations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch nominations" },
      { status: 500 },
    );
  }
}

// ─── POST /api/admin/nominations ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body: CreateNominationRequest = await request.json();
    const {
      season,
      ageGroup,
      clubId,
      memberId,
      playerId,
      nominatedBy,
      notes,
      playerSnapshot,
      nominationType,
      role,
    } = body as any;

    if (!season || !ageGroup || !clubId) {
      return NextResponse.json(
        { error: "season, ageGroup and clubId are required" },
        { status: 400 },
      );
    }

    if (!memberId && !playerId) {
      return NextResponse.json(
        { error: "Either memberId or playerId is required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Prevent duplicate nomination — check both memberId and playerId
    const duplicateQuery: Record<string, any>[] = [{ season, ageGroup }];
    if (memberId) duplicateQuery[0].memberId = memberId;
    if (playerId) {
      // Check either memberId OR playerId match to avoid double-nominating the same physical player
      const orClauses: Record<string, any>[] = [];
      if (memberId) orClauses.push({ memberId, season, ageGroup });
      if (playerId) orClauses.push({ playerId, season, ageGroup });
      const existing = await db
        .collection("rep_nominations")
        .findOne({ $or: orClauses });
      if (existing) {
        return NextResponse.json(
          {
            error:
              "This player is already nominated for this age group and season",
          },
          { status: 409 },
        );
      }
    } else {
      // memberId only path
      const existing = await db
        .collection("rep_nominations")
        .findOne({ season, ageGroup, memberId });
      if (existing) {
        return NextResponse.json(
          {
            error:
              "This player is already nominated for this age group and season",
          },
          { status: 409 },
        );
      }
    }

    // Look up the club
    const club = await db
      .collection("clubs")
      .findOne({ $or: [{ id: clubId }, { slug: clubId }, { clubId }] });
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    let firstName = "";
    let lastName = "";
    let dob = "";
    let resolvedMemberId = memberId;

    if (memberId) {
      // --- Lookup via members collection (existing logic) ---
      const member = await db.collection("members").findOne({ memberId });
      if (!member) {
        return NextResponse.json(
          { error: "Member not found" },
          { status: 404 },
        );
      }
      dob = member.personalInfo?.dateOfBirth ?? "";
      firstName = member.personalInfo?.firstName ?? "";
      lastName = member.personalInfo?.lastName ?? "";
    } else if (playerId) {
      // --- Lookup via players collection ---
      const player = await db.collection("players").findOne({ playerId });
      if (!player) {
        return NextResponse.json(
          { error: "Player not found" },
          { status: 404 },
        );
      }
      dob = player.dateOfBirth ?? "";
      firstName = player.firstName ?? "";
      lastName = player.lastName ?? "";
      // Use player's linkedMemberId if available
      if (player.linkedMemberId) {
        resolvedMemberId = player.linkedMemberId;
      }
    }

    if (!dob) {
      return NextResponse.json(
        { error: "Player has no date of birth recorded" },
        { status: 422 },
      );
    }

    const seasonYear = parseInt(season, 10);
    // Skip age eligibility check for official role nominations (coach, manager, umpire etc.)
    if (nominationType !== "official") {
      if (!isEligibleForAgeGroup(dob, ageGroup, seasonYear)) {
        const age = calcAgeForSeason(dob, seasonYear);
        return NextResponse.json(
          {
            error: `Player is not age-eligible for ${ageGroup} in ${season}. Their age for ${season} is ${age}.`,
          },
          { status: 422 },
        );
      }
    }

    const memberName = `${firstName} ${lastName}`.trim();
    const ageAtSeason = calcAgeForSeason(dob, seasonYear);
    const now = new Date().toISOString();

    const nomination: Record<string, any> = {
      nominationId: `nom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      season,
      ageGroup,
      clubId: club.id ?? club.clubId ?? clubId,
      clubName: club.name,
      memberName,
      dateOfBirth: dob,
      ageAtSeason,
      nominatedBy: nominatedBy ?? "",
      nominatedAt: now,
      status: "pending",
      notes: notes ?? "",
      updatedAt: now,
      nominationType: nominationType ?? "player",
      ...(role ? { role } : {}),
      ...(playerSnapshot ? { playerSnapshot } : {}),
    };

    // Store whichever IDs are available
    if (resolvedMemberId) nomination.memberId = resolvedMemberId;
    if (playerId) nomination.playerId = playerId;

    const result = await db.collection("rep_nominations").insertOne(nomination);

    return NextResponse.json(
      { ...nomination, _id: result.insertedId.toString() },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("POST /api/admin/nominations error:", error);
    return NextResponse.json(
      { error: "Failed to create nomination" },
      { status: 500 },
    );
  }
}
