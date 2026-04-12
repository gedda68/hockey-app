// GET/PUT — team selection & movement policy for one association (national / state / metro tier).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  getUserFromRequest,
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import {
  DEFAULT_TEAM_SELECTION_POLICY,
  SELECTION_POLICIES_COLLECTION,
  ancestorAssociationIdsRootFirst,
  deepMergePolicies,
  normalizePolicyInput,
  type TeamSelectionPolicy,
} from "@/lib/selection/teamSelectionPolicy";

type Ctx = { params: Promise<{ associationId: string }> };

function dbName() {
  return process.env.DB_NAME || "hockey-app";
}

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { associationId } = await ctx.params;
    const aid = associationId?.trim();
    if (!aid) {
      return NextResponse.json({ error: "associationId required" }, { status: 400 });
    }

    const { response: scopeRes } = await requireResourceAccess(
      request,
      "association",
      aid,
    );
    if (scopeRes) return scopeRes;

    const { response: permRes } = await requireAnyPermission(request, [
      "association.view",
      "association.edit",
      "association.settings",
    ]);
    if (permRes) return permRes;

    const client = await clientPromise;
    const db = client.db(dbName());

    const row = await db.collection(SELECTION_POLICIES_COLLECTION).findOne({
      scope: "association",
      associationId: aid,
    });

    const policy: TeamSelectionPolicy = row?.policy
      ? normalizePolicyInput(row.policy)
      : { ...DEFAULT_TEAM_SELECTION_POLICY };

    const chain = await ancestorAssociationIdsRootFirst(db, aid);
    const parentChain = chain.filter((id) => id !== aid);
    let inherited: TeamSelectionPolicy = { ...DEFAULT_TEAM_SELECTION_POLICY };
    for (const id of parentChain) {
      const p = await db.collection(SELECTION_POLICIES_COLLECTION).findOne({
        scope: "association",
        associationId: id,
      });
      if (p?.policy) inherited = deepMergePolicies(inherited, normalizePolicyInput(p.policy));
    }

    const assoc = await db.collection("associations").findOne({ associationId: aid });
    const level = assoc?.level ?? null;

    return NextResponse.json({
      associationId: aid,
      level,
      policy,
      inheritedPreview: inherited,
      updatedAt: row?.updatedAt ?? null,
    });
  } catch (e: unknown) {
    console.error("GET selection-policy:", e);
    return NextResponse.json({ error: "Failed to load policy" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  try {
    const { associationId } = await ctx.params;
    const aid = associationId?.trim();
    if (!aid) {
      return NextResponse.json({ error: "associationId required" }, { status: 400 });
    }

    const { response: scopeRes } = await requireResourceAccess(
      request,
      "association",
      aid,
    );
    if (scopeRes) return scopeRes;

    const { response: permRes } = await requireAnyPermission(request, [
      "association.edit",
      "competitions.manage",
    ]);
    if (permRes) return permRes;

    const body = await request.json();
    const policy = normalizePolicyInput(body.policy ?? body);

    const user = await getUserFromRequest(request);
    const client = await clientPromise;
    const db = client.db(dbName());
    const now = new Date().toISOString();

    await db.collection(SELECTION_POLICIES_COLLECTION).updateOne(
      { scope: "association", associationId: aid },
      {
        $set: {
          scope: "association",
          associationId: aid,
          policy,
          updatedAt: now,
          updatedByUserId: user?.userId ?? undefined,
        },
      },
      { upsert: true },
    );

    return NextResponse.json({ success: true, policy, updatedAt: now });
  } catch (e: unknown) {
    console.error("PUT selection-policy:", e);
    return NextResponse.json({ error: "Failed to save policy" }, { status: 500 });
  }
}
