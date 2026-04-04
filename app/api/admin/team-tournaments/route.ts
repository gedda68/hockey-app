/**
 * GET  /api/admin/team-tournaments
 *   List team tournament entries. Filterable by season, clubId, tournamentId.
 *
 * POST /api/admin/team-tournaments
 *   Create a new team tournament entry.
 *   Looks up team and tournament to denormalise names.
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import type {
  TeamTournamentEntry,
  CreateEntryBody,
  TeamTournamentEntrySummary,
} from "@/types/teamTournament";

const ADMIN_ROLES = [
  "super-admin",
  "association-admin",
  "club-admin",
  "registrar",
  "assoc-registrar",
];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const season       = searchParams.get("season") ?? undefined;
  const clubId       = searchParams.get("clubId") ?? undefined;
  const tournamentId = searchParams.get("tournamentId") ?? undefined;
  const teamId       = searchParams.get("teamId") ?? undefined;

  const client = await clientPromise;
  const db = client.db("hockey-app");

  const filter: Record<string, unknown> = {};
  if (season)       filter.season       = season;
  if (tournamentId) filter.tournamentId = tournamentId;
  if (teamId)       filter.teamId       = teamId;

  // Scope: club-admin / registrar can only see their own club
  if (["club-admin", "registrar"].includes(session.role) && session.clubId) {
    filter.clubId = session.clubId;
  } else if (clubId) {
    filter.clubId = clubId;
  }

  const entries = await db
    .collection<TeamTournamentEntry>("team_tournament_entries")
    .find(filter)
    .sort({ season: -1, startDate: 1 })
    .toArray();

  const summaries: TeamTournamentEntrySummary[] = entries.map((e) => ({
    entryId:           e.entryId,
    teamId:            e.teamId,
    teamName:          e.teamName,
    clubName:          e.clubName,
    tournamentId:      e.tournamentId,
    tournamentTitle:   e.tournamentTitle,
    season:            e.season,
    ageGroup:          e.ageGroup,
    startDate:         e.startDate,
    status:            e.status,
    attendingCount:    e.attendingMemberIds.length,
    totalFeesCents:    e.totalFeesCents,
    totalCollectedCents: e.totalCollectedCents,
    outstandingCents:  e.totalFeesCents - e.totalCollectedCents,
  }));

  return NextResponse.json({ entries: summaries });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateEntryBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { teamId, tournamentId, status = "draft", notes } = body;
  if (!teamId || !tournamentId) {
    return NextResponse.json({ error: "teamId and tournamentId are required" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db("hockey-app");

  // Look up team and tournament in parallel
  const [team, tournament] = await Promise.all([
    db.collection("teams").findOne({ teamId }),
    db.collection("rep_tournaments").findOne({ tournamentId }),
  ]);

  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

  // Scope check: club-admin can only create entries for their own club
  if (["club-admin", "registrar"].includes(session.role) && session.clubId) {
    if (team.clubId !== session.clubId) {
      return NextResponse.json({ error: "You can only create entries for your own club's teams" }, { status: 403 });
    }
  }

  // Prevent duplicate entries
  const existing = await db
    .collection("team_tournament_entries")
    .findOne({ teamId, tournamentId });
  if (existing) {
    return NextResponse.json(
      { error: "An entry for this team and tournament already exists" },
      { status: 409 }
    );
  }

  // Look up club name
  const club = await db.collection("clubs").findOne({ id: team.clubId });

  const now = new Date();
  const entryId = `tte-${teamId}-${tournamentId}`;

  const entry: TeamTournamentEntry = {
    entryId,
    teamId,
    teamName:        team.displayName ?? team.name,
    clubId:          team.clubId,
    clubName:        club?.name ?? team.clubId,
    tournamentId,
    tournamentTitle: tournament.title,
    season:          tournament.season,
    ageGroup:        tournament.ageGroup,
    gender:          tournament.gender,
    startDate:       tournament.startDate,
    endDate:         tournament.endDate,
    location:        tournament.location,
    status,
    feeItems:        [],
    attendingMemberIds: [],
    totalFeesCents:  0,
    totalCollectedCents: 0,
    notes,
    createdAt: now,
    updatedAt: now,
    createdBy: session.userId ?? session.email,
  };

  await db.collection("team_tournament_entries").insertOne(entry);

  return NextResponse.json({ entry }, { status: 201 });
}
