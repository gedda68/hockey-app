// app/api/admin/associations/[associationId]/fees/route.ts

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";

interface FeeItem {
  id: string;
  name: string;
  amount: number;
  description?: string;
  isActive: boolean;
}

interface FeesStructure {
  [key: string]: FeeItem[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ associationId: string }> }
) {
  try {
    const { associationId } = await params;

    const { response: authRes } = await requirePermission(
      request,
      "association.fees",
    );
    if (authRes) return authRes;
    const { response: scopeRes } = await requireResourceAccess(
      request,
      "association",
      associationId,
    );
    if (scopeRes) return scopeRes;
    const client = await clientPromise;
    const db = client.db("hockey-app");

    const association = await db
      .collection("associations")
      .findOne({ associationId });

    if (!association) {
      return NextResponse.json({ error: "Association not found" }, { status: 404 });
    }

    const fees: FeesStructure = association.fees || {};
    return NextResponse.json({ fees });
  } catch (error) {
    console.error("GET /api/admin/associations/[associationId]/fees error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ associationId: string }> }
) {
  try {
    const { associationId } = await params;

    const { response: authRes } = await requirePermission(
      request,
      "association.fees",
    );
    if (authRes) return authRes;
    const { response: scopeRes } = await requireResourceAccess(
      request,
      "association",
      associationId,
    );
    if (scopeRes) return scopeRes;
    const body = await request.json();
    const fees: FeesStructure = body.fees;

    if (!fees || typeof fees !== "object") {
      return NextResponse.json({ error: "Invalid fees data" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const result = await db.collection("associations").updateOne(
      { associationId },
      { $set: { fees, updatedAt: new Date().toISOString() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Association not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/admin/associations/[associationId]/fees error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
