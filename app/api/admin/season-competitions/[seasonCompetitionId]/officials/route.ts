// GET /api/admin/season-competitions/[seasonCompetitionId]/officials
// Every match in the competition with its umpire slots (names resolved from the
// association's official register), plus the register itself for assignment.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAnyPermission, requireResourceAccess } from "@/lib/auth/middleware";

type Params = { params: Promise<{ seasonCompetitionId: string }> };

export interface OfficialOption { umpireId: string; displayName: string; levelLabel: string | null; available: boolean }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { seasonCompetitionId } = await params;
    const { response } = await requireAnyPermission(request, ["competitions.manage", "competitions.fixtures", "results.manage"]);
    if (response) return response;

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");
    const sc = await db.collection("season_competitions").findOne({ seasonCompetitionId });
    if (!sc) return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    const associationId = sc.owningAssociationId as string;
    const scope = await requireResourceAccess(request, "association", associationId);
    if (scope.response) return scope.response;

    const [fixtures, register] = await Promise.all([
      db.collection("league_fixtures").find({ seasonCompetitionId })
        .project({ _id: 0, fixtureId: 1, round: 1, homeTeamId: 1, awayTeamId: 1, scheduledStart: 1, status: 1, umpires: 1 }).toArray(),
      db.collection("association_official_register").find({ associationId })
        .project({ _id: 0, officialRecordId: 1, displayName: 1, memberId: 1, umpireNumber: 1, levelLabel: 1, allocationAvailability: 1, unavailableUntil: 1 }).toArray(),
    ]);

    const teamIds = [...new Set(fixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId]).filter(Boolean))] as string[];
    const teams = teamIds.length
      ? await db.collection("teams").find({ teamId: { $in: teamIds } }).project({ _id: 0, teamId: 1, name: 1 }).toArray()
      : [];
    const teamName = new Map(teams.map((t) => [t.teamId as string, String(t.name ?? t.teamId)]));

    const now = Date.now();
    const officials: OfficialOption[] = [];
    const nameByUmpireId = new Map<string, string>();
    for (const r of register) {
      const ids = [r.memberId, r.umpireNumber].filter((x): x is string => typeof x === "string" && !!x);
      for (const id of ids) nameByUmpireId.set(id, String(r.displayName));
      const umpireId = ids[0];
      if (!umpireId) continue; // can't be referenced from a fixture slot
      const until = r.unavailableUntil ? Date.parse(r.unavailableUntil as string) : NaN;
      officials.push({
        umpireId, displayName: String(r.displayName), levelLabel: (r.levelLabel as string | null) ?? null,
        available: r.allocationAvailability !== "unavailable" && !(Number.isFinite(until) && until > now),
      });
    }
    officials.sort((a, b) => a.displayName.localeCompare(b.displayName));

    const matches = fixtures
      .map((f) => ({
        fixtureId: f.fixtureId as string,
        round: (f.round as number) ?? 0,
        scheduledStart: (f.scheduledStart as string | null) ?? null,
        status: (f.status as string) ?? "scheduled",
        home: teamName.get(f.homeTeamId as string) ?? (f.homeTeamId as string),
        away: teamName.get(f.awayTeamId as string) ?? (f.awayTeamId as string),
        umpires: ((f.umpires as Record<string, unknown>[] | null) ?? []).map((u) => ({
          ...u,
          umpireId: String(u.umpireId),
          name: nameByUmpireId.get(String(u.umpireId)) ?? String(u.umpireId),
        })),
      }))
      .sort((a, b) => a.round - b.round || (a.scheduledStart ?? "").localeCompare(b.scheduledStart ?? ""));

    return NextResponse.json({ matches, officials });
  } catch (e) {
    console.error("officials GET failed:", e);
    return NextResponse.json({ error: "Failed to load officials" }, { status: 500 });
  }
}
