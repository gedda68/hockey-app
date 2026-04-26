// app/api/admin/clubs/[id]/members/route.ts
// Looks up club by slug or legacy id, then returns its members.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const { response: authRes } = await requirePermission(request, "club.members");
    if (authRes) return authRes;
    const { response: scopeRes } = await requireResourceAccess(request, "club", id);
    if (scopeRes) return scopeRes;

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Resolve slug or legacy id to the actual club document
    const club = await db
      .collection("clubs")
      .findOne({ $or: [{ slug: id }, { id }] });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Use the club's canonical id field to query members
    const members = await db
      .collection("members")
      .find({ clubId: club.id })
      .toArray();

    const formatted = members.map((m) => ({
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

    return NextResponse.json({
      members: formatted,
      total: formatted.length,
    });
  } catch (error: unknown) {
    console.error("Error fetching club members:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch members",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
