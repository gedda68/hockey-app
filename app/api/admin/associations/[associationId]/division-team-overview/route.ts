// GET — N4 registrar view: season competitions, divisions, and teams under member clubs
// (canonical `seasonCompetitionId` / `competitionDivisionId` vs legacy `competition` string).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { normalizeClubId } from "@/lib/rosters/associationRosterDivisions";

type Params = { params: Promise<{ associationId: string }> };

const OVERVIEW_PERMS = [
  "competitions.manage",
  "competitions.fixtures",
  "registration.manage",
] as const;

export async function GET(request: NextRequest, { params }: Params) {
  const { response } = await requireAnyPermission(request, [...OVERVIEW_PERMS]);
  if (response) return response;

  try {
    const { associationId } = await params;
    const scope = await requireResourceAccess(
      request,
      "association",
      associationId,
    );
    if (scope.response) return scope.response;

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const clubs = await db
      .collection("clubs")
      .find({
        $or: [
          { parentAssociationId: associationId },
          { associationId },
          { parentAssocId: associationId },
        ],
      })
      .project({ id: 1, clubId: 1, name: 1 })
      .toArray();

    const clubMeta = clubs
      .map((c) => ({
        clubId: normalizeClubId(c),
        clubName: String(c.name ?? "Club"),
      }))
      .filter((c) => c.clubId);
    const clubIds = clubMeta.map((c) => c.clubId);
    const clubNameById = new Map(clubMeta.map((c) => [c.clubId, c.clubName]));

    const teams = clubIds.length
      ? await db
          .collection("teams")
          .find({
            clubId: { $in: clubIds },
            status: { $ne: "archived" },
          })
          .project({
            teamId: 1,
            clubId: 1,
            name: 1,
            season: 1,
            seasonCompetitionId: 1,
            competitionDivisionId: 1,
            competition: 1,
            division: 1,
            status: 1,
            grade: 1,
          })
          .toArray()
      : [];

    const seasonRows = await db
      .collection("season_competitions")
      .find({ owningAssociationId: associationId })
      .project({
        seasonCompetitionId: 1,
        competitionId: 1,
        season: 1,
        displayName: 1,
        status: 1,
        divisions: 1,
      })
      .sort({ season: -1, seasonCompetitionId: 1 })
      .toArray();

    const seasonIdSet = new Set(
      seasonRows.map((s) => String(s.seasonCompetitionId ?? "")),
    );

    type TeamLite = {
      teamId: string;
      clubId: string;
      clubName: string;
      name: string;
      season: string;
      seasonCompetitionId: string | null;
      competitionDivisionId: string | null;
      competition: string | null;
      divisionLevel: number;
      divisionName: string;
      grade?: string | null;
      status: string;
    };

    const toTeamLite = (t: Record<string, unknown>): TeamLite => {
      const div = (t.division ?? {}) as {
        level?: number;
        name?: string;
      };
      return {
        teamId: String(t.teamId ?? ""),
        clubId: String(t.clubId ?? ""),
        clubName: clubNameById.get(String(t.clubId ?? "")) ?? String(t.clubId ?? ""),
        name: String(t.name ?? ""),
        season: String(t.season ?? ""),
        seasonCompetitionId:
          typeof t.seasonCompetitionId === "string" && t.seasonCompetitionId.trim()
            ? t.seasonCompetitionId.trim()
            : null,
        competitionDivisionId:
          typeof t.competitionDivisionId === "string" && t.competitionDivisionId.trim()
            ? t.competitionDivisionId.trim()
            : null,
        competition:
          typeof t.competition === "string" && t.competition.trim()
            ? t.competition.trim()
            : null,
        divisionLevel: typeof div.level === "number" ? div.level : 1,
        divisionName: typeof div.name === "string" ? div.name : "",
        grade: typeof t.grade === "string" ? t.grade : null,
        status: String(t.status ?? "active"),
      };
    };

    const seasonsPayload = seasonRows.map((sc) => {
      const sid = String(sc.seasonCompetitionId ?? "");
      const divisions = Array.isArray(sc.divisions) ? sc.divisions : [];
      const divList = divisions.map((d: Record<string, unknown>) => ({
        divisionId: String(d.divisionId ?? ""),
        name: String(d.name ?? ""),
        grade: typeof d.grade === "string" ? d.grade : undefined,
        gender: typeof d.gender === "string" ? d.gender : undefined,
        ageCategory: typeof d.ageCategory === "string" ? d.ageCategory : undefined,
      }));

      const inSeason = teams.filter(
        (t) => String(t.seasonCompetitionId ?? "") === sid,
      );
      const teamsByDivision: Record<string, TeamLite[]> = {};
      for (const d of divList) {
        if (!d.divisionId) continue;
        teamsByDivision[d.divisionId] = [];
      }
      const unassigned: TeamLite[] = [];
      const validDivIds = new Set(divList.map((d) => d.divisionId).filter(Boolean));

      for (const t of inSeason) {
        const row = toTeamLite(t as Record<string, unknown>);
        const did = row.competitionDivisionId;
        if (did && validDivIds.has(did)) {
          if (!teamsByDivision[did]) teamsByDivision[did] = [];
          teamsByDivision[did].push(row);
        } else {
          unassigned.push(row);
        }
      }

      return {
        seasonCompetitionId: sid,
        competitionId: String(sc.competitionId ?? ""),
        season: String(sc.season ?? ""),
        displayName:
          typeof sc.displayName === "string" && sc.displayName.trim()
            ? sc.displayName.trim()
            : null,
        status: String(sc.status ?? ""),
        divisions: divList.filter((d) => d.divisionId),
        teamsByDivision,
        teamsUnassigned: unassigned,
      };
    });

    const orphanSeason: TeamLite[] = [];
    for (const t of teams) {
      const scid = String(t.seasonCompetitionId ?? "").trim();
      if (!scid || !seasonIdSet.has(scid)) {
        orphanSeason.push(toTeamLite(t as Record<string, unknown>));
      }
    }

    return NextResponse.json({
      associationId,
      clubs: clubMeta,
      seasons: seasonsPayload,
      teamsOrphanSeason: orphanSeason,
    });
  } catch (error: unknown) {
    console.error("GET division-team-overview error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
