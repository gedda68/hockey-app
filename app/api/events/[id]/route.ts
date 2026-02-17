// app/api/events/[id]/route.ts
// Get single event details by ID

import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const client = new MongoClient(uri);

  try {
    const { id } = await params;

    await client.connect();
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const eventsCollection = database.collection("events");

    // Find by custom id field OR MongoDB _id
    const event = await eventsCollection.findOne({
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null },
      ],
      deleted: { $ne: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check visibility and access
    if (event.visibility === "private") {
      // TODO: Check if user has access (auth check)
      // For now, return 403
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Increment view count
    await eventsCollection.updateOne(
      { _id: event._id },
      {
        $inc: { "analytics.views": 1 },
        $set: { updatedAt: new Date() },
      },
    );

    // Format response
    const eventFormatted = {
      ...event,
      _id: event._id.toString(),
      startDate: event.startDate.toISOString(),
      endDate: event.endDate?.toISOString(),
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };

    return NextResponse.json(eventFormatted);
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: "Failed to fetch event" },
      { status: 500 },
    );
  } finally {
    await client.close();
  }
}
