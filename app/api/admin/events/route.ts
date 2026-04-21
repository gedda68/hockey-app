// app/api/admin/events/route.ts
// Admin API — list all events (with scope filtering) and create new events.
//
// GET query params:
//   associationId  → events owned by / referencing this association
//   clubId         → events owned by / referencing this club
//   teamId         → events referencing this team
//   category       → filter by EventCategory
//   status         → filter by EventStatus
//   search         → case-insensitive name search
//   deleted        → "true" to include soft-deleted events
//   from / to      → ISO date range on startDate
//   limit          → max results (default 200)

import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { requireRole } from "@/lib/auth/middleware";
import { MEDIA_CONTENT_ADMIN_ROLES } from "@/lib/auth/mediaContentRoles";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const uri = process.env.MONGODB_URI!;

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { response } = await requireRole(request, MEDIA_CONTENT_ADMIN_ROLES);
  if (response) return response;

  const client = new MongoClient(uri);

  try {
    const sp = request.nextUrl.searchParams;
    const associationId  = sp.get("associationId");
    const clubId         = sp.get("clubId");
    const teamId         = sp.get("teamId");
    const category       = sp.get("category");
    const status         = sp.get("status");
    const search         = sp.get("search");
    const includeDeleted = sp.get("deleted") === "true";
    const from           = sp.get("from");
    const to             = sp.get("to");
    const limit          = Math.min(parseInt(sp.get("limit") || "200"), 500);

    const query: Record<string, unknown> = {};

    if (!includeDeleted) {
      query.deleted = { $ne: true };
    }

    // Scope filters
    if (associationId) {
      query.$or = [
        { "organization.type": "association", "organization.id": associationId },
        { "references.associationId": associationId },
      ];
    } else if (clubId) {
      query.$or = [
        { "organization.type": "club", "organization.id": clubId },
        { "organization.clubId": clubId },
        { "references.clubId": clubId },
      ];
    } else if (teamId) {
      query.$or = [
        { "organization.type": "team", "organization.id": teamId },
        { "references.teamIds": teamId },
      ];
    }

    if (category) query.category = category;
    if (status)   query.status   = status;

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = new Date(from);
      if (to)   range.$lte = new Date(to);
      query.startDate = range;
    }

    await client.connect();
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const events = await db
      .collection("events")
      .find(query)
      .sort({ startDate: -1 })
      .limit(limit)
      .toArray();

    const eventsFormatted = events.map((e) => ({
      ...e,
      _id: e._id.toString(),
      startDate: (e.startDate as Date)?.toISOString?.() ?? e.startDate,
      endDate:   (e.endDate  as Date)?.toISOString?.() ?? e.endDate,
      createdAt: (e.createdAt as Date)?.toISOString?.() ?? e.createdAt,
      updatedAt: (e.updatedAt as Date)?.toISOString?.() ?? e.updatedAt,
    }));

    return NextResponse.json({ events: eventsFormatted, count: eventsFormatted.length });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  } finally {
    await client.close();
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { response } = await requireRole(request, MEDIA_CONTENT_ADMIN_ROLES);
  if (response) return response;

  const client = new MongoClient(uri);

  try {
    const contentType = request.headers.get("content-type") || "";
    let eventData: Record<string, unknown> = {};
    let featuredImage: string | null = null;
    let flyerPdf: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const eventJson = formData.get("event");
      if (eventJson) {
        eventData = JSON.parse(eventJson as string);
      }

      const imageFile = formData.get("featuredImage") as File | null;
      if (imageFile && imageFile.size > 0) {
        featuredImage = await uploadFile(imageFile, "events/images");
      }

      const flyerFile = formData.get("flyer") as File | null;
      if (flyerFile && flyerFile.size > 0) {
        flyerPdf = await uploadFile(flyerFile, "events/flyers");
      }
    } else {
      eventData = await request.json();
    }

    const name      = typeof eventData.name      === "string" ? eventData.name.trim() : "";
    const startRaw  = eventData.startDate;
    const orgRaw    = eventData.organization;

    if (!name || startRaw == null || String(startRaw) === "" || !orgRaw) {
      return NextResponse.json(
        { error: "Missing required fields: name, startDate, organization" },
        { status: 400 },
      );
    }

    const imagesRaw = eventData.images;
    const imagesObj =
      imagesRaw && typeof imagesRaw === "object" && !Array.isArray(imagesRaw)
        ? (imagesRaw as Record<string, unknown>)
        : {};

    await client.connect();
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const now = new Date();
    const event = {
      id: uuidv4(),
      slug: generateSlug(name),
      ...eventData,
      // Ensure calendarPropagation defaults to "none" if not provided
      calendarPropagation: eventData.calendarPropagation ?? "none",
      startDate: new Date(String(startRaw)),
      endDate:
        eventData.endDate != null && eventData.endDate !== ""
          ? new Date(String(eventData.endDate))
          : undefined,
      images: {
        featured:
          featuredImage ||
          (typeof imagesObj.featured === "string" ? imagesObj.featured : undefined),
        thumbnail:
          typeof imagesObj.thumbnail === "string" ? imagesObj.thumbnail : undefined,
        gallery: Array.isArray(imagesObj.gallery) ? imagesObj.gallery : [],
      },
      flyer: flyerPdf || eventData.flyer,
      createdAt: now,
      updatedAt: now,
      deleted: false,
      analytics: { views: 0, clicks: 0, registrations: 0 },
    };

    // calendarPropagation is stored on the event document.
    // The public /api/events route uses references.associationId + calendarPropagation
    // to surface this event in other org calendars at query time.

    const result = await db.collection("events").insertOne(event);

    return NextResponse.json({
      ...event,
      _id: result.insertedId.toString(),
      startDate: event.startDate.toISOString(),
      endDate: event.endDate?.toISOString(),
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  } finally {
    await client.close();
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function uploadFile(file: File, subdir: string): Promise<string> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(uploadsDir, { recursive: true });
  const timestamp = Date.now();
  const extension = path.extname(file.name);
  const filename = `${timestamp}${extension}`;
  const filepath = path.join(uploadsDir, filename);
  const bytes = await file.arrayBuffer();
  await writeFile(filepath, Buffer.from(bytes));
  return `/uploads/${subdir}/${filename}`;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
