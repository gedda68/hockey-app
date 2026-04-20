// app/api/clubs/route.ts
// ADMIN API — Returns clubs for the admin panel.
// ALL methods require authentication and at minimum the club.view permission.
// Write methods (POST, PUT, DELETE) require club.edit or system.manage.
//
// Public club directory (name, slug, logo only) → GET /api/public/clubs

import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { requirePermission, requireAnyPermission } from "@/lib/auth/middleware";

const uri = process.env.MONGODB_URI!;
const DB_NAME = process.env.DB_NAME || "hockey-app";

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { response } = await requirePermission(request, "club.view");
  if (response) return response;

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(DB_NAME);

    const clubs = await db
      .collection("clubs")
      .find({})
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json({ clubs });
  } catch (error) {
    console.error("❌ Error fetching clubs:", error);
    return NextResponse.json({ error: "Failed to fetch clubs" }, { status: 500 });
  } finally {
    await client.close();
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { response } = await requireAnyPermission(request, [
    "club.create",
    "system.manage",
  ]);
  if (response) return response;

  const client = new MongoClient(uri);
  try {
    const body = await request.json();
    await client.connect();
    const db = client.db(DB_NAME);

    const slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const result = await db.collection("clubs").insertOne({ ...body, slug });

    return NextResponse.json({ success: true, id: result.insertedId, slug }, { status: 201 });
  } catch (error) {
    console.error("❌ Error creating club:", error);
    return NextResponse.json({ error: "Failed to create club" }, { status: 500 });
  } finally {
    await client.close();
  }
}

// ── PUT ───────────────────────────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  const { response } = await requireAnyPermission(request, [
    "club.edit",
    "system.manage",
  ]);
  if (response) return response;

  const client = new MongoClient(uri);
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    await client.connect();
    const db = client.db(DB_NAME);

    if (updateData.name) {
      updateData.slug = updateData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }

    const result = await db
      .collection("clubs")
      .updateOne({ id }, { $set: { ...updateData, updatedAt: new Date().toISOString() } });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error updating club:", error);
    return NextResponse.json({ error: "Failed to update club" }, { status: 500 });
  } finally {
    await client.close();
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const { response } = await requireAnyPermission(request, [
    "club.delete",
    "system.manage",
  ]);
  if (response) return response;

  const client = new MongoClient(uri);
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Club ID required" }, { status: 400 });
    }

    await client.connect();
    const db = client.db(DB_NAME);

    const result = await db.collection("clubs").deleteOne({ id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting club:", error);
    return NextResponse.json({ error: "Failed to delete club" }, { status: 500 });
  } finally {
    await client.close();
  }
}
