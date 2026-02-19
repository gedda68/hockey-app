// app/api/admin/associations/route.ts
// Associations API with hierarchical filtering + comprehensive validation

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { z } from "zod";

// Schema for creating/updating associations
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
  fees: z.array(z.any()).default([]),

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

// 5-level system: 1=National, 2=Sub-national, 3=State, 4=Regional, 5=City
const LEVEL_NAMES: Record<number, string> = {
  1: "National",
  2: "Sub-national",
  3: "State",
  4: "Regional",
  5: "City",
};

// Helper: Calculate hierarchy from parent
async function calculateHierarchy(
  db: any,
  parentAssociationId?: string,
  explicitLevel?: number,
): Promise<{ level: number; hierarchy: string[] }> {
  if (!parentAssociationId) {
    // Root — use explicit level or default to 1 (National)
    return { level: explicitLevel ?? 1, hierarchy: [] };
  }

  const parent = await db
    .collection("associations")
    .findOne({ associationId: parentAssociationId });

  if (!parent) {
    throw new Error("Parent association not found");
  }

  // Use explicit level if provided, otherwise derive from parent
  const level = explicitLevel ?? Math.min(parent.level + 1, 5);

  return {
    level,
    hierarchy: [...(parent.hierarchy || []), parent.associationId],
  };
}

// Helper: Map numeric level to string label
function getLevelString(numericLevel: number): string {
  return LEVEL_NAMES[numericLevel] || `Level ${numericLevel}`;
}

// GET /api/admin/associations - List associations with hierarchical filtering
export async function GET(request: NextRequest) {
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
    const query: any = {};

    if (status) {
      query.status = status;
    } else {
      // Default to active only
      query.status = "active";
    }

    // Handle level filtering — support numeric (1-5) or string name
    if (level) {
      const numericLevel = parseInt(level);
      if (!isNaN(numericLevel)) {
        query.level = numericLevel;
      } else {
        // String name → find matching level number
        const found = Object.entries(LEVEL_NAMES).find(
          ([, name]) => name.toLowerCase() === level.toLowerCase(),
        );
        if (found) query.level = parseInt(found[0]);
      }
    }

    // Support both 'parentId' and 'parentAssociationId' for backwards compatibility
    if (parentId) {
      query.parentAssociationId = parentId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
      ];
    }

    console.log("🏛️ GET associations - Query:", JSON.stringify(query, null, 2));

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

    console.log(
      `✅ Found ${associations.length} associations (${total} total)`,
    );

    // For simple list (used by wizard), return minimal data
    if (searchParams.get("simple") === "true") {
      const simple = associations.map((a) => ({
        id: a.associationId,
        name: a.name,
        level: getLevelString(a.level),
        parentId: a.parentAssociationId,
      }));

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
          levelString: getLevelString(assoc.level),
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
  } catch (error: any) {
    console.error("💥 Error fetching associations:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch associations" },
      { status: 500 },
    );
  }
}

// POST /api/admin/associations - Create new association
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate with Zod (level and hierarchy are optional - auto-calculated)
    const validated = AssociationSchema.parse(body);

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

    // AUTO-CALCULATE level and hierarchy (pass explicit level if provided)
    const { level, hierarchy } = await calculateHierarchy(
      db,
      validated.parentAssociationId,
      (validated as any).level,
    );

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
        requiresInsurance: validated.settings?.requiresInsurance ?? true,
        requiresMedicalInfo: validated.settings?.requiresMedicalInfo ?? true,
        requiresEmergencyContact:
          validated.settings?.requiresEmergencyContact ?? true,
      },
      branding: {
        primaryColor: validated.branding?.primaryColor || "#06054e",
        secondaryColor: validated.branding?.secondaryColor || "#FFD700",
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert
    await db.collection("associations").insertOne(association);

    console.log(`✅ Created association: ${association.name} (Level ${level})`);

    return NextResponse.json(
      {
        message: "Association created successfully",
        association: {
          associationId: association.associationId,
          code: association.code,
          name: association.name,
          level: association.level,
          levelString: getLevelString(association.level),
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("💥 Error creating association:", error);

    // Handle Zod validation errors
    if (error.name === "ZodError") {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create association" },
      { status: 500 },
    );
  }
}
