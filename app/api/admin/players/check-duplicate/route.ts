// app/api/admin/players/check-duplicate/route.ts
// Case-insensitive match on firstName + lastName + dateOfBirth in the members
// collection. Optionally scoped to a single club via the clubId body field.

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/middleware";
import clientPromise from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const { response: authRes } = await requirePermission(
      request,
      "member.create",
    );
    if (authRes) return authRes;

    const body = await request.json();
    const { firstName, lastName, dateOfBirth, clubId, excludeMemberId } = body as {
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string;
      clubId?: string;
      excludeMemberId?: string; // skip this member when editing an existing record
    };

    if (!firstName || !lastName || !dateOfBirth) {
      return NextResponse.json(
        { error: "firstName, lastName, and dateOfBirth are required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const query: Record<string, unknown> = {
      "personalInfo.firstName": {
        $regex: new RegExp(`^${escapeRegex(firstName.trim())}$`, "i"),
      },
      "personalInfo.lastName": {
        $regex: new RegExp(`^${escapeRegex(lastName.trim())}$`, "i"),
      },
      "personalInfo.dateOfBirth": dateOfBirth,
    };

    if (clubId) {
      query.clubId = clubId;
    }

    if (excludeMemberId) {
      query.memberId = { $ne: excludeMemberId };
    }

    const existingMember = await db.collection("members").findOne(query, {
      projection: {
        memberId: 1,
        clubId: 1,
        "personalInfo.firstName": 1,
        "personalInfo.lastName": 1,
        "personalInfo.dateOfBirth": 1,
      },
    });

    if (existingMember) {
      return NextResponse.json({
        isDuplicate: true,
        existingMember: {
          memberId: existingMember.memberId,
          firstName: existingMember.personalInfo?.firstName,
          lastName: existingMember.personalInfo?.lastName,
          dateOfBirth: existingMember.personalInfo?.dateOfBirth,
          clubId: existingMember.clubId,
        },
      });
    }

    return NextResponse.json({ isDuplicate: false });
  } catch (error: unknown) {
    console.error("❌ Error checking duplicate member:", error);
    return NextResponse.json(
      {
        error: "Failed to check duplicate",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/** Escape special regex characters in user-supplied strings */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
