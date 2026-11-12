// GET/POST/DELETE /api/admin/season-competitions/[seasonCompetitionId]/points-adjustments
// Ladder penalties / bonuses. Every change needs a reason and is audited.

import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import clientPromise from "@/lib/mongodb";
import { requireAnyPermission, requireResourceAccess } from "@/lib/auth/middleware";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";
import { invalidateStandingsBundleCache } from "@/lib/competitions/standingsReadCache";
import type { PointsAdjustment } from "@/lib/competitions/pointsAdjustments";

type Params = { params: Promise<{ seasonCompetitionId: string }> };

const PostSchema = z.object({
  teamId: z.string().min(1),
  points: z.number().int().min(-100).max(100).refine((n) => n !== 0, "Points can't be zero"),
  reason: z.string().trim().min(3, "A reason is required").max(500),
});
const DeleteSchema = z.object({
  adjustmentId: z.string().min(1),
  reason: z.string().trim().min(3, "A reason is required").max(500),
});

async function ctx(request: NextRequest, p: Awaited<Params["params"]>) {
  const { user, response } = await requireAnyPermission(request, ["competitions.manage", "results.manage"]);
  if (response) return { error: response } as const;
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");
  const sc = await db.collection("season_competitions").findOne({ seasonCompetitionId: p.seasonCompetitionId });
  if (!sc) return { error: NextResponse.json({ error: "Competition not found" }, { status: 404 }) } as const;
  const scope = await requireResourceAccess(request, "association", sc.owningAssociationId as string);
  if (scope.response) return { error: scope.response } as const;
  return { user, db, sc } as const;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const c = await ctx(request, await params);
    if ("error" in c) return c.error;
    return NextResponse.json({ adjustments: (c.sc.pointsAdjustments as PointsAdjustment[]) ?? [] });
  } catch (e) {
    console.error("points-adjustments GET failed:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const p = await params;
    const c = await ctx(request, p);
    if ("error" in c) return c.error;
    const body = PostSchema.parse(await request.json());
    const adj: PointsAdjustment = {
      adjustmentId: `adj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      teamId: body.teamId, points: body.points, reason: body.reason,
      createdAt: new Date().toISOString(), createdBy: c.user.userId,
    };
    await c.db.collection("season_competitions").updateOne(
      { seasonCompetitionId: p.seasonCompetitionId },
      { $push: { pointsAdjustments: adj } } as never,
    );
    invalidateStandingsBundleCache(p.seasonCompetitionId);
    await logPlatformAudit({
      userId: c.user.userId, userEmail: c.user.email, category: "ladder", action: "points_adjustment_add",
      resourceType: "season_competition", resourceId: p.seasonCompetitionId,
      summary: `${body.points > 0 ? "+" : ""}${body.points} points for ${body.teamId}`,
      after: adj, metadata: { reason: body.reason },
    });
    return NextResponse.json({ adjustment: adj }, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid", details: e.issues }, { status: 400 });
    console.error("points-adjustments POST failed:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const p = await params;
    const c = await ctx(request, p);
    if ("error" in c) return c.error;
    const body = DeleteSchema.parse(await request.json());
    const existing = ((c.sc.pointsAdjustments as PointsAdjustment[]) ?? []).find((a) => a.adjustmentId === body.adjustmentId);
    if (!existing) return NextResponse.json({ error: "Adjustment not found" }, { status: 404 });
    await c.db.collection("season_competitions").updateOne(
      { seasonCompetitionId: p.seasonCompetitionId },
      { $pull: { pointsAdjustments: { adjustmentId: body.adjustmentId } } } as never,
    );
    invalidateStandingsBundleCache(p.seasonCompetitionId);
    await logPlatformAudit({
      userId: c.user.userId, userEmail: c.user.email, category: "ladder", action: "points_adjustment_remove",
      resourceType: "season_competition", resourceId: p.seasonCompetitionId,
      summary: `Removed ${existing.points} point adjustment for ${existing.teamId}`,
      before: existing, metadata: { reason: body.reason },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid", details: e.issues }, { status: 400 });
    console.error("points-adjustments DELETE failed:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
