/**
 * GET    /api/admin/team-tournaments/[entryId]   — full entry with fee items
 * PUT    /api/admin/team-tournaments/[entryId]   — update fee items, roster, status
 * DELETE /api/admin/team-tournaments/[entryId]   — delete (draft/withdrawn only)
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import type { TeamTournamentEntry, UpdateEntryBody } from "@/types/teamTournament";
import type { RepTournamentDoc } from "@/lib/tournaments/tournamentEntryRules";
import {
  effectiveEntryRules,
  isPastInclusiveDeadline,
} from "@/lib/tournaments/tournamentEntryRules";

async function loadEntry(
  db: Awaited<ReturnType<typeof import("mongodb").MongoClient.prototype.db>>,
  entryId: string
): Promise<TeamTournamentEntry | null> {
  return db
    .collection<TeamTournamentEntry>("team_tournament_entries")
    .findOne({ entryId }) as Promise<TeamTournamentEntry | null>;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const { response } = await requirePermission(req, "registration.payments");
  if (response) return response;

  const { entryId } = await params;
  const client = await clientPromise;
  const db = client.db("hockey-app");

  const entry = await loadEntry(db, entryId);
  if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

  const scope = await requireResourceAccess(req, "club", entry.clubId);
  if (scope.response) return scope.response;

  // Enrich: look up attending member names from members + players collections
  const memberDetails: Record<string, { name: string; jerseyNumber?: number }> = {};
  if (entry.attendingMemberIds.length > 0) {
    const members = await db
      .collection("members")
      .find({ memberId: { $in: entry.attendingMemberIds } })
      .project({ memberId: 1, "personalInfo.firstName": 1, "personalInfo.lastName": 1 })
      .toArray();
    for (const m of members) {
      memberDetails[m.memberId as string] = {
        name: `${m.personalInfo?.firstName ?? ""} ${m.personalInfo?.lastName ?? ""}`.trim(),
      };
    }
  }

  // Attach member allocation summaries
  const allocations = await db
    .collection("member_tournament_fees")
    .find({ entryId })
    .toArray();

  return NextResponse.json({ entry, memberDetails, allocations });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const { response } = await requirePermission(req, "registration.payments");
  if (response) return response;

  const { entryId } = await params;
  const client = await clientPromise;
  const db = client.db("hockey-app");

  const entry = await loadEntry(db, entryId);
  if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

  const scope = await requireResourceAccess(req, "club", entry.clubId);
  if (scope.response) return scope.response;

  let body: UpdateEntryBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    body.status === "withdrawn" &&
    entry.status !== "withdrawn"
  ) {
    const tournament = await db.collection("rep_tournaments").findOne({
      tournamentId: entry.tournamentId,
    });
    const rules = effectiveEntryRules((tournament ?? {}) as RepTournamentDoc);
    if (isPastInclusiveDeadline(rules.withdrawalDeadline)) {
      return NextResponse.json(
        {
          error:
            "The withdrawal deadline for this tournament has passed. Contact the tournament host to amend the entry.",
          code: "withdrawal_closed",
        },
        { status: 400 },
      );
    }
  }

  const now = new Date();
  const updates: Partial<TeamTournamentEntry> & { updatedAt: Date } = { updatedAt: now };

  if (body.status !== undefined)              updates.status              = body.status;
  if (body.notes !== undefined)               updates.notes               = body.notes;
  if (body.attendingMemberIds !== undefined)  updates.attendingMemberIds  = body.attendingMemberIds;

  if (body.feeItems !== undefined) {
    updates.feeItems = body.feeItems;
    // Recalculate total fees
    updates.totalFeesCents = body.feeItems.reduce((s, i) => s + i.totalAmountCents, 0);
  }

  await db
    .collection("team_tournament_entries")
    .updateOne({ entryId }, { $set: updates });

  const updated = await loadEntry(db, entryId);
  return NextResponse.json({ entry: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const { response } = await requirePermission(req, "registration.payments");
  if (response) return response;

  const { entryId } = await params;
  const client = await clientPromise;
  const db = client.db("hockey-app");

  const entry = await loadEntry(db, entryId);
  if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

  const scope = await requireResourceAccess(req, "club", entry.clubId);
  if (scope.response) return scope.response;

  if (!["draft", "withdrawn"].includes(entry.status)) {
    return NextResponse.json(
      { error: "Only draft or withdrawn entries can be deleted" },
      { status: 400 }
    );
  }

  await Promise.all([
    db.collection("team_tournament_entries").deleteOne({ entryId }),
    db.collection("member_tournament_fees").deleteMany({ entryId }),
  ]);

  return NextResponse.json({ success: true });
}
