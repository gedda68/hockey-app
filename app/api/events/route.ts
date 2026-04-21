// app/api/events/route.ts
// Public API — active, non-expired events with filtering.
// When filtering by clubId, also includes association-level "global" events
// so club & team calendars surface association-wide announcements automatically.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const category  = sp.get("category");
  const scope     = sp.get("scope");
  const orgType   = sp.get("orgType");
  const orgId     = sp.get("orgId");
  const clubId    = sp.get("clubId");
  const teamId    = sp.get("teamId");
  const assocId   = sp.get("associationId");
  const from      = sp.get("from");
  const to        = sp.get("to");
  const tags      = sp.get("tags")?.split(",");
  const limit     = Math.min(parseInt(sp.get("limit") || "50"), 200);
  const upcoming  = sp.get("upcoming") === "true";

  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const now = new Date();

    // Base visibility filter (public, non-deleted, active)
    const baseFilter: Record<string, unknown> = {
      deleted:    { $ne: true },
      status:     { $in: ["scheduled", "postponed"] },
      visibility: "public",
    };

    if (upcoming) {
      baseFilter.startDate = { $gte: now };
    } else if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = new Date(from);
      if (to)   range.$lte = new Date(to);
      baseFilter.startDate = range;
    }

    if (category && category !== "all") baseFilter.category = category;
    if (scope    && scope    !== "all") baseFilter.scope    = scope;
    if (orgType  && orgType  !== "all") baseFilter["organization.type"] = orgType;
    if (orgId)  baseFilter["organization.id"] = orgId;
    if (tags && tags.length > 0) baseFilter.tags = { $in: tags };

    // ── Scope-aware org filter ──────────────────────────────────────────────
    // For club/team calendars, surface:
    //   1. Events directly owned by the club/team
    //   2. Association-global events (calendarPropagation = "global"|"association")
    //      that belong to the same association as the club

    let associationIdForGlobals: string | null = null;

    if (clubId) {
      // Determine the club's association so we can include global events
      const club = await db.collection("clubs").findOne(
        { $or: [{ id: clubId }, { slug: clubId }] },
        { projection: { parentAssociationId: 1, associationId: 1 } },
      );
      associationIdForGlobals =
        (club?.parentAssociationId as string) ||
        (club?.associationId as string) ||
        null;

      const clubConditions: Record<string, unknown>[] = [
        { "organization.id": clubId },
        { "organization.clubId": clubId },
        { "references.clubId": clubId },
      ];

      if (associationIdForGlobals) {
        clubConditions.push({
          "references.associationId": associationIdForGlobals,
          calendarPropagation: { $in: ["global", "association", "club"] },
        });
      }

      baseFilter.$or = clubConditions;
    } else if (teamId) {
      baseFilter.$or = [
        { "organization.id": teamId },
        { "references.teamIds": teamId },
      ];
    } else if (assocId) {
      // Association calendar — include all events under this association
      // plus global propagation from sibling associations if desired (not implemented)
      baseFilter.$or = [
        { "organization.id": assocId },
        { "references.associationId": assocId },
      ];
    }

    const events = await db
      .collection("events")
      .find(baseFilter)
      .sort({ startDate: 1 })
      .limit(limit)
      .toArray();

    const eventsFormatted = events.map((event) => ({
      ...event,
      _id: event._id.toString(),
      startDate: (event.startDate as Date)?.toISOString?.() ?? event.startDate,
      endDate:   (event.endDate  as Date)?.toISOString?.() ?? event.endDate,
      createdAt: (event.createdAt as Date)?.toISOString?.() ?? event.createdAt,
      updatedAt: (event.updatedAt as Date)?.toISOString?.() ?? event.updatedAt,
    }));

    return NextResponse.json({
      events: eventsFormatted,
      count: eventsFormatted.length,
      query: { category, scope, orgType, from, to, upcoming },
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
