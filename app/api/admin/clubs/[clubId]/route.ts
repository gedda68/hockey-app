// app/api/admin/clubs/[id]/route.ts
// Looks up clubs by slug (preferred) or legacy id.
// Auto-generates + persists slug if the club record doesn't have one yet.

import { NextRequest, NextResponse } from "next/server";
import type { Db } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { generateSlug } from "@/lib/utils/slug";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";

type Ctx = { params: Promise<{ id: string }> };

/** Find a club by slug first, then by id (backwards compat). */
async function findClub(db: Db, idOrSlug: string) {
  return db.collection("clubs").findOne({
    $or: [{ slug: idOrSlug }, { id: idOrSlug }],
  });
}

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;

    const { response: permRes } = await requirePermission(req, "club.view");
    if (permRes) return permRes;
    const scope = await requireResourceAccess(req, "club", id);
    if (scope.response) return scope.response;

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const club = await findClub(db, id);

    if (!club) {
      console.error(`Club not found: ${id}`);
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Auto-generate slug if missing
    if (!club.slug && club.name) {
      const slug = generateSlug(club.name);
      await db.collection("clubs").updateOne(
        { _id: club._id },
        { $set: { slug } }
      );
      club.slug = slug;
    }

    // Remove MongoDB _id
    const { _id, ...clubData } = club;

    console.log(`✅ Found club: ${clubData.name}`);

    return NextResponse.json({ club: clubData });
  } catch (error: unknown) {
    console.error("Error fetching club:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;

    const { response: permRes } = await requirePermission(req, "club.edit");
    if (permRes) return permRes;
    const scope = await requireResourceAccess(req, "club", id);
    if (scope.response) return scope.response;

    const payload = await req.json();
    const client = await clientPromise;
    const db = client.db("hockey-app");

    const existing = await findClub(db, id);
    if (!existing) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // If name changed, regenerate slug
    const newSlug =
      payload.slug ||
      (payload.name && payload.name !== existing.name
        ? generateSlug(payload.name)
        : existing.slug || generateSlug(existing.name));

    const updatedData = {
      ...payload,
      id: existing.id, // Ensure legacy ID stays the same
      slug: newSlug,
      updatedAt: new Date().toISOString(),
    };

    // Remove _id if present
    delete (updatedData as any)._id;

    await db.collection("clubs").updateOne({ _id: existing._id }, { $set: updatedData });

    console.log(`✅ Updated club: ${updatedData.name}`);

    return NextResponse.json({
      message: "Club updated",
      club: updatedData,
    });
  } catch (error: unknown) {
    console.error("Error updating club:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
