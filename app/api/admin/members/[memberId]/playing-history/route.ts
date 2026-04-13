/**
 * POST /api/admin/members/[memberId]/playing-history
 *
 * Append a playing-history event (ledger row). Requires club access for the member.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/mongodb";
import { requirePermission, requireResourceAccess } from "@/lib/auth/middleware";
import type { PlayingHistoryEventType } from "@/types/memberStats";

const BodySchema = z.object({
  seasonYear: z.string().min(4),
  eventType: z.enum([
    "fixture",
    "friendly",
    "training",
    "representative",
    "other",
  ]),
  date: z.string().min(8),
  clubId: z.string().optional(),
  teamId: z.string().optional(),
  competitionId: z.string().optional(),
  fixtureId: z.string().optional(),
  opponentName: z.string().optional(),
  result: z.enum(["win", "loss", "draw", "unknown"]).optional(),
  goals: z.number().optional(),
  assists: z.number().optional(),
  greenCards: z.number().optional(),
  yellowCards: z.number().optional(),
  redCards: z.number().optional(),
  minutesPlayed: z.number().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const { response: permRes } = await requirePermission(request, "member.edit");
  if (permRes) return permRes;

  const { memberId } = await params;
  if (!memberId) {
    return NextResponse.json({ error: "memberId required" }, { status: 400 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const db = await getDatabase();
  const member = await db.collection("members").findOne({ memberId });
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const clubId = member.clubId ? String(member.clubId) : null;
  if (clubId) {
    const { response: scopeRes } = await requireResourceAccess(
      request,
      "club",
      clubId,
    );
    if (scopeRes) return scopeRes;
  }

  const historyId = `ph-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const now = new Date();
  const doc = {
    historyId,
    memberId,
    seasonYear: body.seasonYear,
    eventType: body.eventType as PlayingHistoryEventType,
    date: body.date,
    clubId: body.clubId ?? clubId ?? undefined,
    teamId: body.teamId,
    competitionId: body.competitionId,
    fixtureId: body.fixtureId,
    opponentName: body.opponentName,
    result: body.result,
    goals: body.goals,
    assists: body.assists,
    greenCards: body.greenCards,
    yellowCards: body.yellowCards,
    redCards: body.redCards,
    minutesPlayed: body.minutesPlayed,
    notes: body.notes,
    source: body.source ?? "admin",
    createdAt: now,
    updatedAt: now,
  };

  await db.collection("member_playing_history").insertOne(doc);

  return NextResponse.json({ ok: true, historyId });
}
