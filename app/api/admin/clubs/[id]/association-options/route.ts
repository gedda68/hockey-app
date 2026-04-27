// GET — parent-association choices for ClubForm (club-scoped users lack association.view).

import { NextRequest, NextResponse } from "next/server";
import type { Db } from "mongodb";
import clientPromise from "@/lib/mongodb";
import {
  getUserFromRequest,
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";

type Ctx = { params: Promise<{ id: string }> };

async function findClub(db: Db, idOrSlug: string) {
  return db.collection("clubs").findOne({
    $or: [{ slug: idOrSlug }, { id: idOrSlug }],
  });
}

function mapAssoc(a: Record<string, unknown>) {
  return {
    associationId: String(a.associationId ?? ""),
    code: String(a.code ?? ""),
    name: String(a.name ?? ""),
    level: typeof a.level === "number" ? a.level : 0,
  };
}

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const ref = id?.trim();
    if (!ref) {
      return NextResponse.json({ error: "Club id required" }, { status: 400 });
    }

    const { response: permRes } = await requireAnyPermission(request, [
      "club.view",
      "club.edit",
    ]);
    if (permRes) return permRes;

    const { response: scopeRes } = await requireResourceAccess(
      request,
      "club",
      ref,
    );
    if (scopeRes) return scopeRes;

    const client = await clientPromise;
    const db = client.db();
    const club = await findClub(db, ref);
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const user = await getUserFromRequest(request);
    const perms = (user?.permissions ?? []) as string[];
    const canListAll =
      user?.role === "super-admin" || perms.includes("association.view");

    if (canListAll) {
      const rows = await db
        .collection("associations")
        .find({ status: "active" })
        .project({ associationId: 1, code: 1, name: 1, level: 1 })
        .sort({ level: 1, name: 1 })
        .limit(400)
        .toArray();
      return NextResponse.json({
        associations: rows.map((a) => mapAssoc(a as Record<string, unknown>)),
      });
    }

    const parentId = club.parentAssociationId as string | undefined;
    if (!parentId) {
      return NextResponse.json({ associations: [] });
    }
    const parent = await db.collection("associations").findOne({
      associationId: parentId,
    });
    return NextResponse.json({
      associations: parent ? [mapAssoc(parent as Record<string, unknown>)] : [],
    });
  } catch (e: unknown) {
    console.error("GET club association-options:", e);
    return NextResponse.json(
      { error: "Failed to load associations" },
      { status: 500 },
    );
  }
}

