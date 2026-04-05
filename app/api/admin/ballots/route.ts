/**
 * POST /api/admin/ballots
 *
 * Create a ballot from a closed nomination window.
 * - Validates window is closed + workflow === "ballot"
 * - Snapshots the eligible voter list based on electorateType
 * - Sets all "pending" nominations for the window to "on-ballot"
 * - Transitions the window to "balloting"
 *
 * GET /api/admin/ballots?windowId=...
 * - List ballots for a window (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import type { NominationWindow, Ballot } from "@/types/nominations";

const ADMIN_ROLES = [
  "super-admin",
  "association-admin", "assoc-registrar", "assoc-selector",
  "club-admin", "registrar",
];

// ── Helper: build voter id list ─────────────────────────────��─────────────────

async function buildEligibleVoterIds(
  db: ReturnType<import("mongodb").MongoClient["db"]>,
  win: NominationWindow
): Promise<string[]> {
  if (win.electorateType === "all-members") {
    // All financially registered members for this scope/season
    const members = await db.collection("members").find({
      $or: [{ clubId: win.scopeId }, { associationId: win.scopeId }],
      $or: [
        { "membership.status": { $in: ["financial", "active"] }, "membership.seasonYear": win.seasonYear },
        { status: "active" },
      ],
    }).project({ memberId: 1, _id: 0 }).toArray();
    return members.map((m: any) => m.memberId).filter(Boolean);
  }

  // Committee electorate (default)
  const committeeRoles = win.scopeType === "club"
    ? ["club-admin", "club-committee"]
    : ["association-admin", "assoc-committee", "assoc-registrar"];

  const users = await db.collection("users").find({
    roles: {
      $elemMatch: {
        role: { $in: committeeRoles },
        scopeId: win.scopeId,
        active: { $ne: false },
      },
    },
    status: { $ne: "inactive" },
  }).project({ userId: 1, _id: 0 }).toArray();

  return users.map((u: any) => u.userId).filter(Boolean);
}

// ── GET ─────────────────────────────────���───────────────────────────────��─────

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const windowId = req.nextUrl.searchParams.get("windowId");
  if (!windowId) return NextResponse.json({ error: "windowId required" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db("hockey-app");

  const ballots = await db
    .collection("ballots")
    .find({ windowId })
    .sort({ ballotNumber: 1 })
    .toArray();

  return NextResponse.json({
    ballots: ballots.map((b) => ({ ...b, _id: b._id.toString() })),
  });
}

// ── POST ────────────────────────────���──────────────────────────────────���──────

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as {
    windowId: string;
    closeAt?: string;        // ISO — when voting closes; defaults to 7 days from now
    ballotNumber?: 1 | 2;   // internal use for second ballot creation
    parentBallotId?: string;
    candidateNominationIds?: string[];  // override for second ballot (tied candidates)
  };

  const { windowId } = body;
  if (!windowId) return NextResponse.json({ error: "windowId is required" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db("hockey-app");

  // Resolve window
  const win = await db.collection("nomination_windows").findOne({ windowId }) as NominationWindow | null;
  if (!win) return NextResponse.json({ error: "Window not found" }, { status: 404 });

  if (win.workflow !== "ballot") {
    return NextResponse.json({ error: "Only ballot-workflow windows can have a ballot" }, { status: 409 });
  }
  if (!["closed", "balloting"].includes(win.status)) {
    return NextResponse.json(
      { error: `Window must be closed before starting a ballot (current: ${win.status})` },
      { status: 409 }
    );
  }

  const ballotNumber: 1 | 2 = body.ballotNumber ?? 1;

  // For ballot 1: check no existing open ballot
  if (ballotNumber === 1) {
    const existing = await db.collection("ballots").findOne({ windowId, ballotNumber: 1 });
    if (existing) {
      return NextResponse.json({ error: "A ballot already exists for this window" }, { status: 409 });
    }
  }

  // ── Resolve candidates ─────────────────────────��───────────────────────────
  let candidateNominationIds: string[];
  if (body.candidateNominationIds) {
    candidateNominationIds = body.candidateNominationIds;
  } else {
    const pending = await db
      .collection("rep_nominations")
      .find({ windowId, status: "pending" })
      .project({ nominationId: 1, _id: 0 })
      .toArray();
    candidateNominationIds = pending.map((n: any) => n.nominationId);
  }

  if (candidateNominationIds.length < 2) {
    return NextResponse.json(
      { error: "At least 2 candidates are required to create a ballot" },
      { status: 409 }
    );
  }

  // ── Build voter list ───────────────────────────────────────────────────────
  const eligibleVoterIds = await buildEligibleVoterIds(db, win);
  if (eligibleVoterIds.length === 0) {
    return NextResponse.json(
      { error: "No eligible voters found for this window's electorate" },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const defaultCloseAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const ballot: Ballot = {
    ballotId:               `ballot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    windowId,
    ballotNumber,
    ...(body.parentBallotId ? { parentBallotId: body.parentBallotId } : {}),
    candidateNominationIds,
    eligibleVoterIds,
    openAt:               now,
    closeAt:              body.closeAt ?? defaultCloseAt,
    status:               "open",
    totalEligibleVoters:  eligibleVoterIds.length,
    totalVotesCast:       0,
    createdAt:            now,
  };

  await db.collection("ballots").insertOne(ballot);

  // Move pending nominations to "on-ballot"
  await db.collection("rep_nominations").updateMany(
    { nominationId: { $in: candidateNominationIds } },
    { $set: { status: "on-ballot", updatedAt: now } }
  );

  // Store eligible voter snapshot on window (for quick access)
  // Transition window to "balloting" if not already
  await db.collection("nomination_windows").updateOne(
    { windowId },
    {
      $set: {
        status: "balloting",
        eligibleVoterIds,
        updatedAt: now,
      },
    }
  );

  return NextResponse.json({ ballot }, { status: 201 });
}
