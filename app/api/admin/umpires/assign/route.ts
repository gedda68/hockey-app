/**
 * POST /api/admin/umpires/assign
 *
 * Assigns an official from the association's register to a fixture slot:
 *
 *  1. Validates the fixture exists and the caller has scope access.
 *  2. Runs a COI + availability check (blocking unless coiOverride=true).
 *  3. Upserts the umpire slot in `league_fixtures.umpires[]`.
 *  4. Creates (or replaces) an `umpire_assignments` document with a fresh
 *     64-char hex response token (valid 14 days).
 *  5. Looks up the official's email address and fires a styled assignment
 *     notification email (fire-and-forget).
 *
 * Request body (JSON):
 *   {
 *     fixtureId:           string  (required)
 *     seasonCompetitionId: string  (required)
 *     umpireId:            string  (required — memberId or umpireNumber)
 *     umpireType:          string  (required — e.g. "Match Umpire 1")
 *     slotIndex?:          number  (0-based; if omitted, slot is appended)
 *     qualificationTier?:  string | null
 *     isStandby?:          boolean (default false)
 *     coiOverride?:        boolean
 *     coiOverrideReason?:  string  (required if coiOverride=true, min 15 chars)
 *     skipCoiCheck?:       boolean (default false)
 *   }
 *
 * Response:
 *   201 { assignmentId, umpireId, slotIndex, allocationStatus: "assigned",
 *          emailSent: boolean }
 *
 * Requires: competitions.manage | competitions.fixtures
 *           + resource access to the fixture's owningAssociationId
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { randomUUID } from "crypto";
import { ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import {
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import {
  PostUmpireAssignBodySchema,
} from "@/lib/db/schemas/umpireAssignment.schema";
import {
  evaluateFixtureUmpireAssignments,
  slotHasValidCoiOverride,
} from "@/lib/officiating/umpireCoiAndAvailability";
import { sendEmail } from "@/lib/email/client";
import { buildUmpireAssignmentEmail } from "@/lib/email/templates/umpireAssignment";

const REGISTER_COL = "association_official_register";
const ASSIGNMENTS_COL = "umpire_assignments";
const FIXTURES_COL = "league_fixtures";

/** 14-day token TTL */
const TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/** Look up email + display name from the register + member docs. */
async function resolveOfficialContact(
  db: Awaited<ReturnType<import("mongodb").MongoClient["db"]>>,
  associationId: string,
  umpireId: string,
): Promise<{ email: string | null; displayName: string }> {
  const reg = await db.collection(REGISTER_COL).findOne({
    associationId,
    isActive: { $ne: false },
    $or: [{ memberId: umpireId }, { umpireNumber: umpireId }],
  });

  const displayName =
    (typeof reg?.displayName === "string" && reg.displayName.trim()) ||
    umpireId;

  const memberId =
    typeof reg?.memberId === "string" && reg.memberId.trim()
      ? reg.memberId.trim()
      : null;

  if (!memberId) return { email: null, displayName };

  const member = (await db
    .collection("members")
    .findOne({ memberId })) as Record<string, unknown> | null;

  if (!member) return { email: null, displayName };

  const contact = member.contact as Record<string, unknown> | undefined;
  for (const v of [
    contact?.primaryEmail,
    contact?.email,
    member.primaryEmail,
  ]) {
    if (typeof v === "string" && v.includes("@")) {
      return { email: v.trim(), displayName };
    }
  }
  return { email: null, displayName };
}

export async function POST(request: NextRequest) {
  const { user, response: authRes } = await requireAnyPermission(request, [
    "competitions.manage",
    "competitions.fixtures",
  ]);
  if (authRes) return authRes;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: import("@/lib/db/schemas/umpireAssignment.schema").PostUmpireAssignBody;
  try {
    body = PostUmpireAssignBodySchema.parse(await request.json());
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: e.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db("hockey-app");

  // ── Load fixture ──────────────────────────────────────────────────────────
  const fixture = await db.collection(FIXTURES_COL).findOne({
    fixtureId: body.fixtureId,
    seasonCompetitionId: body.seasonCompetitionId,
  });
  if (!fixture) {
    return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
  }

  const associationId = String(fixture.owningAssociationId ?? "");

  // ── Scope check ───────────────────────────────────────────────────────────
  const scope = await requireResourceAccess(request, "association", associationId);
  if (scope.response) return scope.response;

  // ── COI check ─────────────────────────────────────────────────────────────
  if (!body.skipCoiCheck) {
    const { slots } = await evaluateFixtureUmpireAssignments(db, {
      associationId,
      homeTeamId: String(fixture.homeTeamId ?? ""),
      awayTeamId: String(fixture.awayTeamId ?? ""),
      proposedUmpires: [
        {
          umpireType: body.umpireType,
          umpireId: body.umpireId,
          isStandby: body.isStandby ?? false,
          coiOverride: body.coiOverride,
          coiOverrideReason: body.coiOverrideReason,
        },
      ],
    });

    const slot = slots[0];
    if (slot && slot.blockingIssues.length > 0) {
      const hasOverride = slotHasValidCoiOverride({
        umpireType: body.umpireType,
        umpireId: body.umpireId,
        coiOverride: body.coiOverride,
        coiOverrideReason: body.coiOverrideReason,
      });
      if (!hasOverride) {
        return NextResponse.json(
          {
            error: "COI or availability block — assign a different official or provide a valid override",
            blockingIssues: slot.blockingIssues,
            warnings: slot.warnings,
          },
          { status: 409 },
        );
      }
    }
  }

  const nowIso = new Date().toISOString();
  const tokenExpiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  const responseToken = randomBytes(32).toString("hex"); // 64 hex chars
  const assignmentId = `ua-${randomUUID()}`;

  // ── Upsert fixture umpires[] slot ─────────────────────────────────────────
  const currentUmpires: Record<string, unknown>[] = Array.isArray(fixture.umpires)
    ? (fixture.umpires as Record<string, unknown>[]).map((u) => ({ ...u }))
    : [];

  const newSlot: Record<string, unknown> = {
    umpireType: body.umpireType,
    umpireId: body.umpireId,
    allocationStatus: "assigned",
    dateAllocated: nowIso,
    dateNotified: null,
    dateAccepted: null,
    dateDeclined: null,
    dateUpdated: nowIso,
    isStandby: body.isStandby ?? false,
    ...(body.qualificationTier != null ? { qualificationTier: body.qualificationTier } : {}),
    ...(body.coiOverride ? { coiOverride: true, coiOverrideReason: body.coiOverrideReason ?? null } : {}),
  };

  let finalSlotIndex: number;
  if (body.slotIndex !== undefined && body.slotIndex < currentUmpires.length) {
    // Update existing slot
    currentUmpires[body.slotIndex] = newSlot;
    finalSlotIndex = body.slotIndex;
  } else {
    // Append
    currentUmpires.push(newSlot);
    finalSlotIndex = currentUmpires.length - 1;
  }

  await db.collection(FIXTURES_COL).updateOne(
    { fixtureId: body.fixtureId, seasonCompetitionId: body.seasonCompetitionId },
    {
      $set: {
        umpires: currentUmpires,
        updatedAt: nowIso,
        updatedBy: user.userId ?? user.email,
      },
    },
  );

  // ── Resolve official display info ─────────────────────────────────────────
  const { email: officialEmail, displayName } = await resolveOfficialContact(
    db,
    associationId,
    body.umpireId,
  );

  // ── Create / replace umpire_assignments document ──────────────────────────
  // Use upsert keyed on (fixtureId, seasonCompetitionId, slotIndex) so
  // re-assigning the same slot replaces the old token.
  const assignmentDoc = {
    assignmentId,
    fixtureId: body.fixtureId,
    seasonCompetitionId: body.seasonCompetitionId,
    associationId,
    slotIndex: finalSlotIndex,
    umpireId: body.umpireId,
    umpireType: body.umpireType,
    qualificationTier: body.qualificationTier ?? null,
    isStandby: body.isStandby ?? false,
    allocationStatus: "assigned",
    dateNotified: null,
    dateAccepted: null,
    dateDeclined: null,
    responseToken,
    tokenExpiresAt,
    coiOverride: body.coiOverride ?? false,
    coiOverrideReason: body.coiOverrideReason ?? null,
    assignedBy: user.userId ?? user.email,
    assignedByName: session.name ?? null,
    round: typeof fixture.round === "number" ? fixture.round : null,
    scheduledStart: (fixture.scheduledStart as string | null | undefined) ?? null,
    venueName: (fixture.venueName as string | null | undefined) ?? null,
    umpireDisplayName: displayName,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await db.collection(ASSIGNMENTS_COL).replaceOne(
    {
      fixtureId: body.fixtureId,
      seasonCompetitionId: body.seasonCompetitionId,
      slotIndex: finalSlotIndex,
    },
    assignmentDoc,
    { upsert: true },
  );

  // ── Update the fixture slot with dateNotified once email is confirmed ─────
  // Fire-and-forget email; update dateNotified on the slot and assignment doc.
  let emailSent = false;
  if (officialEmail) {
    try {
      const emailPayload = buildUmpireAssignmentEmail({
        umpireName: displayName,
        umpireType: body.umpireType,
        round: typeof fixture.round === "number" ? fixture.round : "?",
        scheduledStart: (fixture.scheduledStart as string | null | undefined) ?? null,
        venueName: (fixture.venueName as string | null | undefined) ?? null,
        seasonCompetitionId: body.seasonCompetitionId,
        responseToken,
        tokenExpiresAt,
      });

      const result = await sendEmail({
        to: officialEmail,
        subject: emailPayload.subject,
        html: emailPayload.html,
        text: emailPayload.text,
      });

      if (result.success) {
        emailSent = true;
        const sentAt = new Date().toISOString();

        // Stamp dateNotified on both the assignment doc and the fixture slot
        await db.collection(ASSIGNMENTS_COL).updateOne(
          { assignmentId },
          { $set: { dateNotified: sentAt, updatedAt: sentAt } },
        );

        const slotPath = `umpires.${finalSlotIndex}.dateNotified`;
        await db.collection(FIXTURES_COL).updateOne(
          { fixtureId: body.fixtureId, seasonCompetitionId: body.seasonCompetitionId },
          { $set: { [slotPath]: sentAt, updatedAt: sentAt } },
        );
      }
    } catch (err: unknown) {
      console.error("[umpire/assign] email send error:", err);
    }
  }

  return NextResponse.json(
    {
      assignmentId,
      fixtureId: body.fixtureId,
      seasonCompetitionId: body.seasonCompetitionId,
      slotIndex: finalSlotIndex,
      umpireId: body.umpireId,
      allocationStatus: "assigned",
      emailSent,
      officialEmail: officialEmail ?? null,
    },
    { status: 201 },
  );
}
