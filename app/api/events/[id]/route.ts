// app/api/events/[id]/route.ts
// Public single-event API.
// Supports lookup by: UUID (id field), MongoDB ObjectId, or URL slug.
//
// Visibility rules:
//   public       → anyone can fetch
//   members-only → requires a valid session (any authenticated user)
//   private      → requires an admin/staff role

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth/session";

const ADMIN_ROLES = [
  "super-admin", "association-admin", "assoc-committee",
  "assoc-coach", "assoc-selector", "assoc-registrar",
  "club-admin", "club-committee", "registrar", "coach",
  "manager", "team-selector", "media-marketing",
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");
    const col = db.collection("events");

    // Build lookup: try UUID id, MongoDB ObjectId, then slug
    const orClauses: Record<string, unknown>[] = [
      { id },
      { slug: id },
    ];
    if (ObjectId.isValid(id)) {
      orClauses.push({ _id: new ObjectId(id) });
    }

    const event = await col.findOne({
      $and: [{ $or: orClauses }, { deleted: { $ne: true } }],
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // ── Visibility enforcement ────────────────────────────────────────────────

    if (event.visibility === "private") {
      // Private: admins/staff only
      const session = await getSession();
      if (!session || !ADMIN_ROLES.includes(session.role)) {
        return NextResponse.json(
          { error: "This event is not publicly accessible.", visibility: "private" },
          { status: 403 },
        );
      }
    } else if (event.visibility === "members-only") {
      // Members-only: any authenticated user
      const session = await getSession();
      if (!session) {
        return NextResponse.json(
          { error: "You must be logged in to view this event.", visibility: "members-only" },
          { status: 403 },
        );
      }
    }
    // public → no auth required

    // ── Increment view count (fire-and-forget) ────────────────────────────────
    col
      .updateOne({ _id: event._id }, { $inc: { "analytics.views": 1 } })
      .catch(() => {/* non-critical */});

    // ── Format response ───────────────────────────────────────────────────────
    const formatted = {
      ...event,
      _id: event._id.toString(),
      startDate: (event.startDate as Date)?.toISOString?.() ?? event.startDate,
      endDate:   (event.endDate  as Date)?.toISOString?.() ?? event.endDate,
      createdAt: (event.createdAt as Date)?.toISOString?.() ?? event.createdAt,
      updatedAt: (event.updatedAt as Date)?.toISOString?.() ?? event.updatedAt,
    };

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 });
  }
}
