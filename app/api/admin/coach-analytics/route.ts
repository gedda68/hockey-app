/**
 * POST /api/admin/coach-analytics
 *
 * Upsert a coach_team_analytics row (season rollup). Requires team roster permission
 * and club resource access.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/mongodb";
import {
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";

const BodySchema = z.object({
  analyticsId: z.string().optional(),
  coachUserId: z.string().optional(),
  coachMemberId: z.string().optional(),
  teamId: z.string().min(1),
  clubId: z.string().min(1),
  seasonYear: z.string().min(4),
  gamesCoached: z.number().int().min(0),
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  draws: z.number().int().min(0),
  goalsFor: z.number().optional(),
  goalsAgainst: z.number().optional(),
  trainingSessions: z.number().optional(),
  rosterSizeAvg: z.number().optional(),
});

export async function POST(request: NextRequest) {
  const { response: permRes } = await requireAnyPermission(request, [
    "team.edit",
    "team.roster",
  ]);
  if (permRes) return permRes;

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { response: scopeRes } = await requireResourceAccess(
    request,
    "club",
    body.clubId,
  );
  if (scopeRes) return scopeRes;

  const db = await getDatabase();
  const now = new Date();
  const analyticsId =
    body.analyticsId?.trim() ||
    `ca-${body.coachUserId ?? body.coachMemberId ?? "anon"}-${body.teamId}-${body.seasonYear}`.replace(
      /[^a-zA-Z0-9-]+/g,
      "-",
    );

  await db.collection("coach_team_analytics").updateOne(
    { analyticsId },
    {
      $set: {
        analyticsId,
        coachUserId: body.coachUserId,
        coachMemberId: body.coachMemberId,
        teamId: body.teamId,
        clubId: body.clubId,
        seasonYear: body.seasonYear,
        gamesCoached: body.gamesCoached,
        wins: body.wins,
        losses: body.losses,
        draws: body.draws,
        goalsFor: body.goalsFor,
        goalsAgainst: body.goalsAgainst,
        trainingSessions: body.trainingSessions,
        rosterSizeAvg: body.rosterSizeAvg,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  return NextResponse.json({ ok: true, analyticsId });
}
