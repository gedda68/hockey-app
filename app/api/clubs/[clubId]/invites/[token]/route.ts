/**
 * GET /api/clubs/[clubId]/invites/[token]
 *
 * Public (no auth required) — validates an invite token and returns the
 * information the self-registration wizard needs to render Steps 1–4:
 *
 *   • Club name, slug, and season year (pre-fills wizard header)
 *   • Resolved role options with fee data (drives Step 3 role selector)
 *
 * Token validation rules:
 *   1. Token must exist in club_invite_tokens
 *   2. status must be "active" (not revoked)
 *   3. expiresAt must be in the future
 *   4. If maxUses is set, useCount must be less than maxUses
 *
 * On success returns TokenValidationResponse (200).
 * On failure returns { valid: false, reason: string } (400/404/410).
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise, { getDatabaseName } from "@/lib/mongodb";
import { resolveFeeWithFallback, buildFeeDescription } from "@/lib/fees/feeSchedule";
import { getRoleLabel, getRoleDefinition } from "@/lib/types/roles";
import type { UserRole } from "@/lib/types/roles";
import type { TokenValidationResponse, ResolvedRoleOption } from "@/types/inviteTokens";
import type { FeeScheduleEntry } from "@/types/feeSchedule";

/**
 * Default role options offered when the token has no pre-selected roles.
 * These are the standard self-registerable roles at a club.
 */
const DEFAULT_REGISTERABLE_ROLES: UserRole[] = [
  "player",
  "member",
  "volunteer",
  "parent",
];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clubId: string; token: string }> },
) {
  try {
    const { clubId: clubSlug, token } = await params;

    if (!token || token.length !== 64 || !/^[0-9a-f]+$/.test(token)) {
      return NextResponse.json(
        { valid: false, reason: "Invalid token format" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db(getDatabaseName());

    // ── Look up the token ─────────────────────────────────────────────────────
    const inviteDoc = await db
      .collection("club_invite_tokens")
      .findOne({ token, clubSlug });

    if (!inviteDoc) {
      return NextResponse.json(
        { valid: false, reason: "Invite link not found or does not belong to this club" },
        { status: 404 },
      );
    }

    // ── Validate token state ──────────────────────────────────────────────────
    if (inviteDoc.status === "revoked") {
      return NextResponse.json(
        { valid: false, reason: "This invite link has been revoked" },
        { status: 410 },
      );
    }

    if (new Date(inviteDoc.expiresAt as string) < new Date()) {
      return NextResponse.json(
        { valid: false, reason: "This invite link has expired" },
        { status: 410 },
      );
    }

    if (
      typeof inviteDoc.maxUses === "number" &&
      (inviteDoc.useCount as number) >= inviteDoc.maxUses
    ) {
      return NextResponse.json(
        { valid: false, reason: "This invite link has reached its maximum number of uses" },
        { status: 410 },
      );
    }

    // ── Load club + parent association for fee resolution ─────────────────────
    const club = await db.collection("clubs").findOne({
      $or: [{ slug: clubSlug }, { id: clubSlug }],
    });

    let associationFeeSchedule: FeeScheduleEntry[] | null = null;
    if (club?.associationId) {
      const assoc = await db
        .collection("associations")
        .findOne({ id: club.associationId });
      associationFeeSchedule = (assoc?.feeSchedule as FeeScheduleEntry[] | undefined) ?? null;
    }

    const clubFeeSchedule = (club?.feeSchedule as FeeScheduleEntry[] | undefined) ?? null;
    const seasonYear = inviteDoc.seasonYear as string;

    // ── Resolve role options ──────────────────────────────────────────────────
    const tokenRoles =
      Array.isArray(inviteDoc.roles) && inviteDoc.roles.length > 0
        ? (inviteDoc.roles as UserRole[])
        : DEFAULT_REGISTERABLE_ROLES;

    const roleOptions: ResolvedRoleOption[] = tokenRoles.map((role) => {
      const roleDef = getRoleDefinition(role);
      const feeEntry = resolveFeeWithFallback(
        clubFeeSchedule,
        associationFeeSchedule,
        role,
        seasonYear,
      );

      const label = getRoleLabel(role);

      if (roleDef?.requiresFee && feeEntry) {
        return {
          role,
          label,
          requiresFee: true,
          feeAmountCents: feeEntry.amountCents,
          feeDescription: buildFeeDescription(
            feeEntry,
            label,
            inviteDoc.clubName as string,
          ),
          gstIncluded: feeEntry.gstIncluded,
        };
      }

      return {
        role,
        label,
        requiresFee: roleDef?.requiresFee ?? false,
      };
    });

    const body: TokenValidationResponse = {
      valid: true,
      tokenId:    inviteDoc.tokenId as string,
      clubId:     inviteDoc.clubId as string,
      clubName:   inviteDoc.clubName as string,
      clubSlug:   inviteDoc.clubSlug as string,
      seasonYear,
      roleOptions,
    };

    return NextResponse.json(body);
  } catch (error: unknown) {
    console.error("💥 token validation GET error:", error);
    return NextResponse.json(
      { valid: false, reason: "Failed to validate invite link" },
      { status: 500 },
    );
  }
}
