// app/api/admin/players/[playerId]/notes/route.ts
// Player notes — stored on the members collection.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

type Params = { params: Promise<{ playerId: string }> };

export async function GET(
  _req: NextRequest,
  { params }: Params,
) {
  try {
    const { playerId } = await params;
    const client = await clientPromise;
    const db = client.db("hockey-app");

    const member = await db
      .collection("members")
      .findOne({ memberId: playerId }, { projection: { notes: 1, _id: 0 } });

    if (!member) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    return NextResponse.json({ notes: member.notes ?? [] });
  } catch (error: unknown) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: Params,
) {
  try {
    const { playerId } = await params;
    const note = await request.json();

    const newNote = {
      ...note,
      id:        `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const result = await db.collection("members").updateOne(
      { memberId: playerId },
      {
        $push: { notes: newNote } as any,
        $set:  { updatedAt: new Date().toISOString() },
      },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, note: newNote });
  } catch (error: unknown) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: Params,
) {
  try {
    const { playerId } = await params;
    const { noteId, updates } = await request.json();

    const updatedFields: Record<string, unknown> = {};
    for (const key of Object.keys(updates)) {
      updatedFields[`notes.$.${key}`] = updates[key];
    }
    updatedFields["notes.$.updatedAt"] = new Date().toISOString();

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const result = await db.collection("members").updateOne(
      { memberId: playerId, "notes.id": noteId },
      { $set: { ...updatedFields, updatedAt: new Date().toISOString() } },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Player or note not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: Params,
) {
  try {
    const { playerId } = await params;
    const noteId = new URL(request.url).searchParams.get("noteId");
    if (!noteId) {
      return NextResponse.json({ error: "noteId is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const result = await db.collection("members").updateOne(
      { memberId: playerId },
      {
        $pull: { notes: { id: noteId } } as any,
        $set:  { updatedAt: new Date().toISOString() },
      },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
