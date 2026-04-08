/**
 * POST /api/admin/ballots/[ballotId]/vote
 *
 * Cast a vote in an open ballot.
 * - One vote per eligible voter per ballot.
 * - Vote is private — other voters cannot see the breakdown while ballot is open.
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/middleware";
import type { Ballot, BallotVote } from "@/types/nominations";

type Params = { params: Promise<{ ballotId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { response: authRes } = await requirePermission(req, "profile.view");
  if (authRes) return authRes;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { ballotId } = await params;
  const body = await req.json() as { nominationId: string };

  if (!body.nominationId) {
    return NextResponse.json({ error: "nominationId is required" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db("hockey-app");

  const ballot = await db.collection("ballots").findOne({ ballotId }) as Ballot | null;
  if (!ballot) return NextResponse.json({ error: "Ballot not found" }, { status: 404 });

  if (ballot.status !== "open") {
    return NextResponse.json(
      { error: `This ballot is ${ballot.status} and no longer accepting votes` },
      { status: 409 }
    );
  }

  // Check the ballot hasn't passed its close date
  if (new Date() > new Date(ballot.closeAt)) {
    return NextResponse.json({ error: "Voting period has ended" }, { status: 409 });
  }

  // Verify caller is an eligible voter
  const callerId = session.userId;
  const callerMemberId = session.memberId ?? null;
  const voterId = ballot.eligibleVoterIds.includes(callerId)
    ? callerId
    : (callerMemberId && ballot.eligibleVoterIds.includes(callerMemberId))
      ? callerMemberId
      : null;

  if (!voterId) {
    return NextResponse.json({ error: "You are not an eligible voter for this ballot" }, { status: 403 });
  }

  // Prevent double-voting
  const existing = await db.collection("ballot_votes").findOne({ ballotId, voterId });
  if (existing) {
    return NextResponse.json({ error: "You have already cast your vote in this ballot" }, { status: 409 });
  }

  // Validate candidate
  if (!ballot.candidateNominationIds.includes(body.nominationId)) {
    return NextResponse.json({ error: "Invalid candidate" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const vote: BallotVote = {
    voteId:       `vote-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ballotId,
    voterId,
    voterType:    ballot.eligibleVoterIds.includes(callerId) ? "user" : "member",
    nominationId: body.nominationId,
    votedAt:      now,
  };

  await db.collection("ballot_votes").insertOne(vote);

  // Update running total
  await db.collection("ballots").updateOne(
    { ballotId },
    { $inc: { totalVotesCast: 1 } }
  );

  return NextResponse.json({ success: true, votedAt: now });
}
