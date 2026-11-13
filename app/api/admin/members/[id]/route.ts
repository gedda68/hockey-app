// app/api/admin/members/[id]/route.ts
// Members API - Get, Update, Delete individual member

import { NextRequest, NextResponse } from "next/server";
import { applyBlueCardUpdate, canVerifyBlueCard, memberClubId } from "@/lib/members/blueCardWorkflow";
import { notifyBlueCardVerifier } from "@/lib/notifications/blueCardVerification";
import { computePlayerStats } from "@/lib/members/playerStats";
import { buildTeamHistory } from "@/lib/members/teamHistory";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/middleware";
import {
  assertMemberInSessionScope,
  type MemberScopeDoc,
} from "@/lib/auth/memberRouteScope";
import {
  generateTraceId,
  logAdminTelemetry,
  logAdminError,
} from "@/lib/observability/adminTelemetry";

// GET - Get single member by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { response: authRes } = await requirePermission(request, "member.view");
    if (authRes) return authRes;

    const { id } = await context.params;

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const member = await db.collection("members").findOne({ memberId: id });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const scope = await assertMemberInSessionScope(request, member as MemberScopeDoc);
    if (scope) return scope;

    // Related records so the profile can show everything stored about this member.
    const [clubRegs, assocRegs] = await Promise.all([
      db.collection("clubRegistrations").find({ memberId: id }).sort({ seasonYear: -1 }).limit(50).toArray(),
      db.collection("associationRegistrations").find({ memberId: id }).sort({ seasonYear: -1 }).limit(50).toArray(),
    ]);
    const clubIds = [
      ...new Set([
        member.clubId,
        member.membership?.clubId,
        ...clubRegs.map((r) => r.clubId),
      ].filter((v): v is string => typeof v === "string" && !!v)),
    ];
    const assocIds = [...new Set(assocRegs.map((r) => r.associationId).filter(Boolean))];
    const [clubDocs, assocDocs] = await Promise.all([
      clubIds.length
        ? db.collection("clubs").find({ $or: [{ id: { $in: clubIds } }, { clubId: { $in: clubIds } }, { slug: { $in: clubIds } }] }).toArray()
        : [],
      assocIds.length ? db.collection("associations").find({ associationId: { $in: assocIds } }).toArray() : [],
    ]);
    const clubNames: Record<string, string> = {};
    for (const c of clubDocs) for (const k of [c.id, c.clubId, c.slug]) if (k) clubNames[String(k)] = String(c.name ?? "");
    const assocNames: Record<string, string> = {};
    for (const a of assocDocs) assocNames[String(a.associationId)] = String(a.name ?? "");

    // Match line-ups / events, team rosters and team names: games, goals and team history.
    const lineups = await db
      .collection("fixture_lineups")
      .find(
        { $or: [{ "players.memberId": id }, { "staff.memberId": id }] },
        { projection: { fixtureId: 1, teamId: 1, players: 1, staff: 1 } },
      )
      .limit(2000)
      .toArray();
    const fixtures = lineups.length
      ? await db
          .collection("league_fixtures")
          .find(
            { fixtureId: { $in: lineups.map((l) => String(l.fixtureId)) } },
            { projection: { fixtureId: 1, scheduledStart: 1, status: 1, matchEvents: 1 } },
          )
          .toArray()
      : [];
    const playerStats = computePlayerStats(id, lineups, fixtures, new Date(), member.playerInfo?.appearances, member.playerInfo?.goals);

    const rosters = await db
      .collection("teamRosters")
      .find({
        $or: [
          { "teams.players.id": id },
          { "teams.players.playerId": id },
          { "teams.coach.memberId": id },
          { "teams.assistantCoach.memberId": id },
          { "teams.manager.memberId": id },
          { "teams.staff.memberId": id },
        ],
      })
      .limit(200)
      .toArray();
    const lineupTeamIds = [...new Set(lineups.map((l) => String(l.teamId)).filter(Boolean))];
    const teamDocs = lineupTeamIds.length
      ? await db.collection("teams").find({ teamId: { $in: lineupTeamIds } }, { projection: { teamId: 1, name: 1, displayName: 1 } }).toArray()
      : [];
    const teamNames = new Map(teamDocs.map((t) => [String(t.teamId), String(t.displayName ?? t.name ?? t.teamId)]));
    const teamHistory = buildTeamHistory({ memberId: id, rosters, memberTeams: member.teams ?? [], lineups, fixtures, teamNames });

    // Names of related members (family), so the profile can show names rather than ids.
    const relatedIds = [
      ...new Set(
        [
          ...(member.personalInfo?.relatedMembers ?? []),
          ...(member.familyRelationships ?? []),
          ...(member.emergencyContacts ?? []),
        ]
          .map((r: any) => (typeof r === "string" ? r : r?.memberId ?? r?.relatedMemberId ?? r?.linkedMemberId))
          .filter((v: unknown): v is string => typeof v === "string" && !!v),
      ),
    ];
    const memberNames: Record<string, string> = {};
    if (relatedIds.length) {
      const docs = await db
        .collection("members")
        .find({ memberId: { $in: relatedIds } }, { projection: { memberId: 1, personalInfo: 1 } })
        .toArray();
      for (const d of docs) memberNames[String(d.memberId)] = `${d.personalInfo?.firstName ?? ""} ${d.personalInfo?.lastName ?? ""}`.trim();
    }

    return NextResponse.json({
      member,
      playerStats,
      teamHistory,
      related: {
        memberNames,
        clubNames,
        associationNames: assocNames,
        clubRegistrations: clubRegs.map(({ _id, ...r }) => r),
        associationRegistrations: assocRegs.map(({ _id, ...r }) => r),
      },
    });
  } catch (error: unknown) {
    logAdminError("admin.member.get.error", "no-trace", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// PUT - Update member
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const traceId = generateTraceId();
  try {
    const { response: authRes } = await requirePermission(request, "member.edit");
    if (authRes) return authRes;

    const session = await getSession();
    const resolvedParams = await params;
    const memberId = resolvedParams.id;
    const body = await request.json();

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const existing = await db.collection("members").findOne({ memberId });
    if (!existing) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    const scopePut = await assertMemberInSessionScope(request, existing as MemberScopeDoc);
    if (scopePut) return scopePut;

    // Extract change log if provided
    const changeLog = body._changeLog;
    delete body._changeLog; // Remove from member data

    // Strip immutable / identity fields that must never appear in $set
    const { _id, memberId: _mid, createdAt, ...updateData } = body;

    // Update timestamp
    updateData.updatedAt = new Date().toISOString();

    // Blue card: only a club admin may change the verification fields; a nominated verifier is notified.
    let blueCardNotify: { verifierMemberId: string } | null = null;
    if (updateData.blueCard && typeof updateData.blueCard === "object") {
      const result = applyBlueCardUpdate({
        existing: existing.blueCard,
        incoming: updateData.blueCard,
        canVerify: canVerifyBlueCard(session as any, existing),
        actor: session as any,
      });
      updateData.blueCard = result.blueCard;
      if (result.notifyVerifier && result.verifierMemberId) blueCardNotify = { verifierMemberId: result.verifierMemberId };
    }

    // Update member
    const result = await db
      .collection("members")
      .updateOne({ memberId }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (blueCardNotify) {
      try {
        const club = await db.collection("clubs").findOne({ $or: [{ id: memberClubId(existing) }, { clubId: memberClubId(existing) }] });
        await notifyBlueCardVerifier(db, {
          member: { ...existing, memberId },
          verifierMemberId: blueCardNotify.verifierMemberId,
          requestedBy: session?.name || [session?.firstName, session?.lastName].filter(Boolean).join(" ") || undefined,
          clubName: club?.name ? String(club.name) : undefined,
        });
      } catch (e) {
        console.error("Blue card verification notice failed", e); // the save itself succeeded
      }
    }

    // Log changes if provided
    if (changeLog && Object.keys(changeLog.changes).length > 0) {
      await db.collection("member_change_logs").insertOne({
        memberId,
        section: changeLog.section,
        changes: changeLog.changes,
        timestamp: changeLog.timestamp,
        updatedBy: session?.email || session?.userId || "system",
        updatedAt: new Date().toISOString(),
      });
    }

    // Fetch updated member
    const updatedMember = await db.collection("members").findOne({ memberId });

    logAdminTelemetry("admin.member.update", {
      traceId,
      memberId,
      updatedBy:   session?.userId ?? null,
      updaterRole: session?.role   ?? null,
      hasChangeLog: changeLog ? Object.keys(changeLog.changes).length > 0 : false,
    });

    return NextResponse.json({
      success: true,
      member: updatedMember,
    });
  } catch (error: unknown) {
    logAdminError("admin.member.update.error", traceId, error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update member",
      },
      { status: 500 },
    );
  }
}

// DELETE - Delete/Deactivate member
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const traceId = generateTraceId();
  try {
    const { response: authRes } = await requirePermission(request, "member.delete");
    if (authRes) return authRes;

    const session = await getSession();
    const { id } = await context.params;

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Check if member exists
    const member = await db.collection("members").findOne({ memberId: id });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const scopeDel = await assertMemberInSessionScope(request, member as MemberScopeDoc);
    if (scopeDel) return scopeDel;

    // Soft delete - set status to Inactive
    await db.collection("members").updateOne(
      { memberId: id },
      {
        $set: {
          "membership.status": "Inactive",
          updatedAt: new Date().toISOString(),
          updatedBy: session?.email || session?.userId || "system",
        },
      },
    );

    logAdminTelemetry("admin.member.deactivate", {
      traceId,
      memberId: id,
      deactivatedBy:   session?.userId ?? null,
      deactivatorRole: session?.role   ?? null,
    });

    return NextResponse.json({
      message: "Member deactivated successfully",
    });
  } catch (error: unknown) {
    logAdminError("admin.member.deactivate.error", traceId, error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
