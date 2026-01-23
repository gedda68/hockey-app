// app/api/admin/clubs/[clubId]/changelog/route.ts
// Get change log for a specific club

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    console.log("[GET] Fetching changelog for club:", clubId);

    const client = await clientPromise;
    const db = client.db("hockey-app");
    const changeLogsCollection = db.collection("club_change_logs");

    // Get all changes for this club, sorted by timestamp descending
    const changes = await changeLogsCollection
      .find({ clubId })
      .sort({ timestamp: -1 })
      .toArray();

    // Remove MongoDB _id
    const changesData = changes.map(({ _id, ...change }) => change);

    console.log("[GET] Found", changesData.length, "changes for club");

    return NextResponse.json(changesData);
  } catch (error: any) {
    console.error("[GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch changelog" },
      { status: 500 }
    );
  }
}
