/**
 * GET /api/admin/ballots/[ballotId]
 *
 * Returns ballot details with candidate nominations and (if eligible) whether
 * the caller has already voted.
 *
 * Admins also get the vote-count breakdown when ballot is closed/completed.
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/middleware";
import type { Ballot } from "@/types/nominations";

type Params = { params: Promise<{ ballotId: string }> };

const ADMIN_ROLES = [
  "super-admin",
  "association-admin", "assoc-registrar", "assoc-selector", "assoc-committee",
  "club-admin", "registrar", "club-committee",
];

export async function GET(req: NextRequest, { params }: Params) {
  const { response: authRes } = await requirePermission(req, "profile.view");
  if (authRes) return authRes;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { ballotId } = await params;
  const client = await clientPromise;
  const db = client.db("hockey-app");

  const ballot = await db.collection("ballots").findOne({ ballotId }) as Ballot | null;
  if (!ballot) return NextResponse.json({ error: "Ballot not found" }, { status: 404 });

  const isAdmin = ADMIN_ROLES.includes(session.role);

  // Check if caller is an eligible voter
  const callerId = session.userId;
  const callerMemberId = session.memberId;
  const isEligible =
    ballot.eligibleVoterIds.includes(callerId) ||
    (callerMemberId != null && ballot.eligibleVoterIds.includes(callerMemberId));

  if (!isAdmin && !isEligible) {
    return NextResponse.json({ error: "You are not an eligible voter for this ballot" }, { status: 403 });
  }

  // Fetch candidate nominations
  const candidates = await db
    .collection("rep_nominations")
    .find({ nominationId: { $in: ballot.candidateNominationIds } })
    .toArray();

  // Check if caller has already voted
  const myVoterId = ballot.eligibleVoterIds.includes(callerId)
    ? callerId
    : callerMemberId ?? callerId;

  const myVote = await db
    .collection("ballot_votes")
    .findOne({ ballotId, voterId: myVoterId });

  // Vote counts — only visible to admins OR after ballot closes
  let voteCounts: Record<string, number> | null = null;
  if (isAdmin || ballot.status !== "open") {
    const votes = await db
      .collection("ballot_votes")
      .find({ ballotId })
      .toArray();

    voteCounts = {};
    for (const nom of ballot.candidateNominationIds) {
      voteCounts[nom] = 0;
    }
    for (const v of votes as any[]) {
      if (voteCounts[v.nominationId] !== undefined) {
        voteCounts[v.nominationId]++;
      }
    }
  }

  return NextResponse.json({
    ballot:     { ...ballot, _id: undefined },
    candidates: candidates.map((c) => ({ ...c, _id: c._id.toString() })),
    myVote:     myVote ? { nominationId: (myVote as any).nominationId, votedAt: (myVote as any).votedAt } : null,
    voteCounts,
    isEligible,
    isAdmin,
  });
}
