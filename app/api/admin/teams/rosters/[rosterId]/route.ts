// app/api/admin/teams/rosters/[rosterId]/route.ts
// Update roster WITH MOVE HISTORY - FIXED for Next.js 15

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import {
  generateTraceId,
  logAdminTelemetry,
  logAdminError,
} from "@/lib/observability/adminTelemetry";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ rosterId: string }> },
) {
  const traceId = generateTraceId();
  try {
    // Await params in Next.js 15
    const { rosterId } = await context.params;

    const client = await clientPromise;
    const db = client.db();

    const oldRoster = await db
      .collection("teamRosters")
      .findOne({ id: rosterId });
    if (!oldRoster) {
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

    const { response: permRes } = await requirePermission(request, "team.edit");
    if (permRes) return permRes;
    if (oldRoster.clubId) {
      const { response: scopeRes } = await requireResourceAccess(
        request,
        "club",
        String(oldRoster.clubId),
      );
      if (scopeRes) return scopeRes;
    }

    const body = await request.json();
    const { moveDetails } = body;

    const userId = "admin-temp";
    const userName = "Admin User";

    let historyEntry = null;

    if (moveDetails) {
      const { player, from, to, reason } = moveDetails;

      let action = "player_moved";
      if (to.location === "unavailable") action = "player_unavailable";
      if (to.location === "emergency") action = "player_emergency";
      if (from.location === "unavailable") action = "player_returned";

      historyEntry = {
        id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        userId,
        userName,
        action,
        details: {
          playerId: player.id,
          playerName: `${player.firstName} ${player.lastName}`,
          from: {
            location: from.location,
            teamIndex: from.teamIndex,
            teamName: from.teamName,
          },
          to: {
            location: to.location,
            teamIndex: to.teamIndex,
            teamName: to.teamName,
          },
          reason: reason || undefined,
        },
      };

      if (to.location === "unavailable") {
        await db.collection("members").updateOne(
          { id: player.id },
          {
            $push: {
              unavailabilityHistory: {
                id: `unavail-${Date.now()}`,
                season: oldRoster.season,
                category: oldRoster.category,
                gender: oldRoster.gender,
                reason: reason || "Other",
                from: new Date().toISOString().split("T")[0],
                to: null,
                addedBy: userId,
                addedByName: userName,
                addedDate: new Date().toISOString(),
                removedDate: null,
                affectedDivisions: [oldRoster.division],
              },
            },
          } as unknown as import("mongodb").UpdateFilter<import("mongodb").Document>,
        );
      }

      if (from.location === "team" && to.location === "team") {
        await db.collection("members").updateOne(
          {
            id: player.id,
            "selectionHistory.teamName": from.teamName,
            "selectionHistory.deselectedDate": null,
          },
          {
            $set: {
              "selectionHistory.$.deselectedDate": new Date().toISOString(),
            },
          },
        );

        await db.collection("members").updateOne(
          { id: player.id },
          {
            $push: {
              selectionHistory: {
                id: `sel-${Date.now()}`,
                season: oldRoster.season,
                division: oldRoster.division,
                category: oldRoster.category,
                gender: oldRoster.gender,
                teamName: to.teamName,
                selectedBy: userId,
                selectedByName: userName,
                selectedDate: new Date().toISOString(),
                deselectedDate: null,
                reason: `Moved from ${from.teamName}`,
              },
            },
          } as unknown as import("mongodb").UpdateFilter<import("mongodb").Document>,
        );
      }
    }

    const updates: Record<string, unknown> = {
      ...body,
      lastUpdated: new Date().toISOString(),
    };

    if (historyEntry) {
      const prior = Array.isArray(updates.changeHistory)
        ? [...(updates.changeHistory as object[])]
        : Array.isArray(oldRoster.changeHistory)
          ? [...oldRoster.changeHistory]
          : [];
      prior.push(historyEntry);
      updates.changeHistory = prior;
    }

    delete updates.moveDetails;

    const result = await db
      .collection("teamRosters")
      .updateOne({ id: rosterId }, { $set: updates });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

    logAdminTelemetry("admin.roster.update", {
      traceId,
      rosterId,
      hasMove:    historyEntry != null,
      moveAction: historyEntry ? String(historyEntry.action ?? "") : null,
      playerId:   historyEntry ? String(historyEntry.details?.playerId ?? historyEntry.details?.playerName ?? "") : null,
    });

    return NextResponse.json({
      success: true,
      roster: updates,
      history: historyEntry,
    });
  } catch (error: unknown) {
    logAdminError("admin.roster.update.error", traceId, error);
    return NextResponse.json(
      {
        error: "Failed to update roster",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ rosterId: string }> },
) {
  try {
    // Await params in Next.js 15
    const { rosterId } = await context.params;
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get("includeHistory") === "true";

    const client = await clientPromise;
    const db = client.db();

    const roster = await db.collection("teamRosters").findOne({ id: rosterId });

    if (!roster) {
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

    const { response: permRes } = await requirePermission(request, "team.roster");
    if (permRes) return permRes;
    if (roster.clubId) {
      const { response: scopeRes } = await requireResourceAccess(
        request,
        "club",
        String(roster.clubId),
      );
      if (scopeRes) return scopeRes;
    }

    if (!includeHistory) {
      delete roster.changeHistory;
    }

    return NextResponse.json({
      roster,
      historyCount: roster.changeHistory?.length || 0,
    });
  } catch (error: unknown) {
    logAdminError("admin.roster.get.error", "no-trace", error);
    return NextResponse.json(
      {
        error: "Failed to fetch roster",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
