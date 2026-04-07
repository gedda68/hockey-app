// Create this file: app/api/test-level/route.ts
// This is a simple test endpoint to manually set a level

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const { associationId, level } = await request.json();

    const client = await clientPromise;
    const db = client.db();

    const result = await db
      .collection("associations")
      .updateOne({ associationId }, { $set: { level: Number(level) } });

    const updated = await db
      .collection("associations")
      .findOne({ associationId });

    if (!updated) {
      return NextResponse.json(
        { error: "Association not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      updatedAssociation: {
        associationId: updated.associationId,
        name: updated.name,
        level: updated.level,
        levelType: typeof updated.level,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
