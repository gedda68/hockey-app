/**
 * POST /api/admin/clubs/[id]/invites
 *   Registrar generates a tokenised invite link for a club.
 *   Optionally sends an invite email to a specific recipient.
 *
 * GET /api/admin/clubs/[id]/invites
 *   Lists all non-revoked invite tokens for the club (most-recent first).
 *
 * DELETE /api/admin/clubs/[id]/invites?tokenId=invite-xxx
 *   Revokes a specific invite token.
 *
 * Required permission: registration.manage
 * Scope: caller must have access to the specified club.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { v4 as uuidv4 } from "uuid";
import clientPromise, { getDatabaseName } from "@/lib/mongodb";
import { requirePermission, requireResourceAccess } from "@/lib/auth/middleware";
import { getSession } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/client";
import { buildMemberInviteEmail } from "@/lib/email/templates/memberInvite";
import { APP_URL } from "@/lib/email/client";
import type { GenerateInviteBody, InviteToken } from "@/types/inviteTokens";

const DEFAULT_EXPIRES_DAYS = 30;

// ── POST — generate invite ────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { response: authRes } = await requirePermission(request, "registration.manage");
    if (authRes) return authRes;

    const { id: clubSlug } = await params;

    const { response: scopeRes } = await requireResourceAccess(request, "club", clubSlug);
    if (scopeRes) return scopeRes;

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = (await request.json()) as GenerateInviteBody;
    const { seasonYear, roles = [], expiresInDays = DEFAULT_EXPIRES_DAYS, maxUses, recipientEmail } = body;

    if (!seasonYear || !/^\d{4}$/.test(seasonYear)) {
      return NextResponse.json({ error: "seasonYear must be a four-digit year" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(getDatabaseName());

    // Resolve canonical club document
    const club = await db.collection("clubs").findOne({
      $or: [{ slug: clubSlug }, { id: clubSlug }],
    });
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Build token
    const token = randomBytes(32).toString("hex"); // 64-char hex
    const tokenId = `invite-${uuidv4()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

    const inviteDoc: InviteToken = {
      tokenId,
      token,
      clubId:       club.id as string,
      clubSlug:     (club.slug as string | undefined) ?? clubSlug,
      clubName:     club.name as string,
      seasonYear,
      roles,
      createdBy:     session.userId,
      createdByName: session.name,
      createdAt:     now.toISOString(),
      expiresAt,
      ...(maxUses !== undefined ? { maxUses } : {}),
      useCount: 0,
      status:   "active",
    };

    await db.collection("club_invite_tokens").insertOne(inviteDoc);

    const inviteUrl = `${APP_URL}/clubs/${inviteDoc.clubSlug}/register?token=${token}`;

    // Fire-and-forget invite email if a recipient was specified
    if (recipientEmail?.trim()) {
      const emailPayload = buildMemberInviteEmail({
        clubName:      inviteDoc.clubName,
        clubSlug:      inviteDoc.clubSlug,
        seasonYear,
        token,
        invitedByName: session.name,
        expiresAt,
      });
      sendEmail({ to: recipientEmail.trim(), ...emailPayload }).catch((err) =>
        console.error("Invite email failed:", err),
      );
    }

    return NextResponse.json(
      { tokenId, token, inviteUrl, expiresAt },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("💥 invites POST error:", error);
    return NextResponse.json({ error: "Failed to generate invite" }, { status: 500 });
  }
}

// ── GET — list invites ────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { response: authRes } = await requirePermission(request, "registration.manage");
    if (authRes) return authRes;

    const { id: clubSlug } = await params;

    const { response: scopeRes } = await requireResourceAccess(request, "club", clubSlug);
    if (scopeRes) return scopeRes;

    const client = await clientPromise;
    const db = client.db(getDatabaseName());

    const club = await db.collection("clubs").findOne({
      $or: [{ slug: clubSlug }, { id: clubSlug }],
    });
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const invites = await db
      .collection("club_invite_tokens")
      .find({ clubId: club.id, status: { $ne: "revoked" } })
      .sort({ createdAt: -1 })
      .toArray();

    // Mask the actual token in the list response — callers only need the URL
    // to resend; the raw token is returned only at generation time.
    const sanitised = invites.map((inv) => {
      const { token: _t, ...rest } = inv;
      void _t;
      return {
        ...rest,
        inviteUrl: `${APP_URL}/clubs/${inv.clubSlug}/register?token=${inv.token}`,
        // Re-derive live status based on expiry and use-count
        liveStatus:
          inv.status === "revoked"
            ? "revoked"
            : new Date(inv.expiresAt as string) < new Date()
            ? "expired"
            : typeof inv.maxUses === "number" && (inv.useCount as number) >= inv.maxUses
            ? "exhausted"
            : "active",
      };
    });

    return NextResponse.json({ invites: sanitised });
  } catch (error: unknown) {
    console.error("💥 invites GET error:", error);
    return NextResponse.json({ error: "Failed to list invites" }, { status: 500 });
  }
}

// ── DELETE — revoke invite ────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { response: authRes } = await requirePermission(request, "registration.manage");
    if (authRes) return authRes;

    const { id: clubSlug } = await params;

    const { response: scopeRes } = await requireResourceAccess(request, "club", clubSlug);
    if (scopeRes) return scopeRes;

    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get("tokenId");
    if (!tokenId) {
      return NextResponse.json({ error: "tokenId query param is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(getDatabaseName());

    const result = await db.collection("club_invite_tokens").updateOne(
      { tokenId },
      { $set: { status: "revoked", updatedAt: new Date().toISOString() } },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Invite token not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Invite revoked" });
  } catch (error: unknown) {
    console.error("💥 invites DELETE error:", error);
    return NextResponse.json({ error: "Failed to revoke invite" }, { status: 500 });
  }
}
