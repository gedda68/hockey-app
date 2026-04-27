// POST .../staff — add staff (Epic G: validated body, WWCC + public-contact flags).

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { PostTeamStaffBodySchema } from "@/lib/db/schemas/teamRosterStaff.schema";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ rosterId: string; teamIndex: string }> },
) {
  try {
    const { rosterId, teamIndex: teamIndexStr } = await context.params;
    const teamIndex = parseInt(teamIndexStr, 10);
    if (Number.isNaN(teamIndex) || teamIndex < 0) {
      return NextResponse.json({ error: "Invalid team index" }, { status: 400 });
    }

    const body = PostTeamStaffBodySchema.parse(await request.json());

    const client = await clientPromise;
    const db = client.db();

    const roster = await db.collection("teamRosters").findOne({ id: rosterId });
    if (!roster) {
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

    const { response: permRes } = await requirePermission(request, "team.edit");
    if (permRes) return permRes;
    if (roster.clubId) {
      const { response: scopeRes } = await requireResourceAccess(
        request,
        "club",
        String(roster.clubId),
      );
      if (scopeRes) return scopeRes;
    }

    if (!roster.teams || !roster.teams[teamIndex]) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const newStaff = {
      id: `staff-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      role: body.role,
      memberId: body.memberId,
      memberName: body.memberName,
      qualifications: body.qualifications ?? [],
      staffRoleCode: body.staffRoleCode,
      wwccCardNumber: body.wwccCardNumber ?? undefined,
      wwccExpiresAt: body.wwccExpiresAt ?? undefined,
      showEmailOnPublicSite: body.showEmailOnPublicSite,
      showPhoneOnPublicSite: body.showPhoneOnPublicSite,
      startDate: new Date().toISOString(),
      endDate: null,
      addedBy: "admin",
      addedDate: new Date().toISOString(),
    };

    const updatePath = `teams.${teamIndex}.staff`;
    const result = await db.collection("teamRosters").updateOne(
      { id: rosterId },
      {
        $push: { [updatePath]: newStaff },
        $set: { lastUpdated: new Date().toISOString() },
      } as unknown as import("mongodb").UpdateFilter<import("mongodb").Document>,
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Failed to add staff - no changes made" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      staff: newStaff,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Error adding staff:", err);
    return NextResponse.json(
      { error: "Failed to add staff", details: err.message },
      { status: 500 },
    );
  }
}
