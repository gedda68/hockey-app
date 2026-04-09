// GET /api/admin/associations/[associationId]/officiating-report (F5 baseline).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAuth, requireResourceAccess } from "@/lib/auth/middleware";
import { canPreviewUmpirePayments } from "@/lib/auth/umpirePaymentAccess";
import { resolveUmpireDisplayMap } from "@/lib/officiating/resolveUmpireDisplay";

type Params = { params: Promise<{ associationId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  if (!canPreviewUmpirePayments(user)) {
    return NextResponse.json(
      { error: "Forbidden - Insufficient permissions" },
      { status: 403 },
    );
  }

  try {
    const { associationId } = await params;
    const { searchParams } = new URL(request.url);
    const seasonCompetitionId = searchParams.get("seasonCompetitionId")?.trim();

    const scope = await requireResourceAccess(
      request,
      "association",
      associationId,
    );
    if (scope.response) return scope.response;

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const fixtureQ: Record<string, unknown> = { owningAssociationId: associationId };
    if (seasonCompetitionId) fixtureQ.seasonCompetitionId = seasonCompetitionId;

    const fixtures = await db
      .collection("league_fixtures")
      .find(fixtureQ)
      .project({ fixtureId: 1, umpires: 1, seasonCompetitionId: 1, round: 1 })
      .toArray();

    let totalSlots = 0;
    const byStatus = { assigned: 0, accepted: 0, declined: 0, unspecified: 0 };
    const umpireFixtureCount = new Map<string, number>();

    for (const f of fixtures) {
      const slots = (f.umpires as unknown[] | null) ?? [];
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        const slot = s as {
          umpireId?: string;
          allocationStatus?: string;
        };
        if (!slot?.umpireId) continue;
        totalSlots++;
        const st = slot.allocationStatus ?? "assigned";
        if (st === "accepted") byStatus.accepted++;
        else if (st === "declined") byStatus.declined++;
        else if (st === "assigned") byStatus.assigned++;
        else byStatus.unspecified++;

        const uid = String(slot.umpireId);
        umpireFixtureCount.set(uid, (umpireFixtureCount.get(uid) ?? 0) + 1);
      }
    }

    const payQ: Record<string, unknown> = { associationId };
    if (seasonCompetitionId) payQ.seasonCompetitionId = seasonCompetitionId;

    const payAgg = await db
      .collection("umpire_match_payment_lines")
      .aggregate([
        { $match: payQ },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray();

    const paymentLinesByStatus: Record<string, number> = {};
    for (const p of payAgg) {
      paymentLinesByStatus[String(p._id)] = p.count;
    }

    const umpireIds = [...umpireFixtureCount.keys()];
    const displayMap = await resolveUmpireDisplayMap(db, associationId, umpireIds);

    const topUmpires = [...umpireFixtureCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([umpireId, fixturesCovered]) => ({
        umpireId,
        displayName: displayMap.get(umpireId)?.displayName ?? "",
        fixturesCovered,
      }));

    const registerCount = await db
      .collection("association_official_register")
      .countDocuments({ associationId, isActive: { $ne: false } });

    return NextResponse.json({
      associationId,
      seasonCompetitionId: seasonCompetitionId || null,
      fixtureCount: fixtures.length,
      appointmentSlots: {
        total: totalSlots,
        allocationStatus: byStatus,
      },
      paymentLinesByStatus,
      topUmpiresByFixtureCoverage: topUmpires,
      activeOfficialRegisterCount: registerCount,
    });
  } catch (error) {
    console.error("GET officiating-report error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
