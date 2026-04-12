// GET/PUT — club-level team selection policy (overrides parent association chain).

import { NextRequest, NextResponse } from "next/server";
import type { Db } from "mongodb";
import clientPromise from "@/lib/mongodb";
import {
  getUserFromRequest,
  requireAnyPermission,
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import {
  DEFAULT_TEAM_SELECTION_POLICY,
  SELECTION_POLICIES_COLLECTION,
  resolveEffectiveTeamSelectionPolicy,
  normalizePolicyInput,
  type TeamSelectionPolicy,
} from "@/lib/selection/teamSelectionPolicy";

type Ctx = { params: Promise<{ id: string }> };

function dbName() {
  return process.env.DB_NAME || "hockey-app";
}

async function findClub(db: Db, idOrSlug: string) {
  return db.collection("clubs").findOne({
    $or: [{ slug: idOrSlug }, { id: idOrSlug }],
  });
}

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const ref = id?.trim();
    if (!ref) {
      return NextResponse.json({ error: "Club id required" }, { status: 400 });
    }

    const { response: permRes } = await requirePermission(request, "club.view");
    if (permRes) return permRes;
    const { response: scopeRes } = await requireResourceAccess(request, "club", ref);
    if (scopeRes) return scopeRes;

    const client = await clientPromise;
    const db = client.db(dbName());
    const club = await findClub(db, ref);
    if (!club?.id) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const canonicalId = String(club.id);
    const row = await db.collection(SELECTION_POLICIES_COLLECTION).findOne({
      scope: "club",
      clubId: canonicalId,
    });

    const policy: TeamSelectionPolicy = row?.policy
      ? normalizePolicyInput(row.policy)
      : { ...DEFAULT_TEAM_SELECTION_POLICY };

    const effective = await resolveEffectiveTeamSelectionPolicy(db, canonicalId);

    return NextResponse.json({
      clubId: canonicalId,
      clubSlug: club.slug ?? null,
      clubName: club.name ?? null,
      policy,
      effectivePreview: effective,
      updatedAt: row?.updatedAt ?? null,
    });
  } catch (e: unknown) {
    console.error("GET club selection-policy:", e);
    return NextResponse.json({ error: "Failed to load policy" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const ref = id?.trim();
    if (!ref) {
      return NextResponse.json({ error: "Club id required" }, { status: 400 });
    }

    const { response: permRes } = await requireAnyPermission(request, [
      "club.edit",
      "association.edit",
    ]);
    if (permRes) return permRes;
    const { response: scopeRes } = await requireResourceAccess(request, "club", ref);
    if (scopeRes) return scopeRes;

    const body = await request.json();
    const policy = normalizePolicyInput(body.policy ?? body);

    const client = await clientPromise;
    const db = client.db(dbName());
    const club = await findClub(db, ref);
    if (!club?.id) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const canonicalId = String(club.id);
    const user = await getUserFromRequest(request);
    const now = new Date().toISOString();

    await db.collection(SELECTION_POLICIES_COLLECTION).updateOne(
      { scope: "club", clubId: canonicalId },
      {
        $set: {
          scope: "club",
          clubId: canonicalId,
          policy,
          updatedAt: now,
          updatedByUserId: user?.userId ?? undefined,
        },
      },
      { upsert: true },
    );

    return NextResponse.json({ success: true, policy, updatedAt: now });
  } catch (e: unknown) {
    console.error("PUT club selection-policy:", e);
    return NextResponse.json({ error: "Failed to save policy" }, { status: 500 });
  }
}
