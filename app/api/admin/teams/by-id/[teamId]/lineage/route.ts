// PATCH /api/admin/teams/by-id/[teamId]/lineage
// Set canonicalTeamId and/or append promotionHistory (A6).

import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import { requirePermission, requireResourceAccess } from "@/lib/auth/middleware";
import { TeamPromotionRecordSchema } from "@/lib/db/schemas/team.schema";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";

const PatchSchema = z.object({
  canonicalTeamId: z.string().min(1).optional(),
  appendHistory: TeamPromotionRecordSchema.optional(),
});

type Params = { params: Promise<{ teamId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, response } = await requirePermission(request, "team.edit");
  if (response) return response;

  try {
    const { teamId } = await params;
    const body = PatchSchema.parse(await request.json());

    if (!body.canonicalTeamId && !body.appendHistory) {
      return NextResponse.json(
        { error: "Provide canonicalTeamId and/or appendHistory" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const team = await db.collection("teams").findOne({ teamId });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const scope = await requireResourceAccess(
      request,
      "club",
      team.clubId as string,
    );
    if (scope.response) return scope.response;

    const $set: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
      updatedBy: user.userId,
    };
    const $push: Record<string, unknown> = {};

    if (body.canonicalTeamId !== undefined) {
      $set.canonicalTeamId = body.canonicalTeamId;
    }
    if (body.appendHistory) {
      const rec = {
        ...body.appendHistory,
        recordedAt: body.appendHistory.recordedAt ?? new Date().toISOString(),
      };
      $push.promotionHistory = rec;
    }

    const update: Record<string, unknown> = { $set };
    if (Object.keys($push).length) update.$push = $push;

    await db.collection("teams").updateOne({ teamId }, update);

    const updated = await db.collection("teams").findOne({ teamId });

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "team_lineage",
      action: "patch",
      resourceType: "team",
      resourceId: teamId,
      summary: "Updated team lineage / canonical id",
      after: {
        canonicalTeamId: updated?.canonicalTeamId,
        promotionHistory: updated?.promotionHistory,
      },
      metadata: { clubId: team.clubId },
    });

    return NextResponse.json({ team: updated });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
