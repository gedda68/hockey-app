// app/api/admin/members/[id]/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    const memberId = resolvedParams.id;

    const client = await clientPromise;
    const db = client.db();

    // Fetch change logs from member_change_logs collection
    const changes = await db
      .collection("member_change_logs")
      .find({ memberId })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      success: true,
      changes,
    });
  } catch (error: any) {
    console.error("Error fetching member change history:", error);
    return NextResponse.json(
      { error: "Failed to fetch change history" },
      { status: 500 },
    );
  }
}
