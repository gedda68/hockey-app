// GET /api/admin/associations/[associationId]/officiating-report (F5 + follow-up).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAuth, requireResourceAccess } from "@/lib/auth/middleware";
import { canPreviewUmpirePayments } from "@/lib/auth/umpirePaymentAccess";
import { resolveUmpireDisplayMap } from "@/lib/officiating/resolveUmpireDisplay";

type Params = { params: Promise<{ associationId: string }> };

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

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
    const seasonCompetitionId = searchParams.get("seasonCompetitionId")?.trim() || null;
    const dateFrom = searchParams.get("dateFrom")?.trim() || null;
    const dateTo = searchParams.get("dateTo")?.trim() || null;
    const format = searchParams.get("format")?.trim().toLowerCase() || "json";

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
    if (dateFrom || dateTo) {
      const range: Record<string, string> = {};
      if (dateFrom) range.$gte = `${dateFrom}T00:00:00.000Z`;
      if (dateTo) range.$lte = `${dateTo}T23:59:59.999Z`;
      fixtureQ.scheduledStart = range;
    }

    const fixtures = await db
      .collection("league_fixtures")
      .find(fixtureQ)
      .project({
        fixtureId: 1,
        umpires: 1,
        seasonCompetitionId: 1,
        round: 1,
        scheduledStart: 1,
        venueName: 1,
        homeTeamId: 1,
        awayTeamId: 1,
      })
      .toArray();

    let totalSlots = 0;
    const byStatus = { assigned: 0, accepted: 0, declined: 0, unspecified: 0 };
    const umpireFixtureCount = new Map<string, number>();
    const clubTouches = new Map<string, number>();
    const regionTouches = new Map<string, number>();

    const teamIds = new Set<string>();
    for (const f of fixtures) {
      const ht = f.homeTeamId;
      const at = f.awayTeamId;
      if (typeof ht === "string" && ht) teamIds.add(ht);
      if (typeof at === "string" && at) teamIds.add(at);
    }

    const teamList = [...teamIds];
    const teamRows =
      teamList.length > 0
        ? await db
            .collection("teams")
            .find({ teamId: { $in: teamList } })
            .project({ teamId: 1, clubId: 1 })
            .toArray()
        : [];

    const teamToClub = new Map<string, string>();
    const clubIds = new Set<string>();
    for (const t of teamRows) {
      const tid = typeof t.teamId === "string" ? t.teamId : "";
      const cid = typeof t.clubId === "string" ? t.clubId : "";
      if (tid && cid) {
        teamToClub.set(tid, cid);
        clubIds.add(cid);
      }
    }

    const clubList = [...clubIds];
    const clubRows =
      clubList.length > 0
        ? await db
            .collection("clubs")
            .find({ id: { $in: clubList } })
            .project({ id: 1, name: 1, displayName: 1 })
            .toArray()
        : [];
    const clubNameById = new Map<string, string>();
    for (const c of clubRows) {
      const id = typeof c.id === "string" ? c.id : "";
      if (!id) continue;
      const label =
        (typeof c.displayName === "string" && c.displayName.trim()) ||
        (typeof c.name === "string" && c.name.trim()) ||
        id;
      clubNameById.set(id, label);
    }

    const registerRows = await db
      .collection("association_official_register")
      .find({ associationId, isActive: { $ne: false } })
      .project({ memberId: 1, umpireNumber: 1, homeRegion: 1 })
      .toArray();

    const regionByUmpireKey = new Map<string, string>();
    for (const r of registerRows) {
      const regionRaw = r.homeRegion;
      const region =
        typeof regionRaw === "string" && regionRaw.trim()
          ? regionRaw.trim()
          : "Unspecified";
      const mid = r.memberId;
      if (typeof mid === "string" && mid.trim()) {
        regionByUmpireKey.set(mid.trim(), region);
      }
      const num = r.umpireNumber;
      if (typeof num === "string" && num.trim()) {
        regionByUmpireKey.set(num.trim(), region);
      }
    }

    const csvLines: string[] = [];
    if (format === "csv") {
      csvLines.push(
        [
          "fixtureId",
          "seasonCompetitionId",
          "round",
          "scheduledStart",
          "venueName",
          "homeTeamId",
          "awayTeamId",
          "homeClubId",
          "awayClubId",
          "homeClubName",
          "awayClubName",
          "slotIndex",
          "umpireType",
          "umpireId",
          "allocationStatus",
          "isStandby",
          "officialHomeRegion",
        ].join(","),
      );
    }

    for (const f of fixtures) {
      const slots = (f.umpires as unknown[] | null) ?? [];
      if (!Array.isArray(slots)) continue;

      const homeTeamId = typeof f.homeTeamId === "string" ? f.homeTeamId : "";
      const awayTeamId = typeof f.awayTeamId === "string" ? f.awayTeamId : "";
      const homeClubId = homeTeamId ? teamToClub.get(homeTeamId) ?? "" : "";
      const awayClubId = awayTeamId ? teamToClub.get(awayTeamId) ?? "" : "";
      const homeClubName = homeClubId ? clubNameById.get(homeClubId) ?? "" : "";
      const awayClubName = awayClubId ? clubNameById.get(awayClubId) ?? "" : "";

      slots.forEach((raw, slotIndex) => {
        const slot = raw as {
          umpireId?: string;
          allocationStatus?: string;
          isStandby?: boolean;
          umpireType?: string;
        };
        if (!slot?.umpireId) return;
        totalSlots++;
        const st = slot.allocationStatus ?? "assigned";
        if (st === "accepted") byStatus.accepted++;
        else if (st === "declined") byStatus.declined++;
        else if (st === "assigned") byStatus.assigned++;
        else byStatus.unspecified++;

        const uid = String(slot.umpireId);
        umpireFixtureCount.set(uid, (umpireFixtureCount.get(uid) ?? 0) + 1);

        const standby = Boolean(slot.isStandby);
        if (!standby) {
          if (homeClubId) {
            clubTouches.set(homeClubId, (clubTouches.get(homeClubId) ?? 0) + 1);
          }
          if (awayClubId) {
            clubTouches.set(awayClubId, (clubTouches.get(awayClubId) ?? 0) + 1);
          }
          const reg = regionByUmpireKey.get(uid) ?? "Unspecified";
          regionTouches.set(reg, (regionTouches.get(reg) ?? 0) + 1);
        }

        if (format === "csv") {
          const row = [
            csvEscape(String(f.fixtureId)),
            csvEscape(String(f.seasonCompetitionId)),
            String(typeof f.round === "number" ? f.round : ""),
            csvEscape(
              f.scheduledStart != null ? String(f.scheduledStart) : "",
            ),
            csvEscape(f.venueName != null ? String(f.venueName) : ""),
            csvEscape(homeTeamId),
            csvEscape(awayTeamId),
            csvEscape(homeClubId),
            csvEscape(awayClubId),
            csvEscape(homeClubName),
            csvEscape(awayClubName),
            String(slotIndex),
            csvEscape(String(slot.umpireType ?? "")),
            csvEscape(uid),
            csvEscape(st),
            standby ? "1" : "0",
            csvEscape(regionByUmpireKey.get(uid) ?? ""),
          ];
          csvLines.push(row.join(","));
        }
      });
    }

    if (format === "csv") {
      const body = "\uFEFF" + csvLines.join("\r\n");
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="officiating-report-${associationId}.csv"`,
        },
      });
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

    const byClub = [...clubTouches.entries()]
      .map(([clubId, slotTouches]) => ({
        clubId,
        clubName: clubNameById.get(clubId) ?? clubId,
        slotTouches,
      }))
      .sort((a, b) => b.slotTouches - a.slotTouches);

    const byRegion = [...regionTouches.entries()]
      .map(([region, slotCount]) => ({ region, slotCount }))
      .sort((a, b) => b.slotCount - a.slotCount);

    const allocTotal =
      byStatus.assigned +
      byStatus.accepted +
      byStatus.declined +
      byStatus.unspecified;

    return NextResponse.json({
      associationId,
      seasonCompetitionId,
      dateFrom,
      dateTo,
      fixtureCount: fixtures.length,
      appointmentSlots: {
        total: totalSlots,
        allocationStatus: byStatus,
      },
      allocationStatusFractions:
        allocTotal > 0
          ? {
              assigned: byStatus.assigned / allocTotal,
              accepted: byStatus.accepted / allocTotal,
              declined: byStatus.declined / allocTotal,
              unspecified: byStatus.unspecified / allocTotal,
            }
          : {
              assigned: 0,
              accepted: 0,
              declined: 0,
              unspecified: 0,
            },
      paymentLinesByStatus,
      topUmpiresByFixtureCoverage: topUmpires,
      activeOfficialRegisterCount: registerCount,
      byClub,
      byRegion,
    });
  } catch (error) {
    console.error("GET officiating-report error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
