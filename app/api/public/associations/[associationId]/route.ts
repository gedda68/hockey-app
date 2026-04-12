// GET /api/public/associations/[associationId]
// Epic I — minimal public association profile for hub pages (no auth secrets).

import { NextRequest, NextResponse } from "next/server";
import { getPublicAssociationById } from "@/lib/public/publicAssociation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ associationId: string }> },
) {
  try {
    const { associationId } = await params;
    if (!associationId?.trim()) {
      return NextResponse.json({ error: "associationId required" }, { status: 400 });
    }

    const profile = await getPublicAssociationById(associationId.trim());
    if (!profile) {
      return NextResponse.json({ error: "Association not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error: unknown) {
    console.error("GET /api/public/associations/[associationId] error:", error);
    return NextResponse.json(
      { error: "Failed to load association" },
      { status: 500 },
    );
  }
}
