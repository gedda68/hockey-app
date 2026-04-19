// PATCH/DELETE — O3 volunteer duty lead (CRM).

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import {
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { AdminVolunteerDutyLeadPatchSchema } from "@/lib/db/schemas/volunteerDutyRoster.schema";
import { resolveClubByIdOrSlug } from "@/lib/volunteerDuty/resolveClub";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";

const WRITE_PERMS = ["club.edit", "club.members"] as const;

type Params = { params: Promise<{ id: string; leadId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, response } = await requireAnyPermission(request, [...WRITE_PERMS]);
  if (response) return response;

  try {
    const { id, leadId } = await params;
    const lid = leadId.trim();
    if (!lid) {
      return NextResponse.json({ error: "leadId required" }, { status: 400 });
    }

    const scope = await requireResourceAccess(request, "club", id);
    if (scope.response) return scope.response;

    const patch = AdminVolunteerDutyLeadPatchSchema.parse(await request.json());
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");
    const club = await resolveClubByIdOrSlug(db, id);
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const existing = await db.collection("club_volunteer_duty_leads").findOne({
      leadId: lid,
      clubId: club.clubId,
    });
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const $set: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
      updatedBy: user.userId,
    };
    if (patch.displayName !== undefined) $set.displayName = patch.displayName;
    if (patch.email !== undefined) $set.email = patch.email.toLowerCase();
    if (patch.phone !== undefined) {
      $set.phone =
        patch.phone === null || patch.phone === ""
          ? null
          : String(patch.phone).trim();
    }
    if (patch.memberId !== undefined) {
      $set.memberId = patch.memberId?.trim() || null;
    }
    if (patch.dutyKinds !== undefined) $set.dutyKinds = patch.dutyKinds;
    if (patch.notes !== undefined) {
      $set.notes = patch.notes === "" || patch.notes === null ? null : patch.notes;
    }
    if (patch.status !== undefined) $set.status = patch.status;
    if (patch.message !== undefined) {
      $set.message =
        patch.message === "" || patch.message === null ? null : patch.message;
    }

    await db.collection("club_volunteer_duty_leads").updateOne(
      { leadId: lid, clubId: club.clubId },
      { $set },
    );

    const after = await db.collection("club_volunteer_duty_leads").findOne({
      leadId: lid,
      clubId: club.clubId,
    });
    const stripId = (doc: Record<string, unknown>) => {
      const rest = { ...doc };
      delete rest._id;
      return rest;
    };
    const beforeRest = stripId(existing as Record<string, unknown>);
    const afterRest = after ? stripId(after as Record<string, unknown>) : {};

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "volunteer_duty_roster",
      action: "patch_lead",
      resourceType: "club",
      resourceId: club.clubId,
      summary: `Volunteer duty lead updated (${lid})`,
      before: beforeRest,
      after: afterRest,
    });

    return NextResponse.json({ lead: afterRest });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: e.flatten() },
        { status: 400 },
      );
    }
    console.error("PATCH volunteer-duty-roster lead error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { user, response } = await requireAnyPermission(request, [...WRITE_PERMS]);
  if (response) return response;

  try {
    const { id, leadId } = await params;
    const lid = leadId.trim();
    if (!lid) {
      return NextResponse.json({ error: "leadId required" }, { status: 400 });
    }

    const scope = await requireResourceAccess(request, "club", id);
    if (scope.response) return scope.response;

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");
    const club = await resolveClubByIdOrSlug(db, id);
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const existing = await db.collection("club_volunteer_duty_leads").findOne({
      leadId: lid,
      clubId: club.clubId,
    });
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    await db.collection("club_volunteer_duty_leads").deleteOne({
      leadId: lid,
      clubId: club.clubId,
    });

    const beforeRest = (() => {
      const { _id, ...r } = existing as Record<string, unknown>;
      return r;
    })();
    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "volunteer_duty_roster",
      action: "delete_lead",
      resourceType: "club",
      resourceId: club.clubId,
      summary: `Volunteer duty lead deleted (${lid})`,
      before: beforeRest,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE volunteer-duty-roster lead error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
