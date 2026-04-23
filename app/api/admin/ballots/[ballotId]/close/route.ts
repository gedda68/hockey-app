/**
 * POST /api/admin/ballots/[ballotId]/close
 *
 * Close a ballot, tally votes, and determine the outcome.
 *
 * Outcomes:
 *   winner   → one candidate has the most votes
 *              - that nomination becomes "elected"
 *              - all others become "unsuccessful"
 *              - a role_request document is inserted (status: "approved") so the
 *                election result has a full audit trail in the role-requests system
 *              - the winner's linkedRoleRequestId is stamped on the nomination
 *              - the winner's role is directly assigned to their user/member document
 *              - window moves to "completed"
 *
 *   deadlock → two or more candidates are tied at the top
 *              - if ballotNumber === 1: a second ballot is auto-created with only
 *                the tied candidates; voter invitation emails are re-sent
 *              - if ballotNumber === 2: window moves to "completed" with outcome
 *                "deadlock" for super-admin resolution
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/middleware";
import { sendBallotInvites } from "@/lib/ballots/sendBallotInvites";
import type { Ballot, NominationWindow } from "@/types/nominations";
import type { UserRole } from "@/lib/types/roles";

type Params = { params: Promise<{ ballotId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { response: authRes } = await requirePermission(req, "selection.manage");
  if (authRes) return authRes;

  const session = await getSession();
  if (!session) {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // Elect winner nomination
    await db.collection("rep_nominations").updateOne(
      { nominationId: winnerId },
      { $set: { status: "elected", updatedAt: now } }
    );

    // Mark all other candidates unsuccessful
    const loserIds = ballot.candidateNominationIds.filter((id) => id !== winnerId);
    if (loserIds.length > 0) {
      await db.collection("rep_nominations").updateMany(
        { nominationId: { $in: loserIds } },
        { $set: { status: "unsuccessful", updatedAt: now } }
      );
    }

    // ── Auto-assign role + create role_request audit record ───────────────────
    // Only applies to position-nomination windows (club-position / assoc-position)
    // that have a positionRole mapped to a UserRole.
    if (win?.positionRole) {
      const winningNom = await db
        .collection("rep_nominations")
        .findOne({ nominationId: winnerId });

      if (winningNom) {
        const nomineeType      = String((winningNom as { nomineeType?: string }).nomineeType ?? "member") as "user" | "member";
        const nomineeId        = String((winningNom as { nomineeId?: string }).nomineeId ?? "");
        const nomineeName      = String(
          (winningNom as { nomineeName?: string; memberName?: string }).nomineeName ??
          (winningNom as { memberName?: string }).memberName ?? "Unknown"
        );
        const targetCollection = nomineeType === "user" ? "users" : "members";
        const idField          = nomineeType === "user" ? "userId" : "memberId";

        if (nomineeId) {
          // 1. Create a role_request document (status: "approved") — the election
          //    itself constitutes approval so no further admin action is needed.
          //    This gives the result a full audit trail in the role-requests system.
          const requestId = `rreq-${uuidv4()}`;
          await db.collection("role_requests").insertOne({
            requestId,
            memberId:          nomineeId,       // userId for "user" accounts, memberId for "member"
            accountType:       nomineeType,
            memberName:        nomineeName,
            requestedRole:     win.positionRole as UserRole,
            scopeType:         win.scopeType,
            scopeId:           win.scopeId,
            scopeName:         win.scopeName,
            seasonYear:        win.seasonYear,
            notes:             `Elected via ballot ${ballotId} — ${win.title}`,
            requestedBy:       session.userId,
            requestedByName:   session.name,
            requestedAt:       now,
            requiresFee:       false,
            feePaid:           false,
            status:            "approved",
            reviewedAt:        now,
            reviewedBy:        session.userId,
            reviewedByName:    session.name,
            reviewerRole:      session.role,
            reviewNotes:       `Elected by ballot (${ballot.totalVotesCast}/${ballot.totalEligibleVoters} votes cast)`,
            roleAssignmentCreatedAt: now,
            // Election-specific metadata
            electedViaBallotId:       ballotId,
            electionNominationId:     winnerId,
            electionVoteCount:        tally[winnerId] ?? 0,
            electionTotalVotes:       allVotes.length,
            createdAt:        now,
            updatedAt:        now,
          });

          // 2. Stamp the requestId onto the winning nomination for cross-reference
          await db.collection("rep_nominations").updateOne(
            { nominationId: winnerId },
            { $set: { linkedRoleRequestId: requestId, roleAssignedAt: now, updatedAt: now } }
          );

          // 3. Directly assign the role to the user/member document so the
          //    session system picks it up on next login.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (db.collection(targetCollection) as any).updateOne(
            { [idField]: nomineeId },
            {
              $push: {
                roles: {
                  role:       win.positionRole,
                  scopeType:  win.scopeType,
                  scopeId:    win.scopeId,
                  scopeName:  win.scopeName,
                  grantedAt:  now,
                  grantedBy:  session.userId,
                  seasonYear: win.seasonYear,
                  notes:      `Elected via ballot ${ballotId} — role_request ${requestId}`,
                  active:     true,
                },
              },
            }
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
      message: "Ballot closed — winner elected and role request created",
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

    // Fire-and-forget: notify tied-candidate voters of the second ballot
    sendBallotInvites(db, ballot2, win!).catch((err: unknown) =>
      console.error("[ballots close] second ballot sendBallotInvites error:", err),
    );

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
