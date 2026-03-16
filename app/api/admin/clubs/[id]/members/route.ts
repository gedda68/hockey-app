// app/api/admin/clubs/[clubId]/members/route.ts
// DEBUG VERSION - See exactly what's happening

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ clubId: string }> },
) {
  try {
    const { clubId } = await context.params;

    console.log("\n=== MEMBERS API DEBUG ===");
    console.log("📋 Requested clubId:", clubId);

    const client = await clientPromise;
    const db = client.db();

    // Check what collections exist
    const collections = await db.listCollections().toArray();
    console.log(
      "📁 Collections:",
      collections.map((c) => c.name),
    );

    // Count total members
    const totalMembers = await db.collection("members").countDocuments();
    console.log("📊 Total members in database:", totalMembers);

    // Get all unique clubIds
    const allClubIds = await db.collection("members").distinct("clubId");
    console.log("📋 All clubIds in members table:", allClubIds);

    // Try to find with exact clubId match
    const exactMatch = await db
      .collection("members")
      .find({ clubId: clubId })
      .limit(3)
      .toArray();

    console.log("🔍 Exact clubId match:", exactMatch.length);

    // If no exact match, try case-insensitive
    let members = exactMatch;
    if (exactMatch.length === 0) {
      const caseInsensitive = await db
        .collection("members")
        .find({ clubId: { $regex: new RegExp(`^${clubId}$`, "i") } })
        .limit(3)
        .toArray();

      console.log("🔍 Case-insensitive match:", caseInsensitive.length);
      members = caseInsensitive;
    }

    // If still no match, get a sample member to see structure
    if (members.length === 0) {
      const sampleMember = await db.collection("members").findOne({});
      console.log("\n📄 SAMPLE MEMBER STRUCTURE:");
      console.log(JSON.stringify(sampleMember, null, 2));

      // Check if any members have this in memberId instead
      const byMemberId = await db
        .collection("members")
        .find({ memberId: { $regex: /^CHC-/ } })
        .limit(3)
        .toArray();

      console.log("🔍 Found by memberId (CHC-) pattern:", byMemberId.length);

      if (byMemberId.length > 0) {
        members = byMemberId;
        console.log("✅ Using members found by memberId pattern");
      }
    }

    // Log first member if found
    if (members.length > 0) {
      console.log("\n📄 FIRST MEMBER FOUND:");
      console.log("  memberId:", members[0].memberId);
      console.log("  clubId:", members[0].clubId);
      console.log("  name:", members[0].personalInfo?.displayName);
      console.log("  status:", members[0].membership?.status);
    }

    // Format for UI
    const formatted = members.map((m: any) => ({
      id: m._id.toString(),
      firstName: m.personalInfo?.firstName || "Unknown",
      lastName: m.personalInfo?.lastName || "Unknown",
      displayName:
        m.personalInfo?.displayName ||
        `${m.personalInfo?.firstName} ${m.personalInfo?.lastName}`,
      email: m.contact?.primaryEmail,
      memberNumber: m.memberId,
      roles: m.roles || [],
      photoUrl: m.personalInfo?.photoUrl,
    }));

    console.log(`✅ Returning ${formatted.length} members\n`);

    return NextResponse.json({
      members: formatted,
      total: formatted.length,
      debug: {
        clubIdQueried: clubId,
        totalInDb: totalMembers,
        allClubIds: allClubIds,
        exactMatches: exactMatch.length,
        finalCount: members.length,
      },
    });
  } catch (error: any) {
    console.error("❌ Error:", error);
    console.error("Stack:", error.stack);
    return NextResponse.json(
      {
        error: "Failed to fetch members",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}
