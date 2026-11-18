/**
 * GET /api/admin/surveys/options
 * The choices the survey builder offers this person: where they can run a survey (their association, club, teams;
 * everything for a super-admin) and the competitions and tournaments a survey can be about.
 */

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { surveyLevels } from "@/lib/surveys/access";
import { descendantAssociationIds } from "@/lib/surveys/audience";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const levels = await surveyLevels(session);
    if (!levels) return NextResponse.json({ error: "You can't run surveys" }, { status: 403 });
    const db = await getDatabase();
    const isSuper = session.role === "super-admin";

    const assocRows = await db.collection("associations").find({}, { projection: { associationId: 1, name: 1, parentAssociationId: 1 } }).limit(500).toArray();
    const myAssocIds = isSuper ? assocRows.map((a) => String(a.associationId)) : session.associationId ? [session.associationId] : [];
    const associations = assocRows.filter((a) => myAssocIds.includes(String(a.associationId))).map((a) => ({ id: String(a.associationId), name: String(a.name ?? a.associationId) }));

    const clubFilter = isSuper ? {} : session.clubId ? { $or: [{ id: session.clubId }, { clubId: session.clubId }] } : session.associationId ? { parentAssociationId: { $in: descendantAssociationIds(assocRows as any, session.associationId) } } : null;
    const clubs = clubFilter ? (await db.collection("clubs").find(clubFilter, { projection: { id: 1, clubId: 1, name: 1 } }).limit(500).toArray()).map((c) => ({ id: String(c.id ?? c.clubId), name: String(c.name) })) : [];

    const clubIds = clubs.map((c) => c.id);
    const teams = clubIds.length ? (await db.collection("teams").find({ clubId: { $in: clubIds }, status: { $ne: "archived" } }, { projection: { teamId: 1, name: 1, displayName: 1, clubId: 1 } }).limit(1000).toArray()).map((t) => ({ id: String(t.teamId), clubId: String(t.clubId), name: String(t.displayName || t.name || t.teamId) })) : [];

    const competitions = (await db.collection("season_competitions").find({}, { projection: { seasonCompetitionId: 1, displayName: 1, competitionName: 1, name: 1, season: 1 } }).sort({ season: -1 }).limit(300).toArray())
      .map((c) => ({ id: String(c.seasonCompetitionId), label: `${String(c.displayName ?? c.competitionName ?? c.name ?? c.seasonCompetitionId)}${c.season ? ` (${c.season})` : ""}` }));
    const tournaments = (await db.collection("rep_tournaments").find({}, { projection: { tournamentId: 1, title: 1, season: 1, startDate: 1, endDate: 1, location: 1, venue: 1 } }).sort({ startDate: -1 }).limit(200).toArray())
      .map((t: any) => ({ id: String(t.tournamentId), label: String(t.title ?? t.tournamentId), season: t.season ? String(t.season) : "", startDate: typeof t.startDate === "string" ? t.startDate.slice(0, 10) : t.startDate instanceof Date ? t.startDate.toISOString().slice(0, 10) : "", endDate: typeof t.endDate === "string" ? t.endDate.slice(0, 10) : t.endDate instanceof Date ? t.endDate.toISOString().slice(0, 10) : "", location: String(t.location ?? t.venue ?? "") }));

    return NextResponse.json({
      levels,
      associations,
      clubs,
      teams,
      competitions,
      tournaments,
      defaults: { associationId: session.associationId ?? "", clubId: session.clubId ?? "" },
    });
  } catch (e) {
    console.error("survey options error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
