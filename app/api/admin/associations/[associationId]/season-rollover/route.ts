/**
 * POST /api/admin/associations/[associationId]/season-rollover
 *
 * W5 — Automated season rollover (admin-confirmed).
 *
 * At (or just after) season start, associations need two things:
 *  1) Deactivate last season's seasonal role assignments (members.roles[] entries with expiresAt/seasonYear)
 *  2) Create renewal role_requests for the new season (so approvals + fee collection are queued)
 *
 * This endpoint is designed to be safe:
 * - Requires registration.manage + association scope access
 * - Supports dryRun mode (no writes)
 * - Dedupes in-flight renewals (won't create duplicates)
 */

import { NextRequest, NextResponse } from "next/server";
import type { Db } from "mongodb";
import { v4 as uuidv4 } from "uuid";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { requirePermission, requireResourceAccess } from "@/lib/auth/middleware";
import { ROLE_DEFINITIONS, type RoleAssignment, type ScopeType, type UserRole } from "@/lib/types/roles";
import { currentSeasonYearFor } from "@/lib/cron/seasonHelpers";
import { resolveFeeWithFallback, buildFeeDescription } from "@/lib/fees/feeSchedule";
import { calculateGST } from "@/lib/fees/gst";
import type { FeeScheduleEntry } from "@/types/feeSchedule";

type Body = {
  dryRun?: boolean;
  /** Override inferred years (strings like "2025"). */
  fromSeasonYear?: string;
  toSeasonYear?: string;
  /** Cap processing to first N members for safety/testing. */
  limitMembers?: number;
};

type Summary = {
  associationId: string;
  seasonStartMonth: number;
  fromSeasonYear: string;
  toSeasonYear: string;
  dryRun: boolean;
  deactivatedAssignments: number;
  createdRoleRequests: number;
  skippedExistingRoleRequests: number;
  errors: Array<{ memberId: string; message: string }>;
};

function seasonalRoles(): UserRole[] {
  return Object.entries(ROLE_DEFINITIONS)
    .filter(([, def]) => def.seasonalRegistration)
    .map(([role]) => role as UserRole);
}

function endOfSeasonExpiresAt(seasonYear: string): string {
  return `${seasonYear}-12-31T23:59:59.000Z`;
}

async function resolveAssociationScopeClubIds(db: Db, associationId: string): Promise<string[]> {
  const clubs = await db
    .collection("clubs")
    .find({ parentAssociationId: associationId }, { projection: { id: 1 } })
    .toArray();
  return clubs.map((c) => String((c as any).id ?? "")).filter(Boolean);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ associationId: string }> }) {
  const { response: permRes } = await requirePermission(request, "registration.manage");
  if (permRes) return permRes;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { associationId } = await ctx.params;
  const scope = await requireResourceAccess(request, "association", associationId);
  if (scope.response) return scope.response;

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const dryRun = body.dryRun === true;

  const client = await clientPromise;
  const db = client.db();

  const assoc = await db.collection("associations").findOne(
    { associationId },
    { projection: { associationId: 1, name: 1, fullName: 1, settings: 1, feeSchedule: 1 } },
  );
  if (!assoc) return NextResponse.json({ error: "Association not found" }, { status: 404 });

  const seasonStartMonth =
    typeof (assoc as any)?.settings?.seasonStartMonth === "number"
      ? (assoc as any).settings.seasonStartMonth
      : typeof (assoc as any)?.seasonStartMonth === "number"
        ? (assoc as any).seasonStartMonth
        : 1;

  const inferredToSeasonYear = currentSeasonYearFor(seasonStartMonth);
  const inferredFromSeasonYear = (Number(inferredToSeasonYear) - 1).toString();

  const fromSeasonYear = (body.fromSeasonYear?.trim() || inferredFromSeasonYear).trim();
  const toSeasonYear = (body.toSeasonYear?.trim() || inferredToSeasonYear).trim();

  if (!/^\d{4}$/.test(fromSeasonYear) || !/^\d{4}$/.test(toSeasonYear)) {
    return NextResponse.json(
      { error: "fromSeasonYear and toSeasonYear must be YYYY strings" },
      { status: 400 },
    );
  }
  if (Number(toSeasonYear) !== Number(fromSeasonYear) + 1) {
    return NextResponse.json(
      { error: "toSeasonYear must be fromSeasonYear + 1" },
      { status: 400 },
    );
  }

  const allowedClubIds = await resolveAssociationScopeClubIds(db, associationId);
  const allowedScopeIds = new Set<string>([associationId, ...allowedClubIds]);

  const rolesToExpire = seasonalRoles();
  const expiresAt = endOfSeasonExpiresAt(fromSeasonYear);

  const memberQuery: Record<string, unknown> = {
    "roles.role": { $in: rolesToExpire },
    "roles.seasonYear": fromSeasonYear,
    "roles.active": { $ne: false },
    // Narrow to association + its clubs (club scopeId is clubId; association scopeId is associationId)
    "roles.scopeId": { $in: [...allowedScopeIds] },
  };

  const limitMembers =
    typeof body.limitMembers === "number" && Number.isFinite(body.limitMembers) && body.limitMembers > 0
      ? Math.floor(body.limitMembers)
      : null;

  const memberCursor = db
    .collection("members")
    .find(memberQuery, {
      projection: { memberId: 1, personalInfo: 1, roles: 1, clubId: 1 },
    })
    .sort({ memberId: 1 });

  if (limitMembers != null) {
    memberCursor.limit(limitMembers);
  }

  const members = await memberCursor.toArray();

  const assocFeeSchedule: FeeScheduleEntry[] | null = ((assoc as any)?.feeSchedule as any) ?? null;
  const assocName = String((assoc as any)?.fullName ?? (assoc as any)?.name ?? associationId);

  const summary: Summary = {
    associationId,
    seasonStartMonth,
    fromSeasonYear,
    toSeasonYear,
    dryRun,
    deactivatedAssignments: 0,
    createdRoleRequests: 0,
    skippedExistingRoleRequests: 0,
    errors: [],
  };

  // Cache org lookups
  const clubCache = new Map<string, { id: string; name?: string; feeSchedule?: FeeScheduleEntry[] | null; parentAssociationId?: string | null } | null>();

  for (const member of members as any[]) {
    const memberId = String(member.memberId ?? "").trim();
    const memberName = `${member.personalInfo?.firstName ?? ""} ${member.personalInfo?.lastName ?? ""}`.trim() || memberId;
    const roles = (member.roles ?? []) as RoleAssignment[];

    // 1) Deactivate last season assignments (in-memory, then write whole roles array)
    let rolesChanged = false;
    const updatedRoles = roles.map((r) => {
      const role = r.role as UserRole;
      if (!ROLE_DEFINITIONS[role]?.seasonalRegistration) return r;
      if (r.seasonYear !== fromSeasonYear) return r;
      const sid = r.scopeId ? String(r.scopeId) : "";
      if (sid && !allowedScopeIds.has(sid)) return r;
      if (r.active === false) return r;
      // prefer explicit expiresAt when present; otherwise treat as end-of-season expiry
      const effExpiresAt = r.expiresAt?.trim() || expiresAt;
      if (effExpiresAt !== expiresAt) {
        // If someone stored a different expiresAt, still deactivate at rollover.
      }
      rolesChanged = true;
      summary.deactivatedAssignments += 1;
      return { ...r, active: false, expiresAt: effExpiresAt };
    });

    if (!dryRun && rolesChanged && memberId) {
      await db.collection("members").updateOne(
        { memberId },
        { $set: { roles: updatedRoles, updatedAt: new Date() } },
      );
    }

    // 2) Create renewal requests for next season, one per seasonal role assignment
    for (const r of roles) {
      const requestedRole = r.role as UserRole;
      const def = ROLE_DEFINITIONS[requestedRole];
      if (!def?.seasonalRegistration) continue;
      if (r.seasonYear !== fromSeasonYear) continue;

      const scopeType = r.scopeType as ScopeType;
      const scopeId = r.scopeId ? String(r.scopeId) : "";
      if (scopeType !== "club" && scopeType !== "association") continue;
      if (!scopeId || !allowedScopeIds.has(scopeId)) continue;

      try {
        // Skip if renewal already exists (including approved)
        const existing = await db.collection("role_requests").findOne({
          memberId,
          accountType: "member",
          requestedRole,
          scopeType,
          scopeId,
          seasonYear: toSeasonYear,
          status: { $in: ["pending_payment", "awaiting_approval", "approved"] },
        });
        if (existing) {
          summary.skippedExistingRoleRequests += 1;
          continue;
        }

        // Resolve scopeName + fee schedule (best-effort)
        let scopeName: string | undefined = r.scopeName || undefined;
        let clubFeeSchedule: FeeScheduleEntry[] | null = null;
        let parentAssociationId: string | null = null;

        if (scopeType === "club") {
          let club = clubCache.get(scopeId);
          if (club === undefined) {
            const row = await db.collection("clubs").findOne(
              { id: scopeId },
              { projection: { id: 1, name: 1, feeSchedule: 1, parentAssociationId: 1 } },
            );
            club = row
              ? {
                  id: String((row as any).id ?? ""),
                  name: String((row as any).name ?? ""),
                  feeSchedule: ((row as any).feeSchedule as any) ?? null,
                  parentAssociationId: ((row as any).parentAssociationId as any) ?? null,
                }
              : null;
            clubCache.set(scopeId, club);
          }
          if (club?.name) scopeName = club.name;
          clubFeeSchedule = club?.feeSchedule ?? null;
          parentAssociationId = club?.parentAssociationId ? String(club.parentAssociationId) : null;
        }

        // If club belongs to different association somehow, fall back to association schedule for this endpoint's association.
        const effectiveAssocSchedule = assocFeeSchedule;
        void parentAssociationId;

        const entry = resolveFeeWithFallback(
          scopeType === "club" ? clubFeeSchedule : assocFeeSchedule,
          scopeType === "club" ? effectiveAssocSchedule : null,
          requestedRole,
          toSeasonYear,
        );

        let feeAmountCents: number | undefined;
        let feeDescription: string | undefined;
        let gstIncluded: boolean | undefined;
        let gstAmountCents: number | undefined;

        if (entry) {
          feeAmountCents = entry.amountCents;
          feeDescription = buildFeeDescription(entry, def.label, scopeName ?? scopeId);
          gstIncluded = entry.gstIncluded;
          gstAmountCents = calculateGST(entry.amountCents, entry.gstIncluded ?? true).gst;
        }

        const nowIso = new Date().toISOString();
        const status = def.requiresFee ? "pending_payment" : "awaiting_approval";

        if (!dryRun) {
          await db.collection("role_requests").insertOne({
            requestId: `rreq-${uuidv4()}`,
            memberId,
            accountType: "member",
            memberName,
            requestedRole,
            scopeType,
            scopeId,
            scopeName: scopeName ?? (scopeType === "association" ? assocName : undefined),
            seasonYear: toSeasonYear,
            notes: r.notes || undefined,
            requestedBy: "season-rollover",
            requestedByName: "Season rollover",
            requestedAt: nowIso,
            requiresFee: def.requiresFee,
            ...(feeAmountCents !== undefined ? { feeAmountCents } : {}),
            ...(feeDescription ? { feeDescription } : {}),
            ...(gstIncluded !== undefined ? { gstIncluded } : {}),
            ...(gstAmountCents !== undefined ? { gstAmountCents } : {}),
            feePaid: false,
            status,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        }

        summary.createdRoleRequests += 1;
      } catch (e: unknown) {
        summary.errors.push({
          memberId,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  return NextResponse.json(summary);
}

