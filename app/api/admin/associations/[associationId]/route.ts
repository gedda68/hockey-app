// app/api/admin/associations/[associationId]/route.ts
// FINAL FIX: Make fee dates nullable

import { NextRequest, NextResponse } from "next/server";
import type { Db } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { z, ZodError } from "zod";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { deriveAssociationLevelAndHierarchy } from "@/lib/domain/associationHierarchy";
import { PublicPartnerRowsSchema } from "@/lib/tenant/partnerRowsZod";

// Flexible schema for updates
const AssociationSchema = z.object({
  associationId: z.string().min(1),
  code: z.string().min(1).max(10),
  name: z.string().min(1),
  fullName: z.string().min(1),
  acronym: z.string().optional(),
  /** Subdomain for {portalSlug}.PORTAL_ROOT_DOMAIN (lowercase, no spaces) */
  portalSlug: z
    .string()
    .max(63)
    .regex(/^[a-z0-9-]*$/i)
    .optional(),

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
      registrationOpenDate: z.coerce.date().optional(),
      registrationCloseDate: z.coerce.date().optional(),
      transferRegistrationOpenDate: z.coerce.date().optional(),
      transferRegistrationCloseDate: z.coerce.date().optional(),
      requiresClearance: z.boolean().default(false),
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
      /** Public header / home hero — full URL or site-relative path (e.g. /icons/associations/…/file.png) */
      logoUrl: z.string().max(2048).optional(),
      bannerUrl: z.string().max(2048).optional(),
      /** Admin shell top bar — replaces colour gradient when set; null clears */
      adminHeaderBannerUrl: z
        .union([z.string().max(2048), z.null()])
        .optional(),
      publicHeaderBannerUrl: z
        .union([z.string().max(2048), z.null()])
        .optional(),
      /** Public footer + home partners strip (B5) */
      partners: PublicPartnerRowsSchema.optional(),
    })
    .optional(),

  status: z.enum(["active", "inactive", "suspended"]).default("active"),
});

// Helper: Calculate hierarchy and level
async function calculateHierarchy(
  db: Db,
  parentAssociationId?: string,
  opts?: { childAssociationId?: string },
): Promise<{ level: number; hierarchy: string[] }> {
  return deriveAssociationLevelAndHierarchy(db, parentAssociationId, opts);
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
  request: NextRequest,
  { params }: { params: Promise<{ associationId: string }> },
) {
  const { response: authRes } = await requirePermission(
    request,
    "association.view",
  );
  if (authRes) return authRes;

  try {
    const { associationId } = await params;

    const { response: scopeRes } = await requireResourceAccess(
      request,
      "association",
      associationId,
    );
    if (scopeRes) return scopeRes;

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
  request: NextRequest,
  { params }: { params: Promise<{ associationId: string }> },
) {
  const { response: authRes } = await requirePermission(
    request,
    "association.edit",
  );
  if (authRes) return authRes;

  try {
    const { associationId } = await params;

    const { response: scopeRes } = await requireResourceAccess(
      request,
      "association",
      associationId,
    );
    if (scopeRes) return scopeRes;

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

    if (validated.associationId !== associationId) {
      return NextResponse.json(
        { error: "associationId in body must match URL" },
        { status: 400 },
      );
    }

    if (validated.parentAssociationId?.trim() === associationId) {
      return NextResponse.json(
        { error: "Invalid parentAssociationId (cannot be self)" },
        { status: 400 },
      );
    }

    // `level` + `hierarchy` are derived from the parent chain.
    // Never trust client-provided values; also prevents ancestor cycles.
    const { level, hierarchy } = await calculateHierarchy(
      db,
      validated.parentAssociationId,
      { childAssociationId: associationId },
    );

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
  request: NextRequest,
  { params }: { params: Promise<{ associationId: string }> },
) {
  const { response: authRes } = await requirePermission(
    request,
    "association.delete",
  );
  if (authRes) return authRes;

  try {
    const { associationId } = await params;

    const { response: scopeRes } = await requireResourceAccess(
      request,
      "association",
      associationId,
    );
    if (scopeRes) return scopeRes;

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
