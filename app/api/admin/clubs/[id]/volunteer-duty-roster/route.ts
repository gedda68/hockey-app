// GET/POST — O3 club volunteer duty roster (CRM list + manual lead).

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import {
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { AdminVolunteerDutyLeadCreateSchema } from "@/lib/db/schemas/volunteerDutyRoster.schema";
import { resolveClubByIdOrSlug } from "@/lib/volunteerDuty/resolveClub";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";

/** Roster can include personal contact details — limit to people who manage members/club settings. */
const READ_PERMS = ["club.edit", "club.members"] as const;
const WRITE_PERMS = ["club.edit", "club.members"] as const;

type Params = { params: Promise<{ id: string }> };

function stripDoc(doc: Record<string, unknown>) {
  const { _id, ...rest } = doc;
  return rest;
}

export async function GET(request: NextRequest, { params }: Params) {
  const { response } = await requireAnyPermission(request, [...READ_PERMS]);
  if (response) return response;

  try {
    const { id } = await params;
    const scope = await requireResourceAccess(request, "club", id);
    if (scope.response) return scope.response;

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");
    const club = await resolveClubByIdOrSlug(db, id);
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const rows = await db
      .collection("club_volunteer_duty_leads")
      .find({ clubId: club.clubId })
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    return NextResponse.json({
      club: { id: club.clubId, slug: club.clubSlug, name: club.name },
      leads: rows.map((r) => stripDoc(r as Record<string, unknown>)),
    });
  } catch (e) {
    console.error("GET volunteer-duty-roster error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response } = await requireAnyPermission(request, [...WRITE_PERMS]);
  if (response) return response;

  try {
    const { id } = await params;
    const scope = await requireResourceAccess(request, "club", id);
    if (scope.response) return scope.response;

    const body = AdminVolunteerDutyLeadCreateSchema.parse(await request.json());

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");
    const club = await resolveClubByIdOrSlug(db, id);
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const leadId = randomUUID();
    const phone =
      body.phone === undefined || body.phone === null
        ? null
        : String(body.phone).trim() || null;

    const doc = {
      leadId,
      clubId: club.clubId,
      clubSlug: club.clubSlug,
      displayName: body.displayName,
      email: body.email.toLowerCase(),
      phone,
      memberId: body.memberId?.trim() || null,
      dutyKinds: body.dutyKinds,
      message: body.message?.trim() || null,
      notes: body.notes?.trim() || null,
      status: body.status ?? "lead",
      source: "admin" as const,
      createdAt: now,
      updatedAt: now,
      createdBy: user.userId,
      updatedBy: user.userId,
    };

    await db.collection("club_volunteer_duty_leads").insertOne(doc);

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "volunteer_duty_roster",
      action: "create_lead",
      resourceType: "club",
      resourceId: club.clubId,
      summary: `Volunteer duty lead created (${doc.displayName})`,
      after: doc,
    });

    return NextResponse.json({ lead: doc }, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: e.flatten() },
        { status: 400 },
      );
    }
    console.error("POST volunteer-duty-roster error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
