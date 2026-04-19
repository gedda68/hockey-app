// PATCH — N4: set `seasonCompetitionId` / `competitionDivisionId` (and optional legacy label sync)
// for a team in a member club, without going through the club-scoped team PUT.

import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import {
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { assertDivisionBelongsToSeason } from "@/lib/competitions/teamLeagueContext";
import { clubAssociationId, normalizeClubId } from "@/lib/rosters/associationRosterDivisions";

type Params = { params: Promise<{ associationId: string; teamId: string }> };

const PATCH_PERMS = [
  "competitions.manage",
  "competitions.fixtures",
  "team.edit",
  "registration.manage",
] as const;

const BodySchema = z
  .object({
    seasonCompetitionId: z.union([z.string().min(1), z.null()]).optional(),
    competitionDivisionId: z.union([z.string().min(1), z.null()]).optional(),
    /** When true, set legacy `competition` string from the parent `competitions` row name. */
    syncCompetitionLabel: z.boolean().optional(),
  })
  .strict()
  .refine(
    (b) =>
      b.seasonCompetitionId !== undefined ||
      b.competitionDivisionId !== undefined ||
      b.syncCompetitionLabel === true,
    { message: "At least one of seasonCompetitionId, competitionDivisionId, or syncCompetitionLabel is required" },
  );

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, response } = await requireAnyPermission(request, [...PATCH_PERMS]);
  if (response) return response;

  try {
    const { associationId, teamId } = await params;
    const scope = await requireResourceAccess(
      request,
      "association",
      associationId,
    );
    if (scope.response) return scope.response;

    const body = BodySchema.parse(await request.json());

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const team = await db.collection("teams").findOne({ teamId });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const club = await db.collection("clubs").findOne({
      $or: [{ id: team.clubId }, { clubId: team.clubId }],
    });
    const cid = normalizeClubId(club ?? {});
    if (!club || cid !== String(team.clubId)) {
      return NextResponse.json({ error: "Club not found for team" }, { status: 404 });
    }

    const assocOfClub = clubAssociationId(club);
    if (assocOfClub !== associationId) {
      return NextResponse.json(
        { error: "Team club is not governed by this association" },
        { status: 403 },
      );
    }

    const $set: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: user.userId,
    };

    let nextScId =
      body.seasonCompetitionId !== undefined
        ? body.seasonCompetitionId
        : ((team.seasonCompetitionId as string | null | undefined) ?? null);

    if (body.seasonCompetitionId !== undefined) {
      if (body.seasonCompetitionId === null) {
        $set.seasonCompetitionId = null;
        $set.competitionDivisionId = null;
        nextScId = null;
      } else {
        const seasonComp = await db.collection("season_competitions").findOne({
          seasonCompetitionId: body.seasonCompetitionId,
        });
        if (!seasonComp) {
          return NextResponse.json(
            { error: "seasonCompetitionId not found" },
            { status: 400 },
          );
        }
        if (String(seasonComp.owningAssociationId ?? "") !== associationId) {
          return NextResponse.json(
            { error: "Season competition is not owned by this association" },
            { status: 403 },
          );
        }
        if (String(seasonComp.season ?? "") !== String(team.season ?? "")) {
          return NextResponse.json(
            {
              error:
                "Season competition season does not match this team's season — adjust the team season in club settings first",
            },
            { status: 400 },
          );
        }
        $set.seasonCompetitionId = body.seasonCompetitionId;
        nextScId = body.seasonCompetitionId;

        if (body.competitionDivisionId === undefined) {
          const existingDiv = team.competitionDivisionId as string | null | undefined;
          if (existingDiv) {
            const chk = assertDivisionBelongsToSeason({
              seasonCompetitionId: body.seasonCompetitionId,
              divisions: seasonComp.divisions,
              competitionDivisionId: existingDiv,
            });
            if (!chk.ok) {
              $set.competitionDivisionId = null;
            }
          }
        }
      }
    }

    if (body.competitionDivisionId !== undefined) {
      if (body.competitionDivisionId === null) {
        $set.competitionDivisionId = null;
      } else {
        const sid =
          nextScId ?? (team.seasonCompetitionId as string | null | undefined);
        if (!sid || typeof sid !== "string") {
          return NextResponse.json(
            {
              error:
                "Link seasonCompetitionId before setting competitionDivisionId",
            },
            { status: 400 },
          );
        }
        const sc = await db.collection("season_competitions").findOne({
          seasonCompetitionId: sid,
        });
        const chk = assertDivisionBelongsToSeason({
          seasonCompetitionId: sid,
          divisions: sc?.divisions,
          competitionDivisionId: body.competitionDivisionId,
        });
        if (!chk.ok) {
          return NextResponse.json({ error: chk.error }, { status: 400 });
        }
        $set.competitionDivisionId = body.competitionDivisionId;
      }
    }

    if (body.syncCompetitionLabel) {
      const sid =
        (nextScId as string | null) ??
        (team.seasonCompetitionId as string | null | undefined);
      if (!sid) {
        return NextResponse.json(
          { error: "syncCompetitionLabel requires a linked seasonCompetitionId on the team" },
          { status: 400 },
        );
      }
      const sc = await db.collection("season_competitions").findOne({
        seasonCompetitionId: sid,
      });
      const compId = String(sc?.competitionId ?? "");
      if (!compId) {
        return NextResponse.json(
          { error: "Season competition has no competitionId" },
          { status: 400 },
        );
      }
      const comp = await db.collection("competitions").findOne({ competitionId: compId });
      if (comp?.name) {
        $set.competition = String(comp.name);
      }
    }

    await db.collection("teams").updateOne({ teamId }, { $set });

    const updated = await db.collection("teams").findOne({ teamId });
    return NextResponse.json({
      ...updated,
      _id: updated?._id?.toString?.(),
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("PATCH league-context error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
