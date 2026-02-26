// app/api/admin/players/[playerId]/notes/route.ts
// API for player notes - FULL DATABASE INTEGRATION

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> },
) {
  try {
    const { playerId } = await params; // ✅ AWAIT params

    console.log("📝 Fetching notes for player:", playerId);

    const client = await clientPromise;
    const db = client.db();

    const player = await db
      .collection("players")
      .findOne({ playerId }, { projection: { notes: 1, _id: 0 } });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const notes = player.notes || [];

    console.log(`✅ Retrieved ${notes.length} notes`);

    return NextResponse.json({ notes });
  } catch (error: any) {
    console.error("❌ Error fetching notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes", details: error.message },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> },
) {
  try {
    const { playerId } = await params; // ✅ AWAIT params
    const note = await request.json();

    console.log("📝 Creating note for player:", playerId);

    // Add metadata
    const newNote = {
      ...note,
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("players").updateOne(
      { playerId },
      {
        $push: { notes: newNote },
        $set: { updatedAt: new Date().toISOString() },
      },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    console.log("✅ Note created successfully");

    return NextResponse.json({
      success: true,
      note: newNote,
      message: "Note created successfully",
    });
  } catch (error: any) {
    console.error("❌ Error creating note:", error);
    return NextResponse.json(
      { error: "Failed to create note", details: error.message },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> },
) {
  try {
    const { playerId } = await params; // ✅ AWAIT params
    const { noteId, updates } = await request.json();

    console.log("📝 Updating note for player:", playerId, noteId);

    // Add update timestamp
    const updatedFields: any = {};
    Object.keys(updates).forEach((key) => {
      updatedFields[`notes.$.${key}`] = updates[key];
    });
    updatedFields["notes.$.updatedAt"] = new Date().toISOString();

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("players").updateOne(
      { playerId, "notes.id": noteId },
      {
        $set: {
          ...updatedFields,
          updatedAt: new Date().toISOString(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Player or note not found" },
        { status: 404 },
      );
    }

    console.log("✅ Note updated successfully");

    return NextResponse.json({
      success: true,
      message: "Note updated successfully",
    });
  } catch (error: any) {
    console.error("❌ Error updating note:", error);
    return NextResponse.json(
      { error: "Failed to update note", details: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> },
) {
  try {
    const { playerId } = await params; // ✅ AWAIT params
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get("noteId");

    if (!noteId) {
      return NextResponse.json(
        { error: "Note ID is required" },
        { status: 400 },
      );
    }

    console.log("🗑️ Deleting note for player:", playerId, noteId);

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("players").updateOne(
      { playerId },
      {
        $pull: { notes: { id: noteId } },
        $set: { updatedAt: new Date().toISOString() },
      },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    console.log("✅ Note deleted successfully");

    return NextResponse.json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (error: any) {
    console.error("❌ Error deleting note:", error);
    return NextResponse.json(
      { error: "Failed to delete note", details: error.message },
      { status: 500 },
    );
  }
}
