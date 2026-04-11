// PATCH/DELETE .../staff/[staffId] — Epic G validated PATCH fields.

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { PatchTeamStaffBodySchema } from "@/lib/db/schemas/teamRosterStaff.schema";

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ rosterId: string; teamIndex: string; staffId: string }>;
  },
) {
  try {
    const { rosterId, teamIndex: teamIndexStr, staffId } = await context.params;
    const teamIndex = parseInt(teamIndexStr, 10);
    if (Number.isNaN(teamIndex) || teamIndex < 0) {
      return NextResponse.json({ error: "Invalid team index" }, { status: 400 });
    }

    const body = PatchTeamStaffBodySchema.parse(await request.json());

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const roster = await db.collection("teamRosters").findOne({ id: rosterId });
    if (!roster) {
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

    const { response: patchPermRes } = await requirePermission(request, "team.edit");
    if (patchPermRes) return patchPermRes;
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

    const staffIndex = roster.teams[teamIndex].staff?.findIndex(
      (s: { id?: string }) => s.id === staffId,
    );

    if (staffIndex === -1 || staffIndex === undefined) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 },
      );
    }

    const updatePath = `teams.${teamIndex}.staff.${staffIndex}`;
    const updates: Record<string, unknown> = {};

    const assign = (key: string, v: unknown) => {
      updates[`${updatePath}.${key}`] = v;
    };

    if (body.role !== undefined) assign("role", body.role);
    if (body.memberId !== undefined) assign("memberId", body.memberId);
    if (body.memberName !== undefined) assign("memberName", body.memberName);
    if (body.qualifications !== undefined)
      assign("qualifications", body.qualifications);
    if (body.staffRoleCode !== undefined)
      assign("staffRoleCode", body.staffRoleCode);
    if (body.wwccCardNumber !== undefined)
      assign("wwccCardNumber", body.wwccCardNumber);
    if (body.wwccExpiresAt !== undefined)
      assign("wwccExpiresAt", body.wwccExpiresAt);
    if (body.showEmailOnPublicSite !== undefined)
      assign("showEmailOnPublicSite", body.showEmailOnPublicSite);
    if (body.showPhoneOnPublicSite !== undefined)
      assign("showPhoneOnPublicSite", body.showPhoneOnPublicSite);

    const result = await db.collection("teamRosters").updateOne(
      { id: rosterId },
      {
        $set: {
          ...updates,
          lastUpdated: new Date().toISOString(),
        },
      },
    );

    return NextResponse.json({
      success: true,
      modified: result.modifiedCount > 0,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("Error updating staff:", error);
    return NextResponse.json(
      {
        error: "Failed to update staff",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{ rosterId: string; teamIndex: string; staffId: string }>;
  },
) {
  try {
    const { rosterId, teamIndex: teamIndexStr, staffId } = await context.params;
    const teamIndex = parseInt(teamIndexStr, 10);

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const roster = await db.collection("teamRosters").findOne({ id: rosterId });
    if (!roster) {
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

    const { response: delPermRes } = await requirePermission(request, "team.edit");
    if (delPermRes) return delPermRes;
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

    const staffMember = roster.teams[teamIndex].staff?.find(
      (s: { id?: string }) => s.id === staffId,
    );

    if (!staffMember) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 },
      );
    }

    const result = await db.collection("teamRosters").updateOne(
      { id: rosterId },
      {
        $pull: {
          [`teams.${teamIndex}.staff`]: { id: staffId },
        },
        $set: {
          lastUpdated: new Date().toISOString(),
        },
      } as unknown as import("mongodb").UpdateFilter<import("mongodb").Document>,
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Failed to remove staff" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      removed: true,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Error deleting staff:", err);
    return NextResponse.json(
      { error: "Failed to delete staff", details: err.message },
      { status: 500 },
    );
  }
}
