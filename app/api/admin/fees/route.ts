// app/api/admin/fees/route.ts

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";

export async function GET(req: NextRequest) {
  const { response } = await requirePermission(req, "club.fees");
  if (response) return response;

  try {
    const { searchParams } = new URL(req.url);
    const ownerType = searchParams.get("ownerType");
    const ownerId = searchParams.get("ownerId");

    if (!ownerType || !ownerId) {
      return NextResponse.json(
        { error: "ownerType and ownerId are required" },
        { status: 400 }
      );
    }

    if (ownerType === "association") {
      const scope = await requireResourceAccess(req, "association", ownerId);
      if (scope.response) return scope.response;
    } else if (ownerType === "club") {
      const scope = await requireResourceAccess(req, "club", ownerId);
      if (scope.response) return scope.response;
    } else {
      return NextResponse.json({ error: "Invalid ownerType" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const collection = ownerType === "association" ? "associations" : "clubs";
    const filter =
      ownerType === "association"
        ? { associationId: ownerId }
        : { $or: [{ slug: ownerId }, { id: ownerId }] };

    const doc = await db.collection(collection).findOne(filter);

    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ fees: doc.fees || {} });
  } catch (error) {
    console.error("GET /api/admin/fees error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, response } = await requirePermission(req, "club.fees");
  if (response) return response;

  try {
    const { ownerType, ownerId, fees } = await req.json();

    if (!ownerType || !ownerId) {
      return NextResponse.json(
        { error: "ownerType and ownerId are required" },
        { status: 400 }
      );
    }

    if (ownerType === "association") {
      const scope = await requireResourceAccess(req, "association", ownerId);
      if (scope.response) return scope.response;
    } else if (ownerType === "club") {
      const scope = await requireResourceAccess(req, "club", ownerId);
      if (scope.response) return scope.response;
    } else {
      return NextResponse.json({ error: "Invalid ownerType" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const collection = ownerType === "association" ? "associations" : "clubs";
    const filter =
      ownerType === "association"
        ? { associationId: ownerId }
        : { $or: [{ slug: ownerId }, { id: ownerId }] };

    const prev = await db.collection(collection).findOne(filter);

    await db
      .collection(collection)
      .updateOne(filter, { $set: { fees, updatedAt: new Date().toISOString() } }, { upsert: false });

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "fee_rules",
      action: "update",
      resourceType: ownerType,
      resourceId: ownerId,
      summary: `Updated ${ownerType} fee rules`,
      before: prev?.fees ?? null,
      after: fees ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/admin/fees error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
