// app/api/test-level/route.ts
// Development-only endpoint for manually setting an association's level during
// local testing. Returns 404 in production so it cannot be discovered or used.
//
// Usage (dev only):
//   POST /api/test-level  { "associationId": "bha", "level": 3 }

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Hard block in production — return the same 404 that a non-existent route
  // would return so the endpoint is not detectable.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    // Dynamic import keeps the MongoDB driver out of the production bundle
    // even if tree-shaking misses the guard above.
    const { default: clientPromise } = await import("@/lib/mongodb");

    const { associationId, level } = await request.json();

    const client = await clientPromise;
    const db = client.db();

    const result = await db
      .collection("associations")
      .updateOne({ associationId }, { $set: { level: Number(level) } });

    const updated = await db.collection("associations").findOne({ associationId });

    if (!updated) {
      return NextResponse.json({ error: "Association not found" }, { status: 404 });
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
