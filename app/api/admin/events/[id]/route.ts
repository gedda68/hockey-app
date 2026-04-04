// app/api/admin/events/[id]/route.ts
// Admin API - PUT update event, DELETE event

import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

const uri = process.env.MONGODB_URI!;

// PUT - Update event
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const client = new MongoClient(uri);

  try {
    const { id } = await params;
    const contentType = request.headers.get("content-type") || "";
    let updateData: Record<string, unknown> = {};
    let newFeaturedImage: string | null = null;
    let newFlyer: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      const eventJson = formData.get("event");
      if (eventJson) {
        updateData = JSON.parse(eventJson as string);
      }

      // Handle new image
      const imageFile = formData.get("featuredImage") as File | null;
      if (imageFile && imageFile.size > 0) {
        newFeaturedImage = await uploadFile(imageFile, "events/images");
      }

      // Handle new flyer
      const flyerFile = formData.get("flyer") as File | null;
      if (flyerFile && flyerFile.size > 0) {
        newFlyer = await uploadFile(flyerFile, "events/flyers");
      }
    } else {
      updateData = await request.json();
    }

    await client.connect();
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const eventsCollection = database.collection("events");

    // Get existing event
    const existing = await eventsCollection.findOne({
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null },
      ],
    });

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Delete old files if replacing
    if (
      newFeaturedImage &&
      existing.images?.featured?.startsWith("/uploads/")
    ) {
      await deleteFile(existing.images.featured);
    }
    if (newFlyer && existing.flyer?.startsWith("/uploads/")) {
      await deleteFile(existing.flyer);
    }

    // Prepare update
    const update: Record<string, unknown> = {
      ...updateData,
      updatedAt: new Date(),
    };

    if (updateData.startDate) update.startDate = new Date(updateData.startDate);
    if (updateData.endDate) update.endDate = new Date(updateData.endDate);
    if (newFeaturedImage) {
      update["images.featured"] = newFeaturedImage;
    }
    if (newFlyer) {
      update.flyer = newFlyer;
    }

    const result = await eventsCollection.findOneAndUpdate(
      { _id: existing._id },
      { $set: update },
      { returnDocument: "after" },
    );

    return NextResponse.json({
      ...result,
      _id: result?._id.toString(),
      startDate: result?.startDate.toISOString(),
      endDate: result?.endDate?.toISOString(),
      createdAt: result?.createdAt.toISOString(),
      updatedAt: result?.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 },
    );
  } finally {
    await client.close();
  }
}

// DELETE - Soft delete event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const client = new MongoClient(uri);

  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const hard = searchParams.get("hard") === "true";

    await client.connect();
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const eventsCollection = database.collection("events");

    const event = await eventsCollection.findOne({
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null },
      ],
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (hard) {
      // Hard delete - remove from database and delete files
      if (event.images?.featured?.startsWith("/uploads/")) {
        await deleteFile(event.images.featured);
      }
      if (event.flyer?.startsWith("/uploads/")) {
        await deleteFile(event.flyer);
      }
      if (event.documents) {
        for (const doc of event.documents) {
          if (doc.url.startsWith("/uploads/")) {
            await deleteFile(doc.url);
          }
        }
      }

      await eventsCollection.deleteOne({ _id: event._id });
    } else {
      // Soft delete
      await eventsCollection.updateOne(
        { _id: event._id },
        {
          $set: {
            deleted: true,
            deletedAt: new Date(),
            updatedAt: new Date(),
          },
        },
      );
    }

    return NextResponse.json({ success: true, hard });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 },
    );
  } finally {
    await client.close();
  }
}

// Helpers
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

async function deleteFile(url: string): Promise<void> {
  try {
    const filepath = path.join(process.cwd(), "public", url);
    await unlink(filepath);
  } catch (err) {
    // File already deleted or doesn't exist
    console.log("File not found or already deleted:", url);
  }
}
