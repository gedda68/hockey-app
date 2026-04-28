// app/api/admin/members/route.ts
// Members API - List and Create

import { NextRequest, NextResponse } from "next/server";
import type { Db } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { escapeRegex } from "@/lib/utils/regex";
import { getSession } from "@/lib/auth/session";
import { requirePermission, requireResourceAccess } from "@/lib/auth/middleware";
import { userCanAccessClubResource } from "@/lib/auth/resourceAccessDb";
import {
  generateTraceId,
  logAdminTelemetry,
  logAdminError,
} from "@/lib/observability/adminTelemetry";

const MEMBERS_PER_PAGE = 20;

// Generate member ID: CHC-0000001
async function generateMemberId(db: Db, clubId: string): Promise<string> {
  const clubsCol = db.collection("clubs");

  // Find the club first to ensure it exists
  const club = await clubsCol.findOne({ id: clubId });
  if (!club) throw new Error("Club not found");

  const shortName = club.shortName || "CLB";

  // Use a more robust update pattern
  const updateRes = await clubsCol.findOneAndUpdate(
    { id: clubId },
    { $inc: { memberSequence: 1 } },
    {
      returnDocument: "after",
      upsert: false,
    },
  );

  const updatedDoc = updateRes?.value;
  const sequence = updatedDoc?.memberSequence;

  if (!updatedDoc || sequence == null) {
    throw new Error("Failed to generate member sequence");
  }

  return `${shortName}-${String(sequence).padStart(7, "0")}`;
}

// Calculate age from date of birth
function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

// GET - List members with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const { user, response: authResponse } = await requirePermission(
      request,
      "member.view",
    );
    if (authResponse) return authResponse;

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Pagination — support both page-based and offset-based
    const limit = parseInt(
      searchParams.get("limit") || MEMBERS_PER_PAGE.toString(),
    );
    const offset = parseInt(searchParams.get("offset") || "0");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = offset > 0 ? offset : (page - 1) * limit;

    // Sorting
    const sortField = searchParams.get("sort") || "lastName";
    const sortDir = searchParams.get("dir") === "desc" ? -1 : 1;
    const SORT_MAP: Record<string, string> = {
      lastName: "personalInfo.lastName",
      firstName: "personalInfo.firstName",
      memberId: "memberId",
      status: "membership.status",
      joinDate: "membership.joinDate",
    };
    const sortKey = SORT_MAP[sortField] ?? "personalInfo.lastName";

    const paramClubId = searchParams.get("clubId");
    const paramAssociationId = searchParams.get("associationId");
    const status = searchParams.get("status");
    const membershipType = searchParams.get("membershipType");
    const role = searchParams.get("role");
    const search = searchParams.get("search");

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const scopeParts: Record<string, unknown>[] = [];

    if (user.role === "super-admin") {
      if (paramClubId) scopeParts.push({ "membership.clubId": paramClubId });
      if (paramAssociationId) {
        scopeParts.push({
          "membership.associationId": paramAssociationId,
        });
      }
    } else if (user.clubId) {
      if (paramClubId && paramClubId !== user.clubId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (paramAssociationId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      scopeParts.push({ "membership.clubId": user.clubId });
    } else if (user.associationId) {
      if (
        paramAssociationId &&
        paramAssociationId !== user.associationId
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (paramClubId) {
        if (!(await userCanAccessClubResource(session, paramClubId))) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        scopeParts.push({ "membership.clubId": paramClubId });
      } else {
        const clubs = await db
          .collection("clubs")
          .find({ parentAssociationId: user.associationId })
          .project({ id: 1 })
          .toArray();
        const clubIds = clubs.map((c) => c.id).filter(Boolean) as string[];
        scopeParts.push({
          $or: [
            { "membership.associationId": user.associationId },
            ...(clubIds.length
              ? [{ "membership.clubId": { $in: clubIds } }]
              : []),
          ],
        });
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const filterParts: Record<string, unknown>[] = [...scopeParts];

    if (status) filterParts.push({ "membership.status": status });
    if (membershipType) {
      filterParts.push({ "membership.membershipType": membershipType });
    }
    if (role) filterParts.push({ roles: role });

    if (search) {
      const safeSearch = escapeRegex(search);
      filterParts.push({
        $or: [
          { memberId: { $regex: safeSearch, $options: "i" } },
          { "personalInfo.firstName": { $regex: safeSearch, $options: "i" } },
          { "personalInfo.lastName": { $regex: safeSearch, $options: "i" } },
          {
            "personalInfo.displayName": {
              $regex: safeSearch,
              $options: "i",
            },
          },
          { "contact.primaryEmail": { $regex: safeSearch, $options: "i" } },
        ],
      });
    }

    const query: Record<string, unknown> =
      filterParts.length === 1 ? filterParts[0]! : { $and: filterParts };

    // Get total count
    const total = await db.collection("members").countDocuments(query);

    // Get members
    const members = await db
      .collection("members")
      .find(query)
      .sort({ [sortKey]: sortDir })
      .skip(skip)
      .limit(limit)
      .toArray();


    return NextResponse.json({
      members,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    logAdminError("admin.member.list.error", "no-trace", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// POST - Create new member
export async function POST(request: NextRequest) {
  const traceId = generateTraceId();
  try {
    const { response: authResponse } = await requirePermission(
      request,
      "member.create",
    );
    if (authResponse) return authResponse;

    const session = await getSession();
    const body = await request.json();

    // Validate required fields
    if (!body.clubId) {
      return NextResponse.json(
        { error: "Club ID is required" },
        { status: 400 },
      );
    }

    if (!body.personalInfo?.firstName || !body.personalInfo?.lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 },
      );
    }

    if (!body.personalInfo?.dateOfBirth) {
      return NextResponse.json(
        { error: "Date of birth is required" },
        { status: 400 },
      );
    }

    if (!body.contact?.email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (
      !body.contact?.emergencyContact?.name ||
      !body.contact?.emergencyContact?.phone
    ) {
      return NextResponse.json(
        { error: "Emergency contact name and phone are required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const { response: scopeResponse } = await requireResourceAccess(
      request,
      "club",
      body.clubId,
    );
    if (scopeResponse) return scopeResponse;

    const clubDoc = await db.collection("clubs").findOne({
      $or: [{ slug: body.clubId }, { id: body.clubId }],
    });
    if (!clubDoc?.id) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const canonicalClubId = clubDoc.id as string;
    const associationId =
      (clubDoc.parentAssociationId as string | undefined) ?? null;

    // Generate member ID
    const memberId = await generateMemberId(db, canonicalClubId);

    // Auto-generate display name if not provided
    const displayName =
      body.personalInfo.displayName ||
      `${body.personalInfo.firstName} ${body.personalInfo.lastName}`;

    // Build member object
    const newMember = {
      memberId,
      clubId: canonicalClubId,
      associationId,

      personalInfo: {
        salutation: body.personalInfo.salutation || null,
        firstName: body.personalInfo.firstName.trim(),
        lastName: body.personalInfo.lastName.trim(),
        displayName: displayName.trim(),
        dateOfBirth: body.personalInfo.dateOfBirth,
        gender: body.personalInfo.gender,
        photoUrl: body.personalInfo.photoUrl || null,
      },

      contact: {
        email: body.contact.email.trim().toLowerCase(),
        phone: body.contact.phone || null,
        mobile: body.contact.mobile || null,
        emergencyContact: {
          name: body.contact.emergencyContact.name.trim(),
          relationship: body.contact.emergencyContact.relationship,
          phone: body.contact.emergencyContact.phone.trim(),
          email: body.contact.emergencyContact.email || null,
        },
      },

      address: {
        street: body.address?.street || "",
        suburb: body.address?.suburb || "",
        state: body.address?.state || "",
        postcode: body.address?.postcode || "",
        country: body.address?.country || "Australia",
      },

      membership: {
        clubId: canonicalClubId,
        associationId,
        joinDate: body.membership?.joinDate || new Date().toISOString(),
        membershipTypes: body.membership?.membershipTypes || [],
        status: body.membership?.status || "Active",
        expiryDate: body.membership?.expiryDate || null,
        renewalDate: body.membership?.renewalDate || null,
      },

      roles: body.roles || [],
      teams: body.teams || [],
      userId: body.userId || null,
      medical: body.medical || null,
      notes: body.notes || null,

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: session?.email || session?.userId || "system",
      updatedBy: null,
    };

    // Insert member
    await db.collection("members").insertOne(newMember);

    logAdminTelemetry("admin.member.create", {
      traceId,
      memberId:      newMember.memberId,
      clubId:        newMember.clubId,
      associationId: newMember.associationId ?? null,
      createdBy:     session?.userId ?? null,
      creatorRole:   session?.role ?? null,
    });

    return NextResponse.json(
      {
        message: "Member created successfully",
        member: newMember,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    logAdminError("admin.member.create.error", traceId, error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
