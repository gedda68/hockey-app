// app/api/admin/clubs/route.ts
// Clubs API with hierarchical filtering + change logging + clubId mapping

import { NextRequest, NextResponse } from "next/server";
import type { Db } from "mongodb";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { getSession } from "@/lib/auth/session";
import { getClubListScope } from "@/lib/auth/clubListScope";
import { generateSlug } from "@/lib/utils/slug";
import { escapeRegex } from "@/lib/utils/regex";
import type { ClubDoc } from "@/types/api";

type AssocKeyRow = {
  associationId?: string;
  portalSlug?: string;
  code?: string;
  acronym?: string;
};

async function resolveAssociationKeysToIds(
  db: Db,
  keys: string[],
): Promise<Record<string, string>> {
  const cleaned = [...new Set(keys.map((k) => String(k ?? "").trim()).filter(Boolean))];
  if (cleaned.length === 0) return {};

  // Future-proofing: we treat `associationId` (canonical) and `portalSlug` as valid identifiers.
  // `code` / `acronym` are display fields and may collide across associations (e.g. multiple "BHA").
  // For backwards-compat only, we map `code` / `acronym` keys *only when they uniquely resolve*.
  const primaryRows = (await db
    .collection("associations")
    .find({
      $or: [{ associationId: { $in: cleaned } }, { portalSlug: { $in: cleaned } }],
    })
    .project({ associationId: 1, portalSlug: 1 })
    .limit(400)
    .toArray()) as AssocKeyRow[];

  const map: Record<string, string> = {};
  for (const r of primaryRows) {
    const id = String(r.associationId ?? "").trim();
    if (!id) continue;
    const keysForRow = [r.associationId, r.portalSlug]
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean);
    for (const k of keysForRow) {
      map[k] = id;
    }
  }

  const unresolved = cleaned.filter((k) => !map[k]);
  if (unresolved.length > 0) {
    const legacyRows = (await db
      .collection("associations")
      .find({ $or: [{ code: { $in: unresolved } }, { acronym: { $in: unresolved } }] })
      .project({ associationId: 1, code: 1, acronym: 1 })
      .limit(400)
      .toArray()) as AssocKeyRow[];

    const bucket: Record<string, string[]> = {};
    for (const r of legacyRows) {
      const id = String(r.associationId ?? "").trim();
      if (!id) continue;
      for (const k of [r.code, r.acronym]) {
        const kk = typeof k === "string" ? k.trim() : "";
        if (!kk) continue;
        (bucket[kk] ||= []).push(id);
      }
    }

    for (const key of unresolved) {
      const candidates = bucket[key] ?? [];
      if (candidates.length === 1) {
        map[key] = candidates[0];
      }
    }
  }

  return map;
}

async function requireCanonicalAssociationId(db: Db, raw: unknown): Promise<string> {
  const key = typeof raw === "string" ? raw.trim() : "";
  if (!key) throw new Error("parentAssociationId is required");

  const assocMap = await resolveAssociationKeysToIds(db, [key]);
  const canonical = assocMap[key] ?? "";
  if (!canonical) throw new Error("Invalid parentAssociationId (association not found)");
  return canonical;
}

// --- HELPER: LOG CHANGES ---
async function logClubChange(
  db: Db,
  clubId: string,
  clubName: string,
  changeType: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>,
  reason?: string,
  userId?: string,
  userName?: string,
) {
  try {
    const changeLog = {
      id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      clubId,
      clubName,
      changeType,
      timestamp: new Date().toISOString(),
      userId: userId || "system",
      userName: userName || "System Admin",
      oldValues,
      newValues,
      changes:
        oldValues && newValues
          ? getChangedFields(oldValues, newValues)
          : undefined,
      reason,
    };

    await db.collection("club_change_logs").insertOne(changeLog);
  } catch (error) {
    console.error("❌ Failed to log change:", error);
  }
}

interface FieldChange {
  field: string;
  displayName: string;
  oldValue: unknown;
  newValue: unknown;
}

// --- HELPER: DETECT CHANGES ---
function getChangedFields(oldValues: Record<string, unknown>, newValues: Record<string, unknown>) {
  const changes: FieldChange[] = [];
  const compareFields = [
    { key: "name", display: "Club Name" },
    { key: "shortName", display: "Short Name" },
    { key: "active", display: "Active Status" },
    { key: "logo", display: "Logo" },
    { key: "established", display: "Established" },
    { key: "homeGround", display: "Home Ground" },
    { key: "description", display: "Description" },
    { key: "parentAssociationId", display: "Association" },
  ];

  compareFields.forEach(({ key, display }) => {
    if (oldValues[key] !== newValues[key]) {
      changes.push({
        field: key,
        displayName: display,
        oldValue: oldValues[key],
        newValue: newValues[key],
      });
    }
  });

  const nestedFields = ["colors", "address", "contact"];
  nestedFields.forEach((field) => {
    if (JSON.stringify(oldValues[field]) !== JSON.stringify(newValues[field])) {
      changes.push({
        field,
        displayName: field.charAt(0).toUpperCase() + field.slice(1),
        oldValue: oldValues[field],
        newValue: newValues[field],
      });
    }
  });

  return changes;
}

// Region mappings for geolocation (backwards compatibility)
const REGION_MAPPINGS: Record<string, string[]> = {
  "Brisbane North": [
    "Chermside",
    "Aspley",
    "Albany Creek",
    "Strathpine",
    "Petrie",
  ],
  "Brisbane South": ["Sunnybank", "Calamvale", "Stretton", "Kuraby"],
  "Brisbane East": ["Cannon Hill", "Morningside", "Bulimba", "Camp Hill"],
  "Brisbane West": ["Toowong", "Indooroopilly", "Kenmore", "Chapel Hill"],
  "Brisbane Central": [
    "Brisbane CBD",
    "South Brisbane",
    "West End",
    "Fortitude Valley",
  ],
  "Gold Coast": ["Southport", "Surfers Paradise", "Burleigh Heads", "Robina"],
  "Sunshine Coast": ["Maroochydore", "Caloundra", "Noosa", "Nambour"],
  Ipswich: ["Ipswich", "Springfield", "Redbank"],
  Logan: ["Logan Central", "Springwood", "Underwood"],
};

function getRegionFromSuburb(suburb: string): string | null {
  const normalizedSuburb = suburb.trim();

  for (const [region, suburbs] of Object.entries(REGION_MAPPINGS)) {
    if (
      suburbs.some((s) => s.toLowerCase() === normalizedSuburb.toLowerCase())
    ) {
      return region;
    }
  }

  return null;
}

// --- GET: FETCH CLUBS WITH FILTERING ---
export async function GET(request: NextRequest) {
  try {
    const { response: authRes } = await requirePermission(request, "club.view");
    if (authRes) return authRes;

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 });
    }

    const listScope = getClubListScope(session);

    const { searchParams } = new URL(request.url);

    // Filters
    const associationId = searchParams.get("associationId"); // Filter by association (for hierarchy)
    const parentAssociationId = searchParams.get("parentAssociationId"); // Alternative name
    const region = searchParams.get("region"); // Suburb for geolocation (backwards compat)
    const state = searchParams.get("state");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const idsParam = searchParams.get("ids"); // Comma-separated club IDs for batch colour fetch
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = (page - 1) * limit;

    const assocFilter = associationId || parentAssociationId;
    if (assocFilter) {
      const { response: scopeRes } = await requireResourceAccess(
        request,
        "association",
        assocFilter,
      );
      if (scopeRes) return scopeRes;
    }

    const client = await clientPromise;
    const db = client.db();

    // Build query
    const query: Record<string, unknown> = {};

    if (listScope.kind === "none") {
      return NextResponse.json({
        clubs: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    const paramAssoc = associationId || parentAssociationId;
    if (paramAssoc) {
      const assocMap = await resolveAssociationKeysToIds(db, [paramAssoc]);
      query.parentAssociationId = assocMap[paramAssoc] ?? paramAssoc;
    } else if (listScope.kind === "associations") {
      const assocMap = await resolveAssociationKeysToIds(db, listScope.associationIds);
      const resolved = listScope.associationIds.map((k) => assocMap[k] ?? k);
      query.parentAssociationId =
        resolved.length === 1 ? resolved[0] : { $in: resolved };
    } else if (listScope.kind === "clubs" && !idsParam) {
      query.$or = [
        { id: { $in: listScope.clubRefs } },
        { slug: { $in: listScope.clubRefs } },
      ];
    }

    // Batch fetch by IDs (e.g. for colour map population)
    if (idsParam) {
      const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (ids.length > 0) {
        if (listScope.kind === "clubs") {
          query.$and = [
            {
              $or: [
                { id: { $in: listScope.clubRefs } },
                { slug: { $in: listScope.clubRefs } },
              ],
            },
            { $or: [{ id: { $in: ids } }, { clubId: { $in: ids } }] },
          ];
          delete query.$or;
        } else {
          query.$or = [{ id: { $in: ids } }, { clubId: { $in: ids } }];
        }
      }
    }

    // Filter by region (geolocation - backwards compatibility)
    if (region && !associationId && !parentAssociationId) {
      const matchedRegion = getRegionFromSuburb(region);
      if (matchedRegion) {
        query.region = matchedRegion;
      } else {
        // If no mapping found, search in club name or general area
        const safeRegion = escapeRegex(region);
        query.$or = [
          { region: { $regex: safeRegion, $options: "i" } },
          { name: { $regex: safeRegion, $options: "i" } },
        ];
      }
    }

    if (state) {
      query.state = state;
    }

    if (status) {
      query.active = status === "active";
    } else {
      // Default to active clubs only
      query.active = true;
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { shortName: { $regex: safeSearch, $options: "i" } },
        { id: { $regex: safeSearch, $options: "i" } },
      ];
    }


    // Get total count
    const total = await db.collection("clubs").countDocuments(query);

    // Get clubs
    const clubs = await db
      .collection("clubs")
      .find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();


    // **NEW: Map 'id' to 'clubId' for teams modal compatibility**
    const mappedClubs = (clubs as ClubDoc[]).map((club) => ({
      ...club,
      clubId: club.id, // Add clubId field mapped from id
    }));

    // For simple list (used by wizard + teams modal)
    if (searchParams.get("simple") === "true") {
      const simple = mappedClubs.map((c) => ({
        id: c.id,
        clubId: c.id, // Include clubId for teams modal
        name: c.name,
        shortName: c.shortName,
        associationId: c.parentAssociationId,
        colors: c.colors,
        logo: c.logo,
      }));

      return NextResponse.json({
        clubs: simple,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // Full club data (with clubId mapped)
    return NextResponse.json({
      clubs: mappedClubs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error("💥 Error fetching clubs:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// --- POST: CREATE CLUB ---
export async function POST(request: NextRequest) {
  try {
    const { response: authRes } = await requirePermission(request, "club.create");
    if (authRes) return authRes;

    const body = await request.json();

    if (!body.name || !body.id) {
      return NextResponse.json(
        { error: "Name and ID are required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const canonicalParentAssociationId = await requireCanonicalAssociationId(
      db,
      body.parentAssociationId ?? body.associationId ?? body.association,
    );
    const { response: scopeRes } = await requireResourceAccess(
      request,
      "association",
      canonicalParentAssociationId,
    );
    if (scopeRes) return scopeRes;

    const existing = await db.collection("clubs").findOne({ id: body.id });

    if (existing) {
      return NextResponse.json(
        { error: "Club already exists" },
        { status: 400 },
      );
    }

    const clubData = {
      ...body,
      parentAssociationId: canonicalParentAssociationId,
      slug: body.slug || generateSlug(body.name),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      active: body.active !== undefined ? body.active : true,
      memberSequence: body.memberSequence || 0, // Initialize member sequence
    };
    delete (clubData as any).associationId;
    delete (clubData as any).association;

    await db.collection("clubs").insertOne(clubData);

    await logClubChange(
      db,
      body.id,
      body.name,
      "created",
      undefined,
      clubData,
      "Initial Creation",
      body.userId,
      body.userName,
    );


    return NextResponse.json(
      { message: "Club created", club: clubData },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("💥 Error creating club:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// --- PUT: UPDATE CLUB ---
export async function PUT(request: NextRequest) {
  try {
    const { response: authRes } = await requirePermission(request, "club.edit");
    if (authRes) return authRes;

    const body = await request.json();
    const { id, userId, userName, reason } = body;

    if (!id) {
      return NextResponse.json({ error: "Club ID required" }, { status: 400 });
    }

    const { response: scopeRes } = await requireResourceAccess(
      request,
      "club",
      id,
    );
    if (scopeRes) return scopeRes;

    const client = await clientPromise;
    const db = client.db();

    const oldData = await db.collection("clubs").findOne({ id });

    if (!oldData) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const newData = {
      ...oldData,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    // Cleanup internal MongoDB _id if present in body
    delete (newData as any)._id;
    delete (newData as any).associationId;
    delete (newData as any).association;

    const incomingParent =
      body.parentAssociationId ?? body.associationId ?? body.association;
    if (incomingParent !== undefined) {
      const canonicalParentAssociationId = await requireCanonicalAssociationId(
        db,
        incomingParent,
      );
      const { response: scopeRes } = await requireResourceAccess(
        request,
        "association",
        canonicalParentAssociationId,
      );
      if (scopeRes) return scopeRes;
      (newData as any).parentAssociationId = canonicalParentAssociationId;
    }

    // Deep-merge branding so partial updates (e.g. admin header banner only) do not wipe other keys
    const bodyBranding = (body as { branding?: Record<string, unknown> }).branding;
    if (bodyBranding && typeof bodyBranding === "object") {
      const oldDoc = oldData as unknown as Record<string, unknown>;
      const prevBrand = oldDoc.branding;
      const oldBranding =
        prevBrand && typeof prevBrand === "object" && !Array.isArray(prevBrand)
          ? { ...(prevBrand as Record<string, unknown>) }
          : {};
      (newData as Record<string, unknown>).branding = {
        ...oldBranding,
        ...bodyBranding,
      };
    }

    await db.collection("clubs").updateOne({ id }, { $set: newData });

    await logClubChange(
      db,
      id,
      oldData.name,
      "updated",
      oldData,
      newData,
      reason || "Club details updated",
      userId,
      userName,
    );


    return NextResponse.json({ message: "Club updated", club: newData });
  } catch (error: unknown) {
    console.error("💥 Error updating club:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// --- DELETE: REMOVE CLUB ---
export async function DELETE(request: NextRequest) {
  try {
    const { response: authRes } = await requirePermission(request, "club.delete");
    if (authRes) return authRes;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");
    const userName = searchParams.get("userName");
    const mode = searchParams.get("mode"); // "archive" | undefined

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const { response: scopeRes } = await requireResourceAccess(
      request,
      "club",
      id,
    );
    if (scopeRes) return scopeRes;

    const client = await clientPromise;
    const db = client.db();

    const club = await db.collection("clubs").findOne({ id });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Prevent orphaned teams/members/registrations/payments.
    // Clubs with history must be archived/disabled rather than hard-deleted.
    const [teamCount, memberCount, clubRegCount, paymentCount] =
      await Promise.all([
        db.collection("teams").countDocuments({ clubId: id }, { limit: 1 }),
        db.collection("members").countDocuments({ clubId: id }, { limit: 1 }),
        db
          .collection("club-registrations")
          .countDocuments({ clubId: id }, { limit: 1 }),
        db.collection("payments").countDocuments({ clubId: id }, { limit: 1 }),
      ]);

    if (teamCount || memberCount || clubRegCount || paymentCount) {
      // If club is referenced, only archival is allowed.
      if (mode === "archive") {
        const archivedAt = new Date().toISOString();
        await db.collection("clubs").updateOne(
          { id },
          {
            $set: {
              active: false,
              archivedAt,
              updatedAt: archivedAt,
            },
          },
        );

        await logClubChange(
          db,
          id,
          club.name,
          "updated",
          club,
          { ...club, active: false, archivedAt, updatedAt: archivedAt },
          "Club archived (disabled)",
          userId || "system",
          userName || "Admin",
        );

        return NextResponse.json({ message: "Club archived successfully" });
      }

      return NextResponse.json(
        {
          error: "Club cannot be deleted because it is referenced",
          details: {
            teams: teamCount,
            members: memberCount,
            clubRegistrations: clubRegCount,
            payments: paymentCount,
          },
          hint: 'Use `mode=archive` to disable instead of deleting.',
        },
        { status: 409 }
      );
    }

    await db.collection("clubs").deleteOne({ id });

    await logClubChange(
      db,
      id,
      club.name,
      "deleted",
      club,
      undefined,
      "Club archived/removed",
      userId || "system",
      userName || "Admin",
    );


    return NextResponse.json({ message: "Club deleted successfully" });
  } catch (error: unknown) {
    console.error("💥 Error deleting club:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
