// GET/PATCH /api/admin/associations/[associationId]/communications
// Epic O2 — per-association communication hub (digest prefs + fixture email supplement + push topics).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import {
  getCommunicationHubSettingsForAssociation,
  mergeCommunicationHubSettings,
  PatchCommunicationHubSettingsSchema,
} from "@/lib/communications/communicationHubSettings";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";
import {
  adminTelemetryFromRequestLike,
  logAdminTelemetry,
} from "@/lib/observability/adminTelemetry";
import { ZodError } from "zod";
import { stripAllTags } from "@/lib/utils/sanitizeServer";

/** Covers super-admin, association-admin, assoc-committee, assoc-competition, media-marketing (see `ROLE_DEFINITIONS`). */
const PERMS = [
  "system.manage",
  "association.settings",
  "competitions.fixtures",
  "association.edit",
] as const;

type Params = { params: Promise<{ associationId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { response } = await requireAnyPermission(request, [...PERMS]);
  if (response) return response;

  try {
    const { associationId } = await params;
    const id = associationId.trim();
    if (!id) {
      return NextResponse.json({ error: "associationId required" }, { status: 400 });
    }

    const scope = await requireResourceAccess(request, "association", id);
    if (scope.response) return scope.response;

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");
    const settings = await getCommunicationHubSettingsForAssociation(db, id);
    return NextResponse.json({ settings });
  } catch (e: unknown) {
    console.error("GET communications hub error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, response } = await requireAnyPermission(request, [...PERMS]);
  if (response) return response;

  try {
    const { associationId } = await params;
    const id = associationId.trim();
    if (!id) {
      return NextResponse.json({ error: "associationId required" }, { status: 400 });
    }

    const scope = await requireResourceAccess(request, "association", id);
    if (scope.response) return scope.response;

    const body = PatchCommunicationHubSettingsSchema.parse(await request.json());

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const existing = await db.collection("communication_hub_settings").findOne({
      scopeType: "association",
      scopeId: id,
    });

    const now = new Date();
    const $set: Record<string, unknown> = {
      scopeType: "association",
      scopeId: id,
      updatedAt: now,
      updatedBy: user.userId,
    };
    // Strip all HTML tags from plain-text email supplement fields (S7)
    if (body.fixtureChangeEmailSupplementText !== undefined) {
      $set.fixtureChangeEmailSupplementText = stripAllTags(body.fixtureChangeEmailSupplementText);
    }
    if (body.weeklyDigestEnabled !== undefined) {
      $set.weeklyDigestEnabled = body.weeklyDigestEnabled;
    }
    if (body.weeklyDigestIntroText !== undefined) {
      $set.weeklyDigestIntroText = stripAllTags(body.weeklyDigestIntroText);
    }
    if (body.enabledPushTopics !== undefined) {
      $set.enabledPushTopics = body.enabledPushTopics;
    }

    await db.collection("communication_hub_settings").updateOne(
      { scopeType: "association", scopeId: id },
      { $set },
      { upsert: true },
    );

    const row = await db.collection("communication_hub_settings").findOne({
      scopeType: "association",
      scopeId: id,
    });
    const settings = mergeCommunicationHubSettings(row as Record<string, unknown> | null);

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "communication_hub",
      action: "patch",
      resourceType: "association",
      resourceId: id,
      summary: "Updated communication hub settings",
      before: existing ? mergeCommunicationHubSettings(existing as Record<string, unknown>) : null,
      after: settings,
    });

    logAdminTelemetry("admin.communication_hub.patch", {
      ...adminTelemetryFromRequestLike({
        hostHeader: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
        pathname: new URL(request.url).pathname,
        method: request.method,
      }),
      userId: user.userId,
      role: user.role,
      associationId: id,
      clubId: user.clubId ?? null,
      fields: Object.keys(body).join(","),
    });

    return NextResponse.json({ settings });
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: e.flatten() },
        { status: 400 },
      );
    }
    console.error("PATCH communications hub error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
