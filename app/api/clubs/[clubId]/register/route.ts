/**
 * POST /api/clubs/[clubId]/register
 *
 * Public endpoint — completes a new member's self-registration via a tokenised
 * invite link.  No session required; the invite token is the authentication
 * and authorisation mechanism.
 *
 * Request body: SelfRegistrationBody (see types/inviteTokens.ts)
 *
 * Processing steps:
 *   1. Re-validate the invite token (active, not expired, not exhausted)
 *   2. Validate required fields (name, DOB, email, emergency contact, role)
 *   3. Guard against duplicate email within the club
 *   4. Generate a memberId (same atomic sequence as admin route)
 *   5. Insert member document into `members`
 *   6. Insert role request into `role_requests` (status: pending_payment | awaiting_approval)
 *   7. Atomically increment token useCount
 *   8. Fire-and-forget confirmation email to the registrant
 *   9. Return RegistrationResult
 *
 * Returns 201 on success, 400/404/409/410/500 on failure.
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import type { Db } from "mongodb";
import clientPromise, { getDatabaseName } from "@/lib/mongodb";
import { ROLE_DEFINITIONS, getRoleLabel } from "@/lib/types/roles";
import { resolveFeeWithFallback, buildFeeDescription } from "@/lib/fees/feeSchedule";
import { sendEmail } from "@/lib/email/client";
import { buildRegistrationConfirmationEmail } from "@/lib/email/templates/registrationConfirmation";
import type { SelfRegistrationBody, RegistrationResult } from "@/types/inviteTokens";
import type { FeeScheduleEntry } from "@/types/feeSchedule";

// ── Shared memberId generator (mirrors app/api/admin/members/route.ts) ────────

async function generateMemberId(db: Db, clubId: string): Promise<string> {
  const clubsCol = db.collection("clubs");
  const club = await clubsCol.findOne({ id: clubId });
  if (!club) throw new Error("Club not found");

  const shortName = (club.shortName as string | undefined) || "CLB";

  const updateRes = await clubsCol.findOneAndUpdate(
    { id: clubId },
    { $inc: { memberSequence: 1 } },
    { returnDocument: "after", upsert: false },
  );

  // MongoDB driver v5+: result is the document directly; v4: { value: doc }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatedDoc = (updateRes as any)?.value ?? updateRes;
  const sequence = updatedDoc?.memberSequence;

  if (sequence == null) {
    throw new Error("Failed to generate member sequence");
  }

  return `${shortName}-${String(sequence).padStart(7, "0")}`;
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> },
) {
  try {
    const { clubId: clubSlug } = await params;

    const body = (await request.json()) as SelfRegistrationBody;
    const { token, personalInfo, contact, address, selectedRole } = body;

    // ── Basic field validation ─────────────────────────────────────────────────
    if (!token) {
      return NextResponse.json({ error: "invite token is required" }, { status: 400 });
    }

    if (!personalInfo?.firstName?.trim() || !personalInfo?.lastName?.trim()) {
      return NextResponse.json({ error: "First and last name are required" }, { status: 400 });
    }

    if (!personalInfo?.dateOfBirth) {
      return NextResponse.json({ error: "Date of birth is required" }, { status: 400 });
    }

    if (!personalInfo?.gender) {
      return NextResponse.json({ error: "Gender is required" }, { status: 400 });
    }

    if (!contact?.email?.trim()) {
      return NextResponse.json({ error: "Email address is required" }, { status: 400 });
    }

    if (!contact?.emergencyContact?.name?.trim() || !contact?.emergencyContact?.phone?.trim()) {
      return NextResponse.json(
        { error: "Emergency contact name and phone are required" },
        { status: 400 },
      );
    }

    if (!selectedRole) {
      return NextResponse.json({ error: "selectedRole is required" }, { status: 400 });
    }

    const roleDef = ROLE_DEFINITIONS[selectedRole];
    if (!roleDef) {
      return NextResponse.json({ error: "Unknown role" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(getDatabaseName());

    // ── Re-validate the invite token ──────────────────────────────────────────
    const inviteDoc = await db
      .collection("club_invite_tokens")
      .findOne({ token, clubSlug });

    if (!inviteDoc) {
      return NextResponse.json(
        { error: "Invite link not found or does not belong to this club" },
        { status: 404 },
      );
    }

    if (inviteDoc.status === "revoked") {
      return NextResponse.json({ error: "This invite link has been revoked" }, { status: 410 });
    }

    if (new Date(inviteDoc.expiresAt as string) < new Date()) {
      return NextResponse.json({ error: "This invite link has expired" }, { status: 410 });
    }

    if (
      typeof inviteDoc.maxUses === "number" &&
      (inviteDoc.useCount as number) >= inviteDoc.maxUses
    ) {
      return NextResponse.json(
        { error: "This invite link has reached its maximum number of uses" },
        { status: 410 },
      );
    }

    // Validate that the selected role is permitted by this token
    const tokenRoles = inviteDoc.roles as string[] | undefined;
    if (Array.isArray(tokenRoles) && tokenRoles.length > 0 && !tokenRoles.includes(selectedRole)) {
      return NextResponse.json(
        { error: "The selected role is not permitted by this invite link" },
        { status: 400 },
      );
    }

    // ── Resolve club ──────────────────────────────────────────────────────────
    const club = await db.collection("clubs").findOne({
      $or: [{ slug: clubSlug }, { id: clubSlug }],
    });
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const canonicalClubId = club.id as string;
    const clubName = club.name as string;
    const seasonYear = inviteDoc.seasonYear as string;

    // ── Duplicate email guard (within this club) ───────────────────────────────
    const emailLower = contact.email.trim().toLowerCase();
    const existingMember = await db.collection("members").findOne({
      "membership.clubId": canonicalClubId,
      "contact.email": emailLower,
    });

    if (existingMember) {
      return NextResponse.json(
        {
          error: "A member with this email address is already registered with this club",
          existingMemberId: existingMember.memberId,
        },
        { status: 409 },
      );
    }

    // ── Generate memberId ─────────────────────────────────────────────────────
    const memberId = await generateMemberId(db, canonicalClubId);

    const associationId =
      (club.parentAssociationId as string | undefined) ??
      (club.associationId as string | undefined) ??
      null;

    const displayName = `${personalInfo.firstName.trim()} ${personalInfo.lastName.trim()}`;
    const now = new Date().toISOString();

    // ── Insert member document ────────────────────────────────────────────────
    await db.collection("members").insertOne({
      memberId,
      clubId: canonicalClubId,
      associationId,

      personalInfo: {
        salutation:  personalInfo.salutation ?? null,
        firstName:   personalInfo.firstName.trim(),
        lastName:    personalInfo.lastName.trim(),
        displayName,
        dateOfBirth: personalInfo.dateOfBirth,
        gender:      personalInfo.gender,
        photoUrl:    null,
      },

      contact: {
        email:  emailLower,
        phone:  contact.phone  ?? null,
        mobile: contact.mobile ?? null,
        emergencyContact: {
          name:         contact.emergencyContact.name.trim(),
          relationship: contact.emergencyContact.relationship,
          phone:        contact.emergencyContact.phone.trim(),
          email:        contact.emergencyContact.email ?? null,
        },
      },

      address: {
        street:   address?.street   ?? "",
        suburb:   address?.suburb   ?? "",
        state:    address?.state    ?? "",
        postcode: address?.postcode ?? "",
        country:  address?.country  ?? "Australia",
      },

      membership: {
        clubId:          canonicalClubId,
        associationId,
        joinDate:        now,
        membershipTypes: [],
        status:          "Active",
        expiryDate:      null,
        renewalDate:     null,
      },

      roles:   [],
      teams:   [],
      userId:  null,
      medical: null,
      notes:   null,

      // Source tracking — distinguishes self-registered from admin-created
      registeredViaToken: inviteDoc.tokenId,
      registrationSource: "invite-link",

      createdAt: now,
      updatedAt: now,
      createdBy: "self-registration",
      updatedBy: null,
    });

    // ── Resolve fee for the selected role ─────────────────────────────────────
    let feeAmountCents: number | undefined;
    let feeDescription: string | undefined;
    let gstIncluded: boolean | undefined;

    let assocFeeSchedule: FeeScheduleEntry[] | null = null;
    if (associationId) {
      const assoc = await db.collection("associations").findOne({ id: associationId });
      assocFeeSchedule = (assoc?.feeSchedule as FeeScheduleEntry[] | undefined) ?? null;
    }
    const clubFeeSchedule = (club.feeSchedule as FeeScheduleEntry[] | undefined) ?? null;

    const feeEntry = resolveFeeWithFallback(clubFeeSchedule, assocFeeSchedule, selectedRole, seasonYear);
    if (roleDef.requiresFee && feeEntry) {
      feeAmountCents = feeEntry.amountCents;
      feeDescription = buildFeeDescription(feeEntry, getRoleLabel(selectedRole), clubName);
      gstIncluded     = feeEntry.gstIncluded;
    }

    // ── Create role request ───────────────────────────────────────────────────
    const requiresFee = roleDef.requiresFee && feeAmountCents !== undefined;
    const requestStatus: "pending_payment" | "awaiting_approval" | "no_role_request" =
      roleDef.requiresApproval
        ? requiresFee
          ? "pending_payment"
          : "awaiting_approval"
        : "no_role_request";

    let requestId: string | null = null;

    if (roleDef.requiresApproval) {
      requestId = `req-${uuidv4()}`;
      await db.collection("role_requests").insertOne({
        requestId,
        memberId,
        memberName: displayName,
        accountType: "member",
        requestedRole: selectedRole,
        scopeType: "club",
        scopeId: canonicalClubId,
        scopeName: clubName,
        seasonYear,
        status: requestStatus,
        requiresFee: roleDef.requiresFee,
        ...(feeAmountCents !== undefined ? { feeAmountCents } : {}),
        ...(feeDescription !== undefined ? { feeDescription } : {}),
        ...(gstIncluded    !== undefined ? { gstIncluded }    : {}),
        registrationSource: "invite-link",
        inviteTokenId: inviteDoc.tokenId,
        notes: null,
        submittedAt: now,
        reviewedAt: null,
        reviewedBy: null,
        reviewNote: null,
      });
    }

    // ── Increment token use count ─────────────────────────────────────────────
    await db.collection("club_invite_tokens").updateOne(
      { tokenId: inviteDoc.tokenId },
      { $inc: { useCount: 1 } },
    );

    // ── Fire-and-forget confirmation email ────────────────────────────────────
    const emailPayload = buildRegistrationConfirmationEmail({
      firstName:      personalInfo.firstName.trim(),
      memberId,
      clubName,
      membershipType: getRoleLabel(selectedRole),
      season:         seasonYear,
    });
    sendEmail({ to: emailLower, ...emailPayload }).catch((err) =>
      console.error("Registration confirmation email failed:", err),
    );

    // ── Return result ─────────────────────────────────────────────────────────
    const result: RegistrationResult = {
      memberId,
      requestId,
      status:      requestStatus,
      requiresFee,
      clubName,
      seasonYear,
      ...(feeAmountCents !== undefined ? { feeAmountCents } : {}),
      ...(feeDescription !== undefined ? { feeDescription } : {}),
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    console.error("💥 self-registration POST error:", error);
    return NextResponse.json({ error: "Failed to complete registration" }, { status: 500 });
  }
}
