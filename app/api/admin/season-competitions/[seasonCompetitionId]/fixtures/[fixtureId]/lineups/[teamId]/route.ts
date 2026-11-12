// GET/PUT /api/admin/season-competitions/[seasonCompetitionId]/fixtures/[fixtureId]/lineups/[teamId]
// Match-day roster for one team in one fixture.
//
// Rules:
//  - A club can only see/change its own team's roster.
//  - Clubs may change it up to 5 minutes before the scheduled start; after the
//    match has started nothing can change (see lib/lineups/lineupLock.ts).
//  - Association admins may correct a roster later, but must give a reason; the
//    change is audited.

import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { requireAnyPermission } from "@/lib/auth/middleware";
import {
  userCanAccessAssociationResource,
  userCanAccessClubResource,
} from "@/lib/auth/resourceAccessDb";
import {
  FIXTURE_LINEUPS_COLLECTION,
  FixtureLineupPlayerSchema,
  FixtureLineupStaffSchema,
} from "@/lib/db/schemas/fixtureLineup.schema";
import { lineupEditWindow, type LineupActor } from "@/lib/lineups/lineupLock";
import { memberBelongsToClubFilter } from "@/lib/rosters/memberClubQuery";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";

type Params = {
  params: Promise<{
    seasonCompetitionId: string;
    fixtureId: string;
    teamId: string;
  }>;
};

const PutBodySchema = z.object({
  players: z.array(FixtureLineupPlayerSchema).max(40),
  staff: z.array(FixtureLineupStaffSchema).max(20).default([]),
  /** Required for association admins changing a locked roster. */
  reason: z.string().trim().max(500).optional(),
});

const ASSOCIATION_PERMS = [
  "competitions.manage",
  "competitions.fixtures",
  "results.manage",
] as const;

async function resolveContext(request: NextRequest, p: Awaited<Params["params"]>) {
  const { user, response } = await requireAnyPermission(request, [
    "team.roster",
    "team.edit",
    ...ASSOCIATION_PERMS,
  ]);
  if (response) return { error: response } as const;

  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");

  const fixture = await db.collection("league_fixtures").findOne({
    fixtureId: p.fixtureId,
    seasonCompetitionId: p.seasonCompetitionId,
  });
  if (!fixture) {
    return { error: NextResponse.json({ error: "Fixture not found" }, { status: 404 }) } as const;
  }
  if (p.teamId !== fixture.homeTeamId && p.teamId !== fixture.awayTeamId) {
    return {
      error: NextResponse.json(
        { error: "Team is not playing in this fixture" },
        { status: 400 },
      ),
    } as const;
  }
  const team = await db.collection("teams").findOne({ teamId: p.teamId });
  if (!team) {
    return { error: NextResponse.json({ error: "Team not found" }, { status: 404 }) } as const;
  }

  const session = await getSession();
  const held = user.permissions as string[];
  const hasAssocPerm = ASSOCIATION_PERMS.some((x) => held.includes(x));
  const assocAccess =
    hasAssocPerm &&
    (await userCanAccessAssociationResource(
      session,
      fixture.owningAssociationId as string,
    ));

  let actor: LineupActor;
  if (assocAccess) {
    actor = "association";
  } else {
    // Clubs: only their own team.
    const clubId = team.clubId as string | undefined;
    const ok = clubId ? await userCanAccessClubResource(session, clubId) : false;
    if (!ok) {
      return {
        error: NextResponse.json(
          { error: "Forbidden - you can only manage your own team's roster" },
          { status: 403 },
        ),
      } as const;
    }
    actor = "club";
  }

  return { user, db, fixture, team, actor } as const;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await resolveContext(request, await params);
    if ("error" in ctx) return ctx.error;
    const { db, fixture, actor } = ctx;
    const p = await params;

    const lineup = await db
      .collection(FIXTURE_LINEUPS_COLLECTION)
      .findOne({ fixtureId: p.fixtureId, teamId: p.teamId }, { projection: { _id: 0 } });

    return NextResponse.json({
      lineup: lineup ?? { players: [], staff: [] },
      window: lineupEditWindow({
        scheduledStart: fixture.scheduledStart as string | null,
        status: fixture.status as string,
        actor,
      }),
      actor,
    });
  } catch (e) {
    console.error("lineup GET failed:", e);
    return NextResponse.json({ error: "Failed to load roster" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const p = await params;
    const ctx = await resolveContext(request, p);
    if ("error" in ctx) return ctx.error;
    const { user, db, fixture, team, actor } = ctx;

    const body = PutBodySchema.parse(await request.json());

    const window = lineupEditWindow({
      scheduledStart: fixture.scheduledStart as string | null,
      status: fixture.status as string,
      actor,
    });
    if (!window.open) {
      return NextResponse.json(
        { error: window.reason ?? "Roster is locked", closesAt: window.closesAt },
        { status: 409 },
      );
    }
    if (window.requiresReason && (body.reason ?? "").length < 3) {
      return NextResponse.json(
        {
          error:
            "This roster is locked for clubs. Enter a reason to make a late change.",
          requiresReason: true,
        },
        { status: 400 },
      );
    }

    const before = await db
      .collection(FIXTURE_LINEUPS_COLLECTION)
      .findOne({ fixtureId: p.fixtureId, teamId: p.teamId }, { projection: { _id: 0 } });

    if (new Set(body.players.map((x) => x.memberId)).size !== body.players.length) {
      return NextResponse.json({ error: "A player is listed twice" }, { status: 400 });
    }
    // Everyone must belong to the team's club, unless they are already named in
    // this match's existing roster (e.g. imported loan players).
    const alreadyNamed = new Set(
      [...((before?.players as { memberId: string }[]) ?? []), ...((before?.staff as { memberId: string }[]) ?? [])].map(
        (x) => x.memberId,
      ),
    );
    const ids = [...body.players.map((x) => x.memberId), ...body.staff.map((x) => x.memberId)];
    const uniqueIds = [...new Set(ids)].filter((id) => !alreadyNamed.has(id));
    const found = uniqueIds.length
      ? await db
          .collection("members")
          .find({
            memberId: { $in: uniqueIds },
            ...memberBelongsToClubFilter(team.clubId as string),
          })
          .project({ memberId: 1 })
          .toArray()
      : [];
    const foundIds = new Set(found.map((m) => m.memberId as string));
    const missing = uniqueIds.filter((id) => !foundIds.has(id));
    if (missing.length) {
      return NextResponse.json(
        { error: "Some people do not belong to this team's club", memberIds: missing },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const lineup = {
      lineupId: (before?.lineupId as string) ?? `lu-${p.fixtureId}-${p.teamId}`,
      fixtureId: p.fixtureId,
      seasonCompetitionId: p.seasonCompetitionId,
      teamId: p.teamId,
      players: body.players,
      staff: body.staff,
      source: "manual" as const,
      createdAt: (before?.createdAt as string | undefined) ?? now,
      updatedAt: now,
    };
    await db
      .collection(FIXTURE_LINEUPS_COLLECTION)
      .replaceOne({ fixtureId: p.fixtureId, teamId: p.teamId }, lineup, { upsert: true });

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "fixture",
      action: window.requiresReason ? "lineup.late_update" : "lineup.update",
      resourceType: "fixture_lineup",
      resourceId: lineup.lineupId,
      summary: `${actor} updated roster for ${p.teamId} in ${p.fixtureId} (${body.players.length} players)`,
      before: before ?? null,
      after: lineup,
      metadata: { actor, reason: body.reason ?? null, fixtureStatus: fixture.status ?? null },
    });

    return NextResponse.json({ lineup, window });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: "Invalid roster", details: e.issues }, { status: 400 });
    }
    console.error("lineup PUT failed:", e);
    return NextResponse.json({ error: "Failed to save roster" }, { status: 500 });
  }
}
