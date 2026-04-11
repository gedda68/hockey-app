/**
 * GET/PATCH /api/member/my-umpire-assignments
 *
 * Self-service for officials: list league fixtures where the session member is
 * assigned as an umpire (matched via register memberId or umpire number), and
 * accept/decline allocation offers.
 */

import { NextRequest, NextResponse } from "next/server";
import type { Db } from "mongodb";
import { ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import {
  PatchMyUmpireAssignmentBodySchema,
  type PatchMyUmpireAssignmentBody,
} from "@/lib/db/schemas/memberUmpireAssignments.schema";
import {
  flattenAssignmentsFromFixtures,
  mergeUmpireSlotAllocationStatus,
  umpireIdKeysFromRegister,
} from "@/lib/member/umpireSelfService";

const REGISTER_COL = "association_official_register";
const FIXTURES_COL = "league_fixtures";

async function umpireIdKeysForMember(
  db: Db,
  memberId: string,
): Promise<Set<string>> {
  const regs = await db
    .collection(REGISTER_COL)
    .find({
      memberId: memberId.trim(),
      isActive: { $ne: false },
    })
    .project({ umpireNumber: 1 })
    .toArray();
  return umpireIdKeysFromRegister(memberId, regs);
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const memberId = session.memberId?.trim();
  if (!memberId) {
    return NextResponse.json({ assignments: [] satisfies unknown[] });
  }

  const client = await clientPromise;
  const db = client.db("hockey-app");
  const idSet = await umpireIdKeysForMember(db, memberId);
  const idList = [...idSet];

  const fixtures = await db
    .collection(FIXTURES_COL)
    .find({
      umpires: {
        $elemMatch: { umpireId: { $in: idList } },
      },
    })
    .project({
      fixtureId: 1,
      seasonCompetitionId: 1,
      owningAssociationId: 1,
      round: 1,
      scheduledStart: 1,
      venueName: 1,
      umpires: 1,
    })
    .sort({ scheduledStart: 1 })
    .limit(200)
    .toArray();

  const assignments = flattenAssignmentsFromFixtures(fixtures, idSet);

  return NextResponse.json({ memberId, assignments });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const memberId = session.memberId?.trim();
  if (!memberId) {
    return NextResponse.json(
      { error: "No member profile on this account" },
      { status: 400 },
    );
  }

  let body: PatchMyUmpireAssignmentBody;
  try {
    body = PatchMyUmpireAssignmentBodySchema.parse(await request.json());
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: e.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db("hockey-app");
  const idSet = await umpireIdKeysForMember(db, memberId);

  const fixture = await db.collection(FIXTURES_COL).findOne({
    fixtureId: body.fixtureId,
    seasonCompetitionId: body.seasonCompetitionId,
  });
  if (!fixture) {
    return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
  }

  const umpires = [...((fixture.umpires as unknown[] | null) ?? [])];
  if (body.slotIndex >= umpires.length) {
    return NextResponse.json({ error: "Invalid slot index" }, { status: 400 });
  }

  const slot = umpires[body.slotIndex] as Record<string, unknown>;
  const uid = slot?.umpireId != null ? String(slot.umpireId) : "";
  if (!uid || !idSet.has(uid)) {
    return NextResponse.json({ error: "Not your assignment" }, { status: 403 });
  }

  const nowIso = new Date().toISOString();
  umpires[body.slotIndex] = mergeUmpireSlotAllocationStatus(
    slot,
    body.allocationStatus,
    nowIso,
  );

  await db.collection(FIXTURES_COL).updateOne(
    { fixtureId: body.fixtureId, seasonCompetitionId: body.seasonCompetitionId },
    {
      $set: {
        umpires,
        updatedAt: nowIso,
        updatedBy: session.userId,
      },
    },
  );

  return NextResponse.json({ ok: true, allocationStatus: body.allocationStatus });
}
