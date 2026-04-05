/**
 * POST /api/admin/ballots/[ballotId]/close
 *
 * Close a ballot, tally votes, and determine the outcome.
 *
 * Outcomes:
 *   winner   → one candidate has the most votes
 *              - that nomination becomes "elected"
 *              - all others become "unsuccessful"
 *              - window moves to "completed"
 *
 *   deadlock → two or more candidates are tied at the top
 *              - if ballotNumber === 1: a second ballot is auto-created with only
 *                the tied candidates
 *              - if ballotNumber === 2: window moves to "completed" with outcome
 *                "deadlock" for super-admin resolution
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import type { Ballot, NominationWindow } from "@/types/nominations";

type Params = { params: Promise<{ ballotId: string }> };

const ADMIN_ROLES = [
  "super-admin",
  "association-admin", "assoc-registrar", "assoc-selector",
  "club-admin", "registrar",
];

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || !ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ballotId } = await params;
  const client = await clientPromise;
  const db = client.db("hockey-app");

  const ballot = await db.collection("ballots").findOne({ ballotId }) as Ballot | null;
  if (!ballot) return NextResponse.json({ error: "Ballot not found" }, { status: 404 });

  if (ballot.status !== "open") {
    return NextResponse.json(
      { error: `Ballot is already ${ballot.status}` },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();

  // ── Tally votes ────────────────────────────────────────────────────────────
  const allVotes = await db
    .collection("ballot_votes")
    .find({ ballotId })
    .toArray();

  const tally: Record<string, number> = {};
  for (const nominationId of ballot.candidateNominationIds) {
    tally[nominationId] = 0;
  }
  for (const v of allVotes as any[]) {
    if (tally[v.nominationId] !== undefined) {
      tally[v.nominationId]++;
    }
  }

  const maxVotes = Math.max(...Object.values(tally));
  const leaders = Object.entries(tally)
    .filter(([, count]) => count === maxVotes)
    .map(([nominationId]) => nominationId);

  const outcome: "winner" | "deadlock" = leaders.length === 1 ? "winner" : "deadlock";

  // ── Mark ballot closed ───────────────────────────────────────���─────────────
  await db.collection("ballots").updateOne(
    { ballotId },
    {
      $set: {
        status:      "completed",
        outcome,
        totalVotesCast: allVotes.length,
        completedAt: now,
        ...(outcome === "winner" ? { winnerId: leaders[0] } : {}),
      },
    }
  );

  const win = await db
    .collection("nomination_windows")
    .findOne({ windowId: ballot.windowId }) as NominationWindow | null;

  // ── Handle winner ──────────────────────────────────────────────────────────
  if (outcome === "winner") {
    const winnerId = leaders[0];

    // Elect winner
    await db.collection("rep_nominations").updateOne(
      { nominationId: winnerId },
      { $set: { status: "elected", updatedAt: now } }
    );

    // Mark others unsuccessful
    const loserIds = ballot.candidateNominationIds.filter((id) => id !== winnerId);
    if (loserIds.length > 0) {
      await db.collection("rep_nominations").updateMany(
        { nominationId: { $in: loserIds } },
        { $set: { status: "unsuccessful", updatedAt: now } }
      );
    }

    // Auto-assign role if window has positionRole
    if (win?.positionRole) {
      const winningNom = await db
        .collection("rep_nominations")
        .findOne({ nominationId: winnerId });

      if (winningNom) {
        const targetCollection = (winningNom as any).nomineeType === "user" ? "users" : "members";
        const idField          = (winningNom as any).nomineeType === "user" ? "userId" : "memberId";
        const nomineeId        = (winningNom as any).nomineeId;

        if (nomineeId) {
          await db.collection(targetCollection).updateOne(
            { [idField]: nomineeId },
            {
              $push: {
                roles: {
                  role:      win.positionRole,
                  scopeType: win.scopeType,
                  scopeId:   win.scopeId,
                  scopeName: win.scopeName,
                  grantedAt: now,
                  grantedBy: session.userId,
                  seasonYear: win.seasonYear,
                  notes:     `Elected via ballot ${ballotId}`,
                  active:    true,
                } as any,
              },
            }
          );

          await db.collection("rep_nominations").updateOne(
            { nominationId: winnerId },
            { $set: { roleAssignedAt: now } }
          );
        }
      }
    }

    // Complete window
    await db.collection("nomination_windows").updateOne(
      { windowId: ballot.windowId },
      { $set: { status: "completed", updatedAt: now } }
    );

    return NextResponse.json({
      outcome,
      winnerId,
      tally,
      message: "Ballot closed — winner elected",
    });
  }

  // ── Handle deadlock ────────────────────────────────────────────────────────
  if (ballot.ballotNumber === 1) {
    // Create second ballot automatically with only tied candidates
    const defaultCloseAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const ballot2: Ballot = {
      ballotId:               `ballot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      windowId:               ballot.windowId,
      ballotNumber:           2,
      parentBallotId:         ballotId,
      candidateNominationIds: leaders,
      eligibleVoterIds:       ballot.eligibleVoterIds,
      openAt:                 now,
      closeAt:                defaultCloseAt,
      status:                 "open",
      totalEligibleVoters:    ballot.eligibleVoterIds.length,
      totalVotesCast:         0,
      createdAt:              now,
    };

    await db.collection("ballots").insertOne(ballot2);

    return NextResponse.json({
      outcome: "deadlock",
      tally,
      secondBallot: { ...ballot2, _id: undefined },
      message: `Deadlock on ballot 1 — second ballot created with ${leaders.length} tied candidates`,
    });
  }

  // ballotNumber === 2 deadlock — escalate to super-admin
  await db.collection("nomination_windows").updateOne(
    { windowId: ballot.windowId },
    { $set: { status: "completed", updatedAt: now } }
  );

  // Mark all tied candidates as still "on-ballot" (unresolved) — admin resolves manually
  return NextResponse.json({
    outcome: "deadlock",
    tally,
    message: "Second ballot deadlocked — requires super-admin resolution",
  });
}
