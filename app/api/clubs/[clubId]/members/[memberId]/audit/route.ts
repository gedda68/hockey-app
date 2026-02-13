// app/api/clubs/[clubId]/members/[memberId]/audit/route.ts
// TEMPORARY - NO AUTH VERSION FOR TESTING

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; memberId: string }> },
) {
  try {
    const { clubId: clubIdOrSlug, memberId } = await params;

    console.log("⚠️ WARNING: Auth is disabled for testing");

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Convert slug to clubId if needed
    let clubId = clubIdOrSlug;
    if (!clubIdOrSlug.startsWith("club-")) {
      const clubsCollection = db.collection("clubs");
      const club = await clubsCollection.findOne({ slug: clubIdOrSlug });
      if (club) {
        clubId = club.id;
        console.log(`✅ Converted slug "${clubIdOrSlug}" to clubId: ${clubId}`);
      }
    }

    const searchParams = new URL(request.url).searchParams;
    const action = searchParams.get("action");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = parseInt(searchParams.get("skip") || "0");

    const auditCollection = db.collection("member_audit_log");

    // Build query
    const query: any = { memberId, clubId };
    if (action && action !== "all") {
      query.action = action;
    }

    // Fetch audit logs
    const logs = await auditCollection
      .find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Get total count
    const total = await auditCollection.countDocuments(query);

    return NextResponse.json({
      logs,
      total,
      hasMore: skip + logs.length < total,
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 },
    );
  }
}
