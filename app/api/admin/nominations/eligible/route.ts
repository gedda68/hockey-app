// app/api/admin/nominations/eligible/route.ts
// GET - return members who are age-eligible for a given ageGroup + season,
//       optionally filtered by clubId. Flags already-nominated members.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import {
  calcAgeForSeason,
  getEligibilityRange,
  isEligibleForAgeGroup,
  type EligibleMember,
} from "@/types/nominations";

export async function GET(request: NextRequest) {
  try {
    const { response: authRes } = await requirePermission(
      request,
      "selection.view",
    );
    if (authRes) return authRes;

    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season");
    const ageGroup = searchParams.get("ageGroup");
    const clubId = searchParams.get("clubId"); // optional: filter to one club

    if (clubId) {
      const { response: scopeRes } = await requireResourceAccess(
        request,
        "club",
        clubId,
      );
      if (scopeRes) return scopeRes;
    }

    if (!season || !ageGroup) {
      return NextResponse.json(
        { error: "season and ageGroup query params are required" },
        { status: 400 },
      );
    }

    const seasonYear = parseInt(season, 10);
    if (isNaN(seasonYear)) {
      return NextResponse.json({ error: "Invalid season year" }, { status: 400 });
    }

    const range = getEligibilityRange(ageGroup);
    if (!range) {
      return NextResponse.json(
        {
          error: `Unknown age group format: "${ageGroup}". Expected "Under X", "Opens", or "Masters X".`,
        },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Build member query
    const memberQuery: Record<string, unknown> = {};
    if (clubId) {
      // clubId could be slug or club.id — resolve via clubs collection first
      const club = await db
        .collection("clubs")
        .findOne({ $or: [{ id: clubId }, { slug: clubId }] });
      if (!club) {
        return NextResponse.json({ error: "Club not found" }, { status: 404 });
      }
      memberQuery.clubId = club.id;
    }

    // Fetch all (or club-specific) members
    const allMembers = await db
      .collection("members")
      .find(memberQuery, {
        projection: {
          memberId: 1,
          clubId: 1,
          "personalInfo.firstName": 1,
          "personalInfo.lastName": 1,
          "personalInfo.displayName": 1,
          "personalInfo.dateOfBirth": 1,
          "personalInfo.gender": 1,
        },
      })
      .toArray();

    // Filter by age eligibility
    const eligible = allMembers.filter((m) => {
      const dob: string = m.personalInfo?.dateOfBirth ?? "";
      if (!dob) return false;
      return isEligibleForAgeGroup(dob, ageGroup, seasonYear);
    });

    if (eligible.length === 0) {
      return NextResponse.json({
        ageGroup,
        season,
        eligibilityRange: range,
        members: [],
        total: 0,
      });
    }

    // Fetch existing nominations for this season/ageGroup to flag already-nominated
    const existingNominations = await db
      .collection("rep_nominations")
      .find({ season, ageGroup })
      .project({ memberId: 1, nominationId: 1, _id: 0 })
      .toArray();

    const nominatedSet = new Map(
      existingNominations.map((n) => [n.memberId, n.nominationId as string]),
    );

    // Fetch club names for display
    const clubIds = [...new Set(eligible.map((m) => m.clubId))];
    const clubs = await db
      .collection("clubs")
      .find({ id: { $in: clubIds } }, { projection: { id: 1, name: 1 } })
      .toArray();
    const clubNameMap = new Map(clubs.map((c) => [c.id as string, c.name as string]));

    const members: EligibleMember[] = eligible.map((m) => {
      const dob: string = m.personalInfo?.dateOfBirth ?? "";
      const nomId = nominatedSet.get(m.memberId as string);
      return {
        memberId: m.memberId as string,
        firstName: m.personalInfo?.firstName ?? "",
        lastName: m.personalInfo?.lastName ?? "",
        displayName:
          m.personalInfo?.displayName ??
          `${m.personalInfo?.firstName ?? ""} ${m.personalInfo?.lastName ?? ""}`.trim(),
        dateOfBirth: dob,
        ageAtSeason: calcAgeForSeason(dob, seasonYear),
        gender: m.personalInfo?.gender ?? "",
        clubId: m.clubId as string,
        clubName: clubNameMap.get(m.clubId as string) ?? m.clubId,
        alreadyNominated: nomId !== undefined,
        nominationId: nomId,
      };
    });

    // Sort: by club name, then last name
    members.sort((a, b) =>
      a.clubName.localeCompare(b.clubName) || a.lastName.localeCompare(b.lastName),
    );

    return NextResponse.json({
      ageGroup,
      season,
      eligibilityRange: range,
      members,
      total: members.length,
    });
  } catch (error: unknown) {
    console.error("GET /api/admin/nominations/eligible error:", error);
    return NextResponse.json(
      { error: "Failed to fetch eligible members" },
      { status: 500 },
    );
  }
}
