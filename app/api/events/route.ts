// app/api/events/route.ts
// Public API - Returns active, non-expired events with filtering

import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;

export async function GET(request: NextRequest) {
  const client = new MongoClient(uri);
  const searchParams = request.nextUrl.searchParams;

  // Extract query parameters
  const category = searchParams.get("category");
  const scope = searchParams.get("scope");
  const orgType = searchParams.get("orgType");
  const orgId = searchParams.get("orgId");
  const clubId = searchParams.get("clubId");
  const from = searchParams.get("from"); // Start date
  const to = searchParams.get("to"); // End date
  const tags = searchParams.get("tags")?.split(",");
  const limit = parseInt(searchParams.get("limit") || "50");
  const upcoming = searchParams.get("upcoming") === "true";

  try {
    await client.connect();
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const eventsCollection = database.collection("events");

    const now = new Date();

    // Build query
    const query: Record<string, unknown> = {
      deleted: { $ne: true },
      status: { $in: ["scheduled", "postponed"] },
    };

    // Only show public events OR events user has access to
    // For now, show all public events (auth check would go here)
    query.visibility = "public";

    // Date filters
    if (upcoming) {
      query.startDate = { $gte: now };
    } else if (from || to) {
      const startRange: Record<string, Date> = {};
      if (from) startRange.$gte = new Date(from);
      if (to) startRange.$lte = new Date(to);
      query.startDate = startRange;
    }

    // Category filter
    if (category && category !== "all") {
      query.category = category;
    }

    // Scope filter
    if (scope && scope !== "all") {
      query.scope = scope;
    }

    // Organization type filter
    if (orgType && orgType !== "all") {
      query["organization.type"] = orgType;
    }

    // Specific organization filter
    if (orgId) {
      query["organization.id"] = orgId;
    }

    // Club filter (including teams from that club)
    if (clubId) {
      query.$or = [
        { "organization.id": clubId },
        { "organization.clubId": clubId },
        { "references.clubId": clubId },
      ];
    }

    // Tags filter
    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }

    const events = await eventsCollection
      .find(query)
      .sort({ startDate: 1 })
      .limit(limit)
      .toArray();

    // Transform MongoDB documents to API response
    const eventsFormatted = events.map((event) => ({
      ...event,
      _id: event._id.toString(),
      startDate: event.startDate.toISOString(),
      endDate: event.endDate?.toISOString(),
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      events: eventsFormatted,
      count: eventsFormatted.length,
      query: {
        category,
        scope,
        orgType,
        from,
        to,
        upcoming,
      },
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    );
  } finally {
    await client.close();
  }
}
