// app/api/admin/events/route.ts
// Admin API - GET all events, POST create new event with image upload

import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import { requireRole } from "@/lib/auth/middleware";
import { MEDIA_CONTENT_ADMIN_ROLES } from "@/lib/auth/mediaContentRoles";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const uri = process.env.MONGODB_URI!;

// GET - All events for admin (including deleted/private)
export async function GET(request: NextRequest) {
  const { response } = await requireRole(request, MEDIA_CONTENT_ADMIN_ROLES);
  if (response) return response;

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const eventsCollection = database.collection("events");

    const events = await eventsCollection
      .find({})
      .sort({ startDate: -1 })
      .toArray();

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

// POST - Create new event
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
      // Handle form data with file uploads
      const formData = await request.formData();

      // Extract event data from form
      const eventJson = formData.get("event");
      if (eventJson) {
        eventData = JSON.parse(eventJson as string);
      }

      // Handle featured image upload
      const imageFile = formData.get("featuredImage") as File | null;
      if (imageFile && imageFile.size > 0) {
        featuredImage = await uploadFile(imageFile, "events/images");
      }

      // Handle flyer PDF upload
      const flyerFile = formData.get("flyer") as File | null;
      if (flyerFile && flyerFile.size > 0) {
        flyerPdf = await uploadFile(flyerFile, "events/flyers");
      }
    } else {
      // Handle JSON body
      eventData = await request.json();
    }

    const name =
      typeof eventData.name === "string" ? eventData.name.trim() : "";
    const organization =
      typeof eventData.organization === "string"
        ? eventData.organization.trim()
        : "";
    const startRaw = eventData.startDate;

    if (
      !name ||
      startRaw == null ||
      String(startRaw) === "" ||
      !organization
    ) {
      return NextResponse.json(
        { error: "Missing required fields: name, startDate, organization" },
        { status: 400 },
      );
    }

    const imagesRaw = eventData.images;
    const imagesObj =
      imagesRaw &&
      typeof imagesRaw === "object" &&
      !Array.isArray(imagesRaw)
        ? (imagesRaw as Record<string, unknown>)
        : {};

    await client.connect();
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const eventsCollection = database.collection("events");

    // Create event document
    const now = new Date();
    const event = {
      id: uuidv4(),
      slug: generateSlug(name),
      ...eventData,
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
          typeof imagesObj.thumbnail === "string"
            ? imagesObj.thumbnail
            : undefined,
        gallery: Array.isArray(imagesObj.gallery) ? imagesObj.gallery : [],
      },
      flyer: flyerPdf || eventData.flyer,
      createdAt: now,
      updatedAt: now,
      deleted: false,
      analytics: {
        views: 0,
        clicks: 0,
        registrations: 0,
      },
    };

    const result = await eventsCollection.insertOne(event);

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
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 },
    );
  } finally {
    await client.close();
  }
}

// Helper: Upload file to public directory
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

// Helper: Generate URL-friendly slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
