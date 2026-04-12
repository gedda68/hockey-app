// GET /api/calendar/league?seasonCompetitionId=...
// J2 — Public iCal feed for published league fixtures (same visibility rules as GET /api/fixtures).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  buildLeagueIcsCalendar,
  type IcalFixtureEvent,
} from "@/lib/calendar/leagueIcal";
import { getPublicTenantFromRequest } from "@/lib/tenant/requestTenant";
import { seasonCompetitionVisibleForPortalTenant } from "@/lib/tenant/seasonCompetitionTenantGate";

const PUBLIC_SC_STATUSES = new Set([
  "published",
  "in_progress",
  "completed",
]);

export async function GET(request: NextRequest) {
  try {
    const seasonCompetitionId =
      request.nextUrl.searchParams.get("seasonCompetitionId")?.trim() ?? "";
    if (!seasonCompetitionId) {
      return NextResponse.json(
        { error: "Query parameter seasonCompetitionId is required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const sc = await db.collection("season_competitions").findOne({
      seasonCompetitionId,
    });
    if (!sc) {
      return NextResponse.json(
        { error: "Season competition not found" },
        { status: 404 },
      );
    }

    const tenant = await getPublicTenantFromRequest(request);
    const owner = String(sc.owningAssociationId ?? "");
    const visible = await seasonCompetitionVisibleForPortalTenant(
      db,
      owner,
      tenant,
    );
    if (!visible) {
      return NextResponse.json(
        { error: "Season competition not found" },
        { status: 404 },
      );
    }

    const status = sc.status as string | undefined;
    if (!status || !PUBLIC_SC_STATUSES.has(status)) {
      const empty = buildLeagueIcsCalendar({
        calendarName: "League fixtures",
        domain: "hockey-app.local",
        events: [],
      });
      return new NextResponse(empty, {
        status: 200,
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": `attachment; filename="league-${seasonCompetitionId}.ics"`,
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    const raw = await db
      .collection("league_fixtures")
      .find({ seasonCompetitionId, published: true })
      .sort({ round: 1, scheduledStart: 1, fixtureId: 1 })
      .toArray();

    const teamIds = new Set<string>();
    for (const f of raw) {
      if (f.homeTeamId) teamIds.add(f.homeTeamId as string);
      if (f.awayTeamId) teamIds.add(f.awayTeamId as string);
    }

    const teams =
      teamIds.size > 0
        ? await db
            .collection("teams")
            .find({ teamId: { $in: [...teamIds] } })
            .project({ teamId: 1, name: 1 })
            .toArray()
        : [];

    const nameById = new Map<string, string>();
    for (const t of teams) {
      if (t.teamId && t.name) nameById.set(t.teamId as string, t.name as string);
    }

    const calName = String(
      (sc as { displayName?: string }).displayName ??
        (sc as { competitionName?: string }).competitionName ??
        seasonCompetitionId,
    );

    const domain =
      process.env.ICAL_UID_DOMAIN?.trim() || "hockey-app.calendar";

    const events: IcalFixtureEvent[] = [];
    for (const f of raw) {
      const start = f.scheduledStart as string | null | undefined;
      if (!start) continue;
      const hid = f.homeTeamId as string;
      const aid = f.awayTeamId as string;
      const home = nameById.get(hid) ?? hid;
      const away = nameById.get(aid) ?? aid;
      const venue = [f.venueName, f.addressLine]
        .filter((x) => typeof x === "string" && x.trim())
        .join(", ");
      events.push({
        uid: `league-${String(f.fixtureId)}`,
        start,
        end: (f.scheduledEnd as string | null | undefined) ?? null,
        summary: `R${f.round}: ${home} vs ${away}`,
        description: `Fixture ${String(f.fixtureId)}`,
        location: venue || null,
      });
    }

    const ics = buildLeagueIcsCalendar({
      calendarName: calName,
      domain,
      events,
    });

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="league-${seasonCompetitionId}.ics"`,
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (e: unknown) {
    console.error("GET /api/calendar/league error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to build calendar" },
      { status: 500 },
    );
  }
}
