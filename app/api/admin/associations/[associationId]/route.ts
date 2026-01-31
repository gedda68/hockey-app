// app/api/admin/associations/[associationId]/route.ts
// Fixed: Make level, hierarchy, and fee dates optional/flexible

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { z } from "zod";

// Flexible schema for updates - level and hierarchy are optional
const AssociationSchema = z.object({
  associationId: z.string().min(1),
  code: z.string().min(1).max(10),
  name: z.string().min(1),
  fullName: z.string().min(1),
  acronym: z.string().optional(),

  parentAssociationId: z.string().optional(),
  level: z.number().optional(), // Auto-calculated
  hierarchy: z.array(z.string()).optional(), // Auto-calculated

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

  // Fees with flexible date handling
  fees: z
    .array(
      z.object({
        feeId: z.string(),
        name: z.string(),
        amount: z.number(),
        category: z.string().optional(),
        isActive: z.boolean().optional(),
        validFrom: z.union([z.date(), z.string()]).optional(), // Accept both
        validTo: z.union([z.date(), z.string()]).optional(), // Accept both
        ageCategories: z.array(z.string()).optional(),
        roleCategories: z.array(z.string()).optional(),
      })
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
    })
    .optional(),

  status: z.enum(["active", "inactive", "suspended"]).default("active"),
});

// Helper: Calculate hierarchy and level
async function calculateHierarchy(
  db: any,
  parentAssociationId?: string
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

// Helper: Convert date strings to Date objects
function normalizeFees(fees: any[]) {
  return fees.map((fee) => ({
    ...fee,
    validFrom: fee.validFrom ? new Date(fee.validFrom) : undefined,
    validTo: fee.validTo ? new Date(fee.validTo) : undefined,
  }));
}

// GET /api/admin/associations/[id] - Get single association
export async function GET(
  request: Request,
  { params }: { params: Promise<{ associationId: string }> }
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
        { status: 404 }
      );
    }

    // Get parent info
    let parent = null;
    if (association.parentAssociationId) {
      parent = await db
        .collection("associations")
        .findOne({ associationId: association.parentAssociationId });
    }

    // Get ancestors (full hierarchy)
    const ancestors = [];
    if (association.hierarchy && association.hierarchy.length > 0) {
      const ancestorDocs = await db
        .collection("associations")
        .find({ associationId: { $in: association.hierarchy } })
        .toArray();
      ancestors.push(...ancestorDocs);
    }

    // Get children
    const children = await db
      .collection("associations")
      .find({ parentAssociationId: associationId })
      .toArray();

    // Get clubs
    const clubs = await db
      .collection("clubs")
      .find({ parentAssociationId: associationId })
      .toArray();

    // Get registration statistics
    const statistics = {
      total: await db
        .collection("association-registrations")
        .countDocuments({ associationId }),
      active: await db
        .collection("association-registrations")
        .countDocuments({ associationId, status: "active" }),
      pending: await db
        .collection("association-registrations")
        .countDocuments({ associationId, status: "pending" }),
    };

    return NextResponse.json({
      ...association,
      parent,
      ancestors,
      children,
      clubs,
      statistics,
    });
  } catch (error: any) {
    console.error("Error fetching association:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch association" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/associations/[id] - Update association
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ associationId: string }> }
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
        { status: 404 }
      );
    }

    // Validate with Zod (level and hierarchy are optional)
    const validated = AssociationSchema.parse(body);

    // Check if parent changed
    const parentChanged =
      validated.parentAssociationId !== existing.parentAssociationId;

    // Auto-calculate level and hierarchy
    let level = existing.level;
    let hierarchy = existing.hierarchy;

    if (parentChanged) {
      // Recalculate based on new parent
      const calculated = await calculateHierarchy(
        db,
        validated.parentAssociationId
      );
      level = calculated.level;
      hierarchy = calculated.hierarchy;

      // Check for circular reference
      if (validated.parentAssociationId === associationId) {
        return NextResponse.json(
          { error: "Cannot set association as its own parent" },
          { status: 400 }
        );
      }

      // Check if new parent would create circular reference
      if (hierarchy.includes(associationId)) {
        return NextResponse.json(
          {
            error:
              "Circular reference detected - association is ancestor of new parent",
          },
          { status: 400 }
        );
      }
    }

    // Normalize fees (convert date strings to Date objects)
    const normalizedFees = normalizeFees(validated.fees || []);

    // Update association
    const update = {
      ...validated,
      level,
      hierarchy,
      fees: normalizedFees,
      settings: {
        requiresApproval: validated.settings?.requiresApproval ?? false,
        autoApproveReturningPlayers:
          validated.settings?.autoApproveReturningPlayers ?? true,
        allowMultipleClubs: validated.settings?.allowMultipleClubs ?? true,
        seasonStartMonth: validated.settings?.seasonStartMonth || 1,
        seasonEndMonth: validated.settings?.seasonEndMonth || 12,
        requiresInsurance: validated.settings?.requiresInsurance ?? true,
        requiresMedicalInfo: validated.settings?.requiresMedicalInfo ?? true,
        requiresEmergencyContact:
          validated.settings?.requiresEmergencyContact ?? true,
      },
      branding: {
        primaryColor: validated.branding?.primaryColor || "#06054e",
        secondaryColor: validated.branding?.secondaryColor || "#FFD700",
      },
      updatedAt: new Date(),
    };

    await db
      .collection("associations")
      .updateOne({ associationId }, { $set: update });

    // If parent changed, update all descendants' hierarchies
    if (parentChanged) {
      const descendants = await db
        .collection("associations")
        .find({ hierarchy: associationId })
        .toArray();

      for (const descendant of descendants) {
        // Find where this association appears in descendant's hierarchy
        const indexInHierarchy = descendant.hierarchy.indexOf(associationId);

        // New hierarchy = new parent's hierarchy + this association + remaining path
        const newDescendantHierarchy = [
          ...hierarchy,
          associationId,
          ...descendant.hierarchy.slice(indexInHierarchy + 1),
        ];

        // New level = length of new hierarchy
        const newDescendantLevel = newDescendantHierarchy.length;

        await db.collection("associations").updateOne(
          { associationId: descendant.associationId },
          {
            $set: {
              hierarchy: newDescendantHierarchy,
              level: newDescendantLevel,
              updatedAt: new Date(),
            },
          }
        );
      }
    }

    return NextResponse.json({
      message: "Association updated successfully",
      association: {
        associationId,
        code: validated.code,
        name: validated.name,
        level,
      },
    });
  } catch (error: any) {
    console.error("Error updating association:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to update association" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/associations/[id] - Soft delete
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ associationId: string }> }
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
        { status: 404 }
      );
    }

    // Check for children
    const childrenCount = await db
      .collection("associations")
      .countDocuments({ parentAssociationId: associationId });

    if (childrenCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete association with child associations" },
        { status: 400 }
      );
    }

    // Check for clubs
    const clubsCount = await db
      .collection("clubs")
      .countDocuments({ parentAssociationId: associationId });

    if (clubsCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete association with clubs" },
        { status: 400 }
      );
    }

    // Check for active registrations
    const activeRegistrations = await db
      .collection("association-registrations")
      .countDocuments({ associationId, status: "active" });

    if (activeRegistrations > 0) {
      return NextResponse.json(
        { error: "Cannot delete association with active registrations" },
        { status: 400 }
      );
    }

    // Soft delete (set status to inactive)
    await db
      .collection("associations")
      .updateOne(
        { associationId },
        { $set: { status: "inactive", updatedAt: new Date() } }
      );

    return NextResponse.json({
      message: "Association deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting association:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete association" },
      { status: 500 }
    );
  }
}
