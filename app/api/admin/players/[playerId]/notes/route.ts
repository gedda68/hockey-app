// app/api/admin/players/[playerId]/notes/route.ts
// Player notes — stored on the members collection.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";
import {
  assertMemberInSessionScope,
  type MemberScopeDoc,
} from "@/lib/auth/memberRouteScope";

type Params = { params: Promise<{ playerId: string }> };

export async function GET(
  request: NextRequest,
  { params }: Params,
) {
  try {
    const { playerId } = await params;

    const { response: authRes } = await requirePermission(request, "member.view");
    if (authRes) return authRes;

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const member = await db.collection("members").findOne({ memberId: playerId });

    if (!member) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const scopeErr = await assertMemberInSessionScope(
      request,
      member as MemberScopeDoc,
    );
    if (scopeErr) return scopeErr;

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

    const { response: authRes } = await requirePermission(request, "member.edit");
    if (authRes) return authRes;

    const note = await request.json();

    const newNote = {
      ...note,
      id:        `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const doc = await db.collection("members").findOne({ memberId: playerId });
    if (!doc) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    const scopeErr = await assertMemberInSessionScope(
      request,
      doc as MemberScopeDoc,
    );
    if (scopeErr) return scopeErr;

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

    const { response: authRes } = await requirePermission(request, "member.edit");
    if (authRes) return authRes;

    const { noteId, updates } = await request.json();

    const updatedFields: Record<string, unknown> = {};
    for (const key of Object.keys(updates)) {
      updatedFields[`notes.$.${key}`] = updates[key];
    }
    updatedFields["notes.$.updatedAt"] = new Date().toISOString();

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const doc = await db.collection("members").findOne({ memberId: playerId });
    if (!doc) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    const scopeErr = await assertMemberInSessionScope(
      request,
      doc as MemberScopeDoc,
    );
    if (scopeErr) return scopeErr;

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

    const { response: authRes } = await requirePermission(request, "member.edit");
    if (authRes) return authRes;

    const noteId = new URL(request.url).searchParams.get("noteId");
    if (!noteId) {
      return NextResponse.json({ error: "noteId is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const doc = await db.collection("members").findOne({ memberId: playerId });
    if (!doc) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    const scopeErr = await assertMemberInSessionScope(
      request,
      doc as MemberScopeDoc,
    );
    if (scopeErr) return scopeErr;

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
