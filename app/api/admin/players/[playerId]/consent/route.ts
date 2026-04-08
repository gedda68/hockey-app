// app/api/admin/players/[playerId]/consent/route.ts
// API for player consent & permissions data - FULL DATABASE INTEGRATION

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";
import {
  assertMemberInSessionScope,
  type MemberScopeDoc,
} from "@/lib/auth/memberRouteScope";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> },
) {
  try {
    const { playerId } = await params; // ✅ AWAIT params

    const { response: authRes } = await requirePermission(request, "member.view");
    if (authRes) return authRes;

    console.log("📋 Fetching consent data for player:", playerId);

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

    const consents = member.consents ?? {
      photoConsent: false,
      mediaConsent: false,
      transportConsent: false,
      firstAidConsent: false,
      emergencyTreatmentConsent: false,
    };

    console.log("✅ Consent data retrieved");

    return NextResponse.json({ consents });
  } catch (error: unknown) {
    console.error("❌ Error fetching consent:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch consent",
        details: error instanceof Error ? error.message : String(error),
      },
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
    const consents = await request.json();

    const { response: authRes } = await requirePermission(request, "member.edit");
    if (authRes) return authRes;

    console.log("📝 Updating consent for player:", playerId);

    // Add timestamp
    const updatedConsents = {
      ...consents,
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
        $set: {
          consents:  updatedConsents,
          updatedAt: new Date().toISOString(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    console.log("✅ Consent updated successfully");

    return NextResponse.json({
      success: true,
      consents: updatedConsents,
      message: "Consent preferences updated successfully",
    });
  } catch (error: unknown) {
    console.error("❌ Error updating consent:", error);
    return NextResponse.json(
      {
        error: "Failed to update consent",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
