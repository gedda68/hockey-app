// app/api/admin/associations/[associationId]/route.ts
// FINAL FIX: Make fee dates nullable

import { NextResponse } from "next/server";
import type { Db } from 'mongodb';
import clientPromise from "@/lib/mongodb";
import { z, ZodError } from "zod";

// Flexible schema for updates
const AssociationSchema = z.object({
  associationId: z.string().min(1),
  code: z.string().min(1).max(10),
  name: z.string().min(1),
  fullName: z.string().min(1),
  acronym: z.string().optional(),

  parentAssociationId: z.string().optional(),
  level: z.number().optional(),
  hierarchy: z.array(z.string()).optional(),

  region: z.string().min(1),
  state: z.string().min(1),
  country: z.string().default("Australia"),
  timezone: z.string().default("Australia/Brisbane"),

  address: z.object({
    street: z.string().min(1),
    suburb: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    postcode: z.string().min(1),
    country: z.string().default("Australia"),
  }),

  contact: z.object({
    primaryEmail: z.string().email(),
    secondaryEmail: z.string().email().optional(),
    phone: z.string().min(1),
    mobile: z.string().optional(),
    website: z.string().url().optional(),
  }),

  socialMedia: z
    .object({
      facebook: z.string().optional(),
      instagram: z.string().optional(),
      twitter: z.string().optional(),
    })
    .optional(),

  positions: z.array(z.any()).default([]),

  // ✅ FIX: Fees with nullable dates
  fees: z
    .array(
      z.object({
        feeId: z.string(),
        name: z.string(),
        amount: z.number(),
        category: z.string().optional(),
        isActive: z.boolean().optional(),
        validFrom: z
          .union([z.date(), z.string(), z.null()])
          .optional()
          .nullable(),
        validTo: z
          .union([z.date(), z.string(), z.null()])
          .optional()
          .nullable(),
        ageCategories: z.array(z.string()).optional(),
        roleCategories: z.array(z.string()).optional(),
      }),
    )
    .default([]),

  settings: z
    .object({
      requiresApproval: z.boolean().default(false),
      autoApproveReturningPlayers: z.boolean().default(true),
      allowMultipleClubs: z.boolean().default(true),
      seasonStartMonth: z.number().min(1).max(12).default(1),
      seasonEndMonth: z.number().min(1).max(12).default(12),
      requiresInsurance: z.boolean().default(true),
      requiresMedicalInfo: z.boolean().default(true),
      requiresEmergencyContact: z.boolean().default(true),
    })
    .optional(),

  branding: z
    .object({
      primaryColor: z.string().default("#06054e"),
      secondaryColor: z.string().default("#FFD700"),
      accentColor: z.string().default("#ffd700"),
    })
    .optional(),

  status: z.enum(["active", "inactive", "suspended"]).default("active"),
});

// Helper: Calculate hierarchy and level
async function calculateHierarchy(
  db: Db,
  parentAssociationId?: string,
): Promise<{ level: number; hierarchy: string[] }> {
  if (!parentAssociationId) {
    return { level: 0, hierarchy: [] };
  }

  const parent = await db
    .collection("associations")
    .findOne({ associationId: parentAssociationId });

  if (!parent) {
    throw new Error("Parent association not found");
  }

  return {
    level: parent.level + 1,
    hierarchy: [...(parent.hierarchy || []), parent.associationId],
  };
}

// Helper: Normalize fees
function normalizeFees(fees: any[]) {
  return fees.map((fee) => ({
    ...fee,
    validFrom: fee.validFrom ? new Date(fee.validFrom) : null,
    validTo: fee.validTo ? new Date(fee.validTo) : null,
  }));
}

// GET /api/admin/associations/[id] - Get single association
export async function GET(
  request: Request,
  { params }: { params: Promise<{ associationId: string }> },
) {
  try {
    const { associationId } = await params;

    const client = await clientPromise;
    const db = client.db();

    const association = await db
      .collection("associations")
      .findOne({ associationId });

    if (!association) {
      return NextResponse.json(
        { error: "Association not found" },
        { status: 404 },
      );
    }

    // Get parent info
    let parent = null;
    if (association.parentAssociationId) {
      parent = await db
        .collection("associations")
        .findOne({ associationId: association.parentAssociationId });
    }

    // Get children
    const children = await db
      .collection("associations")
      .find({ parentAssociationId: associationId })
      .toArray();

    return NextResponse.json({
      ...association,
      parent: parent
        ? {
            associationId: parent.associationId,
            name: parent.name,
            code: parent.code,
          }
        : null,
      childrenCount: children.length,
    });
  } catch (error: unknown) {
    console.error("Error fetching association:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch association";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/admin/associations/[id] - Update association
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ associationId: string }> },
) {
  try {
    const { associationId } = await params;
    const body = await request.json();

    const client = await clientPromise;
    const db = client.db();

    // Check if association exists
    const existing = await db
      .collection("associations")
      .findOne({ associationId });

    if (!existing) {
      return NextResponse.json(
        { error: "Association not found" },
        { status: 404 },
      );
    }

    // Validate with Zod
    const validated = AssociationSchema.parse(body);

    // Check if parent changed
    const parentChanged =
      validated.parentAssociationId !== existing.parentAssociationId;

    // ✅ FIX: Respect submitted level, only auto-calculate if not provided
    let level = validated.level ?? existing.level;
    let hierarchy = existing.hierarchy;

    if (parentChanged) {
      const parent = validated.parentAssociationId
        ? await db.collection("associations").findOne({
            associationId: validated.parentAssociationId,
          })
        : null;

      hierarchy = parent
        ? [...(parent.hierarchy || []), parent.associationId]
        : [];

      // Only auto-calculate level if not explicitly provided
      if (validated.level === undefined) {
        level = parent ? parent.level + 1 : 0;
      }
    }

    // Prepare update
    const updateData = {
      ...validated,
      level,
      hierarchy,
      fees: normalizeFees(validated.fees || []),
      updatedAt: new Date(),
    };

    // Check for code conflicts (excluding self)
    const codeConflict = await db.collection("associations").findOne({
      code: validated.code,
      associationId: { $ne: associationId },
    });

    if (codeConflict) {
      return NextResponse.json(
        { error: "Code already in use by another association" },
        { status: 400 },
      );
    }

    // Update
    const result = await db
      .collection("associations")
      .updateOne({ associationId }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Association not found" },
        { status: 404 },
      );
    }

    // Fetch and return updated association
    const updated = await db
      .collection("associations")
      .findOne({ associationId });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("Error updating association:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to update association";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/admin/associations/[id] - Delete association
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ associationId: string }> },
) {
  try {
    const { associationId } = await params;

    const client = await clientPromise;
    const db = client.db();

    // Check if association exists
    const existing = await db
      .collection("associations")
      .findOne({ associationId });

    if (!existing) {
      return NextResponse.json(
        { error: "Association not found" },
        { status: 404 },
      );
    }

    // Check if it has children
    const children = await db
      .collection("associations")
      .find({ parentAssociationId: associationId })
      .toArray();

    if (children.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete association with child associations",
          childCount: children.length,
        },
        { status: 400 },
      );
    }

    // Check if it has any clubs
    const clubs = await db
      .collection("clubs")
      .find({ associationId })
      .toArray();

    if (clubs.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete association with registered clubs",
          clubCount: clubs.length,
        },
        { status: 400 },
      );
    }

    // Safe to delete
    await db.collection("associations").deleteOne({ associationId });

    return NextResponse.json({
      message: "Association deleted successfully",
      associationId,
    });
  } catch (error: unknown) {
    console.error("Error deleting association:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete association";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
