// app/api/admin/players/next-registration-number/route.ts
// Returns the next available registration number for a club's members.
// Scans the members collection for the highest numeric suffix in memberId
// or registrationNumber fields, then returns (max + 1) padded to 10 digits.

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/middleware";
import clientPromise from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const { response: authRes } = await requirePermission(
      request,
      "member.create",
    );
    if (authRes) return authRes;

    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get("clubId");

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    // Build the query — scope to club when provided
    const query: Record<string, unknown> = {};
    if (clubId) {
      query.clubId = clubId;
    }

    // Fetch all memberIds for the club (lightweight projection)
    const members = await db
      .collection("members")
      .find(query, {
        projection: { memberId: 1, "membership.registrationNumber": 1 },
      })
      .toArray();

    let maxNumber = 0;

    for (const member of members) {
      // Check registrationNumber first (explicit field), then fall back to memberId
      const candidates: unknown[] = [
        member.membership?.registrationNumber,
        member.memberId,
      ];

      for (const raw of candidates) {
        if (!raw) continue;
        const str = String(raw);
        // Extract the longest run of digits from the value
        const match = str.match(/(\d+)/g);
        if (match) {
          for (const m of match) {
            const n = parseInt(m, 10);
            if (n > maxNumber) maxNumber = n;
          }
        }
      }
    }

    const nextNumber = maxNumber + 1;
    const formattedNumber = nextNumber.toString().padStart(10, "0");

    return NextResponse.json({
      nextNumber: formattedNumber,
      lastNumber: maxNumber,
    });
  } catch (error: unknown) {
    console.error("❌ Error getting next registration number:", error);
    return NextResponse.json(
      {
        error: "Failed to get next registration number",
        nextNumber: "0000000001", // Fallback
      },
      { status: 500 },
    );
  }
}
