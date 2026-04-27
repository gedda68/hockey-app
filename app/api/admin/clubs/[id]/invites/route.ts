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
    const { response: authRes } = await requirePermission(
      request,
      "registration.manage",
    );
    if (authRes) return authRes;

    const { id: clubSlug } = await params;

    const { response: scopeRes } = await requireResourceAccess(
      request,
      "club",
      clubSlug,
    );
    if (scopeRes) return scopeRes;

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as GenerateInviteBody;
    const {
      seasonYear,
      roles = [],
      expiresInDays = DEFAULT_EXPIRES_DAYS,
      maxUses,
      recipientEmail,
    } = body;

    if (!seasonYear || !/^\d{4}$/.test(seasonYear)) {
      return NextResponse.json(
        { error: "seasonYear must be a four-digit year" },
        { status: 400 },
      );
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
    const expiresAt = new Date(
      now.getTime() + expiresInDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    const inviteDoc: InviteToken = {
      tokenId,
      token,
      clubId: club.id as string,
      clubSlug: (club.slug as string | undefined) ?? clubSlug,
      clubName: club.name as string,
      seasonYear,
      roles,
      createdAt: now.toISOString(),
      expiresAt,
      createdBy: session.userId,
      createdByName: String(session.name ?? session.email ?? "Registrar"),
      status: "active",
      maxUses: typeof maxUses === "number" ? maxUses : undefined,
      useCount: 0,
    };

    await db.collection("club_invite_tokens").insertOne(inviteDoc);

    if (recipientEmail?.trim()) {
      const msg = buildMemberInviteEmail({
        clubName: inviteDoc.clubName,
        clubSlug: inviteDoc.clubSlug,
        seasonYear,
        token: inviteDoc.token,
        invitedByName: inviteDoc.createdByName,
        expiresAt: inviteDoc.expiresAt,
      });
      await sendEmail({
        to: recipientEmail.trim(),
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      });
    }

    return NextResponse.json(
      {
        invite: {
          ...inviteDoc,
          inviteUrl: `${APP_URL}/clubs/${encodeURIComponent(inviteDoc.clubSlug)}/register?token=${encodeURIComponent(inviteDoc.token)}`,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("POST /api/admin/clubs/[id]/invites error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

// ── GET — list invites ────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { response: authRes } = await requirePermission(
      request,
      "registration.manage",
    );
    if (authRes) return authRes;

    const { id: clubSlug } = await params;
    const { response: scopeRes } = await requireResourceAccess(
      request,
      "club",
      clubSlug,
    );
    if (scopeRes) return scopeRes;

    const client = await clientPromise;
    const db = client.db(getDatabaseName());

    const club = await db.collection("clubs").findOne({
      $or: [{ slug: clubSlug }, { id: clubSlug }],
    });
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const rows = await db
      .collection("club_invite_tokens")
      .find({ clubId: club.id, status: { $ne: "revoked" } })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    const now = Date.now();
    const inviteRows = rows.map((r) => {
      const expiresAt = typeof r.expiresAt === "string" ? r.expiresAt : null;
      const expired = expiresAt ? Date.parse(expiresAt) <= now : false;
      const status = expired ? "expired" : r.status;
      return {
        tokenId: String(r.tokenId ?? ""),
        clubId: String(r.clubId ?? ""),
        clubSlug: String(r.clubSlug ?? ""),
        clubName: String(r.clubName ?? ""),
        seasonYear: String(r.seasonYear ?? ""),
        roles: Array.isArray(r.roles) ? r.roles : [],
        status,
        createdAt: String(r.createdAt ?? ""),
        expiresAt,
        maxUses: typeof r.maxUses === "number" ? r.maxUses : null,
        uses: typeof r.useCount === "number" ? r.useCount : 0,
        inviteUrl: `${APP_URL}/clubs/${encodeURIComponent(String(r.clubSlug ?? clubSlug))}/register?token=${encodeURIComponent(String(r.token ?? ""))}`,
      };
    });

    return NextResponse.json({ invites: inviteRows });
  } catch (error: unknown) {
    console.error("GET /api/admin/clubs/[id]/invites error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

// ── DELETE — revoke invite ────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { response: authRes } = await requirePermission(
      request,
      "registration.manage",
    );
    if (authRes) return authRes;

    const { id: clubSlug } = await params;
    const { response: scopeRes } = await requireResourceAccess(
      request,
      "club",
      clubSlug,
    );
    if (scopeRes) return scopeRes;

    const tokenId = new URL(request.url).searchParams.get("tokenId")?.trim();
    if (!tokenId) {
      return NextResponse.json(
        { error: "tokenId query param is required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db(getDatabaseName());

    const club = await db.collection("clubs").findOne({
      $or: [{ slug: clubSlug }, { id: clubSlug }],
    });
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const res = await db.collection("club_invite_tokens").updateOne(
      { tokenId, clubId: club.id },
      { $set: { status: "revoked", updatedAt: new Date().toISOString() } },
    );
    if (res.matchedCount === 0) {
      return NextResponse.json(
        { error: "Invite token not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("DELETE /api/admin/clubs/[id]/invites error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

