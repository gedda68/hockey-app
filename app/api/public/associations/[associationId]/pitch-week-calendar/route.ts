// GET /api/public/associations/[associationId]/pitch-week-calendar
// Epic V3 — Week: ?weekStart=YYYY-MM-DD | Month: ?month=YYYY-MM (UTC). Optional venueId.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getPublicAssociationById } from "@/lib/public/publicAssociation";
import {
  buildPitchMonthCalendarResponse,
  buildPitchWeekCalendarResponse,
  utcParseDayStartIso,
  utcParseMonthYm,
} from "@/lib/public/pitchWeekCalendar";
import { seasonCompetitionVisibleForPortalTenant } from "@/lib/tenant/seasonCompetitionTenantGate";
import { resolvePublicTenantFromRequest } from "@/lib/tenant/publicTenantRequest";
import { defaultFixtureSlotMs } from "@/lib/competitions/pitchScheduleConflict";

const PUBLIC_SC_STATUSES = new Set(["published", "in_progress", "completed"]);

type Params = { params: Promise<{ associationId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { associationId } = await params;
    const aid = associationId?.trim();
    if (!aid) {
      return NextResponse.json({ error: "associationId required" }, { status: 400 });
    }

    const monthYm = request.nextUrl.searchParams.get("month")?.trim() ?? "";
    const weekStartParam = request.nextUrl.searchParams.get("weekStart")?.trim() ?? "";

    let rangeStartMs: number;
    let rangeEndExclusiveMs: number;
    let mode: "week" | "month";
    let weekStartYmd: string | undefined;
    let monthYmResolved: string | undefined;

    if (monthYm) {
      const b = utcParseMonthYm(monthYm);
      if (!b) {
        return NextResponse.json(
          { error: "Invalid month (use YYYY-MM, UTC calendar month)" },
          { status: 400 },
        );
      }
      mode = "month";
      rangeStartMs = b.startMs;
      rangeEndExclusiveMs = b.endExclusiveMs;
      monthYmResolved = monthYm;
    } else {
      const weekStartMs = utcParseDayStartIso(weekStartParam);
      if (!weekStartMs) {
        return NextResponse.json(
          {
            error:
              "Provide weekStart=YYYY-MM-DD (UTC week) or month=YYYY-MM (UTC month summary)",
          },
          { status: 400 },
        );
      }
      mode = "week";
      rangeStartMs = weekStartMs;
      rangeEndExclusiveMs = weekStartMs + 7 * 86_400_000;
      weekStartYmd = weekStartParam;
    }

    const padStartIso = new Date(rangeStartMs - 2 * 86_400_000).toISOString();
    const queryEndIso = new Date(rangeEndExclusiveMs + 2 * 86_400_000).toISOString();

    const venueFilter = request.nextUrl.searchParams.get("venueId")?.trim() || null;

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const tenant = await resolvePublicTenantFromRequest(request);
    const visible = await seasonCompetitionVisibleForPortalTenant(db, aid, tenant);
    if (!visible) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const assoc = await getPublicAssociationById(aid);
    if (!assoc) {
      return NextResponse.json({ error: "Association not found" }, { status: 404 });
    }

    const venues = await db
      .collection("association_venues")
      .find({ associationId: aid, status: "active" })
      .project({ venueId: 1, name: 1, status: 1, pitches: 1 })
      .sort({ name: 1 })
      .toArray();

    if (venueFilter) {
      const ok = venues.some((v) => String(v.venueId) === venueFilter);
      if (!ok) {
        return NextResponse.json({ error: "venueId not found for this association" }, { status: 400 });
      }
    }

    const seasons = await db
      .collection("season_competitions")
      .find({
        owningAssociationId: aid,
        status: { $in: [...PUBLIC_SC_STATUSES] },
      })
      .project({
        seasonCompetitionId: 1,
        displayName: 1,
        competitionName: 1,
      })
      .toArray();

    const seasonIds = seasons.map((s) => String(s.seasonCompetitionId ?? ""));
    const seasonLabelById = new Map<string, string | null>();
    for (const s of seasons) {
      const id = String(s.seasonCompetitionId ?? "");
      const label =
        (s.displayName as string | undefined)?.trim() ||
        (s.competitionName as string | undefined)?.trim() ||
        null;
      seasonLabelById.set(id, label);
    }

    const rawFixtures =
      seasonIds.length > 0
        ? await db
            .collection("league_fixtures")
            .find({
              owningAssociationId: aid,
              seasonCompetitionId: { $in: seasonIds },
              published: true,
              pitchId: { $nin: [null, ""] },
              scheduledStart: { $gte: padStartIso, $lt: queryEndIso },
              status: { $ne: "cancelled" },
            })
            .project({
              fixtureId: 1,
              seasonCompetitionId: 1,
              round: 1,
              homeTeamId: 1,
              awayTeamId: 1,
              pitchId: 1,
              venueId: 1,
              scheduledStart: 1,
              scheduledEnd: 1,
              status: 1,
            })
            .toArray()
        : [];

    const entries = await db
      .collection("pitch_calendar_entries")
      .find({
        associationId: aid,
        scheduledStart: { $gte: padStartIso, $lt: queryEndIso },
      })
      .project({
        entryId: 1,
        venueId: 1,
        pitchId: 1,
        scheduledStart: 1,
        scheduledEnd: 1,
        displayKind: 1,
        trainingOrganizer: 1,
        trainingClubId: 1,
      })
      .toArray();

    const teamIds = new Set<string>();
    for (const f of rawFixtures) {
      if (f.homeTeamId) teamIds.add(String(f.homeTeamId));
      if (f.awayTeamId) teamIds.add(String(f.awayTeamId));
    }
    const teams =
      teamIds.size > 0
        ? await db
            .collection("teams")
            .find({ teamId: { $in: [...teamIds] } })
            .project({ teamId: 1, name: 1 })
            .toArray()
        : [];
    const teamNameById = new Map<string, string>();
    for (const t of teams) {
      if (t.teamId && t.name) teamNameById.set(String(t.teamId), String(t.name));
    }

    const clubIds = new Set<string>();
    for (const e of entries) {
      if (e.displayKind === "training" && e.trainingClubId) {
        clubIds.add(String(e.trainingClubId));
      }
    }
    const clubs =
      clubIds.size > 0
        ? await db
            .collection("clubs")
            .find({
              $or: [{ clubId: { $in: [...clubIds] } }, { id: { $in: [...clubIds] } }],
            })
            .project({ clubId: 1, id: 1, clubName: 1, name: 1 })
            .toArray()
        : [];
    const clubNameById = new Map<string, string>();
    for (const c of clubs) {
      const cid = String(c.clubId ?? c.id ?? "");
      const nm = String(c.clubName ?? c.name ?? cid);
      if (cid) clubNameById.set(cid, nm);
    }

    const fixturesFiltered = rawFixtures.filter((f) => {
      const startIso = f.scheduledStart as string | undefined;
      if (!startIso) return false;
      const s = Date.parse(startIso);
      if (Number.isNaN(s)) return false;
      const endIso = f.scheduledEnd as string | null | undefined;
      let end = endIso ? Date.parse(endIso) : NaN;
      if (!endIso || Number.isNaN(end) || end <= s) {
        end = s + defaultFixtureSlotMs();
      }
      return s < rangeEndExclusiveMs && end > rangeStartMs;
    });

    const entriesFiltered = entries.filter((e) => {
      const startIso = e.scheduledStart as string | undefined;
      if (!startIso) return false;
      const s = Date.parse(startIso);
      if (Number.isNaN(s)) return false;
      const endIso = e.scheduledEnd as string | null | undefined;
      let end = endIso ? Date.parse(endIso) : NaN;
      if (!endIso || Number.isNaN(end) || end <= s) {
        end = s + 3600_000;
      }
      return s < rangeEndExclusiveMs && end > rangeStartMs;
    });

    const venuesPayload = venues.map((v) => ({
      venueId: String(v.venueId),
      name: String(v.name ?? ""),
      status: String(v.status ?? "active"),
      pitches: (
        ((v.pitches as { pitchId?: string; label?: string }[] | undefined) ?? []).filter(
          (p): p is { pitchId: string; label: string } =>
            Boolean(p?.pitchId && String(p.pitchId).trim() && p?.label && String(p.label).trim()),
        )
      ).map((p) => ({ pitchId: String(p.pitchId), label: String(p.label) })),
    }));

    const fixturesPayload = fixturesFiltered.map((f) => ({
      fixtureId: String(f.fixtureId),
      seasonCompetitionId: String(f.seasonCompetitionId),
      round: Number(f.round ?? 0),
      homeTeamId: String(f.homeTeamId ?? ""),
      awayTeamId: String(f.awayTeamId ?? ""),
      pitchId: f.pitchId as string | null | undefined,
      venueId: f.venueId as string | null | undefined,
      scheduledStart: f.scheduledStart as string | null | undefined,
      scheduledEnd: f.scheduledEnd as string | null | undefined,
      status: f.status as string | null | undefined,
    }));

    const entriesPayload = entriesFiltered.map((e) => ({
      entryId: String(e.entryId),
      venueId: String(e.venueId),
      pitchId: String(e.pitchId),
      scheduledStart: String(e.scheduledStart),
      scheduledEnd: (e.scheduledEnd as string | null | undefined) ?? null,
      displayKind: e.displayKind as "training" | "private" | "hire",
      trainingOrganizer: e.trainingOrganizer as "club" | "association" | undefined,
      trainingClubId: (e.trainingClubId as string | null | undefined) ?? null,
    }));

    const common = {
      associationId: aid,
      associationName: assoc.name,
      venueIdFilter: venueFilter,
      venues: venuesPayload,
      fixtures: fixturesPayload,
      teamNameById,
      seasonLabelById,
      entries: entriesPayload,
      clubNameById,
    };

    const payload =
      mode === "month"
        ? buildPitchMonthCalendarResponse({
            ...common,
            monthYm: monthYmResolved!,
            monthStartMs: rangeStartMs,
            monthEndExclusiveMs: rangeEndExclusiveMs,
          })
        : buildPitchWeekCalendarResponse({
            ...common,
            weekStartYmd: weekStartYmd!,
            weekStartMs: rangeStartMs,
            weekEndExclusiveMs: rangeEndExclusiveMs,
          });

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch (error: unknown) {
    console.error("GET pitch-week-calendar error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load calendar" },
      { status: 500 },
    );
  }
}
