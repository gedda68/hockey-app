// app/api/admin/associations/route.ts
// Associations API with hierarchical filtering + comprehensive validation

import { NextRequest, NextResponse } from "next/server";
import type { Db } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { z, ZodError } from "zod";
import { escapeRegex } from "@/lib/utils/regex";
import { PublicPartnerRowsSchema } from "@/lib/tenant/partnerRowsZod";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { deriveAssociationLevelAndHierarchy } from "@/lib/domain/associationHierarchy";
import { associationLevelSummary } from "@/lib/domain/associationLevelDisplay";

// Schema for creating/updating associations
const AssociationSchema = z.object({
  associationId: z.string().min(1),
  code: z.string().min(1).max(10),
  name: z.string().min(1),
  fullName: z.string().min(1),
  acronym: z.string().optional(),
  portalSlug: z
    .string()
    .max(63)
    .regex(/^[a-z0-9-]*$/i)
    .optional(),

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
  fees: z.array(z.any()).default([]),

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
      logoUrl: z.string().max(2048).optional(),
      bannerUrl: z.string().max(2048).optional(),
      adminHeaderBannerUrl: z
        .union([z.string().max(2048), z.null()])
        .optional(),
      publicHeaderBannerUrl: z
        .union([z.string().max(2048), z.null()])
        .optional(),
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

// GET /api/admin/associations - List associations with hierarchical filtering
export async function GET(request: NextRequest) {
  const { response: authRes } = await requirePermission(
    request,
    "association.view",
  );
  if (authRes) return authRes;

  try {
    const { searchParams } = new URL(request.url);

    // Filters
    const status = searchParams.get("status");
    const level = searchParams.get("level"); // Can be numeric (0,1,2,3) or string (National, State, City)
    const parentId = searchParams.get("parentId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db();

    // Build query
    const query: Record<string, unknown> = {};

    if (status) {
      query.status = status;
    } else {
      // Default to active only
      query.status = "active";
    }

    // Handle level filtering (support both string and numeric)
    if (level) {
      // Try parsing as number first
      const numericLevel = parseInt(level);

      if (!isNaN(numericLevel)) {
        // It's a number: 0, 1, 2, 3
        query.level = numericLevel;
      } else {
        // It's a string: 'National', 'State', 'City', 'Region'
        const levelMap: Record<string, number> = {
          National: 0,
          State: 1,
          City: 2,
          Region: 3,
        };
        query.level = levelMap[level] ?? 0;
      }
    }

    // Support both 'parentId' and 'parentAssociationId' for backwards compatibility
    if (parentId) {
      query.parentAssociationId = parentId;
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { code: { $regex: safeSearch, $options: "i" } },
        { fullName: { $regex: safeSearch, $options: "i" } },
      ];
    }


    // Get total count
    const total = await db.collection("associations").countDocuments(query);

    // Get associations
    const associations = await db
      .collection("associations")
      .find(query)
      .sort({ level: 1, name: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // For simple list (used by wizard), return minimal data
    if (searchParams.get("simple") === "true") {
      const simple = associations.map((a) => {
        const lvl = typeof a.level === "number" ? a.level : 0;
        return {
          id: a.associationId,
          name: a.name,
          /** Stored tree depth (`associations.level`), same as list filters and RBAC. */
          level: lvl,
          levelSummary: associationLevelSummary(lvl),
          parentId: a.parentAssociationId,
        };
      });

      return NextResponse.json({
        associations: simple,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // For full admin view, enrich with parent info and counts
    const enriched = await Promise.all(
      associations.map(async (assoc) => {
        // Get parent
        let parent = null;
        if (assoc.parentAssociationId) {
          parent = await db
            .collection("associations")
            .findOne(
              { associationId: assoc.parentAssociationId },
              { projection: { name: 1, code: 1 } },
            );
        }

        // Count children
        const childrenCount = await db
          .collection("associations")
          .countDocuments({ parentAssociationId: assoc.associationId });

        // Count clubs
        const clubsCount = await db
          .collection("clubs")
          .countDocuments({ parentAssociationId: assoc.associationId });

        return {
          ...assoc,
          levelString: associationLevelSummary(assoc.level),
          parent: parent ? { name: parent.name, code: parent.code } : null,
          childrenCount,
          clubsCount,
        };
      }),
    );

    return NextResponse.json({
      associations: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error("💥 Error fetching associations:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch associations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/admin/associations - Create new association
export async function POST(request: NextRequest) {
  const { user, response: authRes } = await requirePermission(
    request,
    "association.create",
  );
  if (authRes) return authRes;

  try {
    const body = await request.json();

    // Validate with Zod (level and hierarchy are optional - auto-calculated)
    const validated = AssociationSchema.parse(body);

    if (!validated.parentAssociationId && user.role !== "super-admin") {
      return NextResponse.json(
        { error: "Forbidden — only super-admin may create root associations" },
        { status: 403 },
      );
    }
    if (validated.parentAssociationId) {
      const { response: scopeRes } = await requireResourceAccess(
        request,
        "association",
        validated.parentAssociationId,
      );
      if (scopeRes) return scopeRes;
    }

    const client = await clientPromise;
    const db = client.db();

    // Check if associationId already exists
    const existing = await db
      .collection("associations")
      .findOne({ associationId: validated.associationId });

    if (existing) {
      return NextResponse.json(
        { error: "Association ID already exists" },
        { status: 400 },
      );
    }

    // Check if code already exists
    const existingCode = await db
      .collection("associations")
      .findOne({ code: validated.code });

    if (existingCode) {
      return NextResponse.json(
        { error: "Association code already exists" },
        { status: 400 },
      );
    }

    if (validated.parentAssociationId?.trim() === validated.associationId) {
      return NextResponse.json(
        { error: "Invalid parentAssociationId (cannot be self)" },
        { status: 400 },
      );
    }

    // ✅ AUTO-CALCULATE level and hierarchy (cycle-safe)
    const { level, hierarchy } = await calculateHierarchy(db, validated.parentAssociationId, {
      childAssociationId: validated.associationId,
    });

    // Create association document
    const association = {
      ...validated,
      level, // Auto-calculated
      hierarchy, // Auto-calculated
      positions: validated.positions || [],
      fees: validated.fees || [],
      settings: {
        requiresApproval: validated.settings?.requiresApproval ?? false,
        autoApproveReturningPlayers:
          validated.settings?.autoApproveReturningPlayers ?? true,
        allowMultipleClubs: validated.settings?.allowMultipleClubs ?? true,
        seasonStartMonth: validated.settings?.seasonStartMonth || 1,
        seasonEndMonth: validated.settings?.seasonEndMonth || 12,
        registrationOpenDate: validated.settings?.registrationOpenDate,
        registrationCloseDate: validated.settings?.registrationCloseDate,
        transferRegistrationOpenDate:
          validated.settings?.transferRegistrationOpenDate,
        transferRegistrationCloseDate:
          validated.settings?.transferRegistrationCloseDate,
        requiresClearance: validated.settings?.requiresClearance ?? false,
        requiresInsurance: validated.settings?.requiresInsurance ?? true,
        requiresMedicalInfo: validated.settings?.requiresMedicalInfo ?? true,
        requiresEmergencyContact:
          validated.settings?.requiresEmergencyContact ?? true,
      },
      branding: {
        primaryColor: validated.branding?.primaryColor || "#06054e",
        secondaryColor: validated.branding?.secondaryColor || "#FFD700",
        ...(validated.branding?.accentColor != null
          ? { accentColor: validated.branding.accentColor }
          : {}),
        ...(validated.branding?.logoUrl?.trim()
          ? { logoUrl: validated.branding.logoUrl.trim() }
          : {}),
        ...(validated.branding?.bannerUrl?.trim()
          ? { bannerUrl: validated.branding.bannerUrl.trim() }
          : {}),
        ...(validated.branding?.adminHeaderBannerUrl != null &&
        String(validated.branding.adminHeaderBannerUrl).trim()
          ? {
              adminHeaderBannerUrl: String(
                validated.branding.adminHeaderBannerUrl,
              ).trim(),
            }
          : {}),
        ...(validated.branding?.publicHeaderBannerUrl != null &&
        String(validated.branding.publicHeaderBannerUrl).trim()
          ? {
              publicHeaderBannerUrl: String(
                validated.branding.publicHeaderBannerUrl,
              ).trim(),
            }
          : {}),
        ...(validated.branding?.partners?.length
          ? { partners: validated.branding.partners }
          : {}),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert
    await db.collection("associations").insertOne(association);


    return NextResponse.json(
      {
        message: "Association created successfully",
        association: {
          associationId: association.associationId,
          code: association.code,
          name: association.name,
          level: association.level,
          levelString: associationLevelSummary(association.level),
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("💥 Error creating association:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to create association";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
