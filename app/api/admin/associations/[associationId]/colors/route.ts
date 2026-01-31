// app/api/admin/associations/[associationId]/colors/route.ts
// API for updating association brand colors

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { z } from "zod";

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
  request: Request,
  { params }: { params: Promise<{ associationId: string }> }
) {
  try {
    const { associationId } = await params;
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
  } catch (error: any) {
    console.error("Error updating colors:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        {
          error: "Invalid color format",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to update colors" },
      { status: 500 }
    );
  }
}
