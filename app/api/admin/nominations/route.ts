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

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const query: Record<string, string> = {};
    if (season) query.season = season;
    if (ageGroup) query.ageGroup = ageGroup;
    if (clubId) query.clubId = clubId;
    if (status) query.status = status;

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
    const { season, ageGroup, clubId, memberId, nominatedBy, notes } = body;

    if (!season || !ageGroup || !clubId || !memberId) {
      return NextResponse.json(
        { error: "season, ageGroup, clubId and memberId are required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Prevent duplicate nomination for same member/ageGroup/season
    const existing = await db.collection("rep_nominations").findOne({
      season,
      ageGroup,
      memberId,
    });
    if (existing) {
      return NextResponse.json(
        { error: "This player is already nominated for this age group and season" },
        { status: 409 },
      );
    }

    // Look up the member (members collection uses clubId as club.id, not slug)
    const member = await db.collection("members").findOne({ memberId });
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Look up the club
    const club = await db
      .collection("clubs")
      .findOne({ $or: [{ id: clubId }, { slug: clubId }] });
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Age eligibility check
    const dob: string = member.personalInfo?.dateOfBirth ?? "";
    if (!dob) {
      return NextResponse.json(
        { error: "Member has no date of birth recorded" },
        { status: 422 },
      );
    }

    const seasonYear = parseInt(season, 10);
    if (!isEligibleForAgeGroup(dob, ageGroup, seasonYear)) {
      const age = calcAgeForSeason(dob, seasonYear);
      return NextResponse.json(
        {
          error: `Player is not age-eligible for ${ageGroup} in ${season}. Their age for ${season} is ${age}.`,
        },
        { status: 422 },
      );
    }

    const firstName: string = member.personalInfo?.firstName ?? "";
    const lastName: string = member.personalInfo?.lastName ?? "";
    const memberName = `${firstName} ${lastName}`.trim();
    const ageAtSeason = calcAgeForSeason(dob, seasonYear);
    const now = new Date().toISOString();

    const nomination = {
      nominationId: `nom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      season,
      ageGroup,
      clubId: club.id,
      clubName: club.name,
      memberId,
      memberName,
      dateOfBirth: dob,
      ageAtSeason,
      nominatedBy: nominatedBy ?? "",
      nominatedAt: now,
      status: "pending",
      notes: notes ?? "",
      updatedAt: now,
    };

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
