// app/api/admin/associations/[associationId]/colors/route.ts
// API for updating association brand colors

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { z, ZodError } from "zod";

const ColorSchema = z.object({
  branding: z.object({
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    tertiaryColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
  }),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ associationId: string }> }
) {
  try {
    const { associationId } = await params;

    const { response: authRes } = await requirePermission(
      request,
      "association.settings",
    );
    if (authRes) return authRes;
    const { response: scopeRes } = await requireResourceAccess(
      request,
      "association",
      associationId,
    );
    if (scopeRes) return scopeRes;
    const body = await request.json();

    // Validate
    const validated = ColorSchema.parse(body);

    const client = await clientPromise;
    const db = client.db();

    // Check if association exists
    const existing = await db
      .collection("associations")
      .findOne({ associationId });

    if (!existing) {
      return NextResponse.json(
        { error: "Association not found" },
        { status: 404 }
      );
    }

    // Update colors
    await db.collection("associations").updateOne(
      { associationId },
      {
        $set: {
          branding: {
            ...existing.branding,
            ...validated.branding,
          },
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      message: "Colors updated successfully",
      branding: validated.branding,
    });
  } catch (error: unknown) {
    console.error("Error updating colors:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid color format",
          details: error.flatten(),
        },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Failed to update colors";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
