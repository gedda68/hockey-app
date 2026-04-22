/**
 * GET  /api/member/my-profile
 *   Returns the member record linked to the current session's memberId,
 *   together with the 5 most-recent self-service change-log entries.
 *
 * PATCH /api/member/my-profile
 *   Allows a logged-in member to update the subset of fields they are
 *   permitted to edit without admin involvement:
 *     • contact.phone / contact.mobile
 *     • contact.emergencyContact.*
 *     • address.*
 *     • medical.notes / medical.optOut
 *
 *   Admin-locked fields (stored as member.lockedFields[]) are rejected with 403.
 *   Every successful update writes a member_change_logs entry tagged with
 *   selfService:true so the admin history view can differentiate self-edits
 *   from admin edits.
 *
 * No special permission is required beyond being authenticated with a memberId
 * in the session — the endpoint is inherently scoped to the caller's own record.
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";

// ── Allowed self-editable fields ─────────────────────────────────────────────
// Membership, identity, and club-assignment fields are intentionally excluded;
// those require an admin action so that changes are reviewed.

const SELF_EDITABLE = new Set([
  "contact.phone",
  "contact.mobile",
  "contact.emergencyContact.name",
  "contact.emergencyContact.relationship",
  "contact.emergencyContact.phone",
  "contact.emergencyContact.email",
  "address.street",
  "address.suburb",
  "address.state",
  "address.postcode",
  "address.country",
  "medical.notes",
  "medical.optOut",
]);

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!session.memberId) {
      return NextResponse.json(
        { error: "No member record is linked to this account" },
        { status: 404 },
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const member = await db.collection("members").findOne({ memberId: session.memberId });
    if (!member) {
      return NextResponse.json({ error: "Member record not found" }, { status: 404 });
    }

    // Return the 5 most-recent change-log entries alongside the member document
    // so the page can render an audit trail without a second request.
    const recentChanges = await db
      .collection("member_change_logs")
      .find({ memberId: session.memberId })
      .sort({ timestamp: -1 })
      .limit(5)
      .toArray();

    return NextResponse.json({ member, recentChanges });
  } catch (error: unknown) {
    console.error("💥 my-profile GET error:", error);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

// ── Patch body type ───────────────────────────────────────────────────────────

interface PatchBody {
  contact?: {
    phone?:  string | null;
    mobile?: string | null;
    emergencyContact?: {
      name?:         string;
      relationship?: string;
      phone?:        string;
      email?:        string | null;
    };
  };
  address?: {
    street?:   string;
    suburb?:   string;
    state?:    string;
    postcode?: string;
    country?:  string;
  };
  medical?: {
    notes?:  string | null;
    optOut?: boolean;
  };
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!session.memberId) {
      return NextResponse.json(
        { error: "No member record is linked to this account" },
        { status: 404 },
      );
    }

    const body = (await request.json()) as PatchBody;

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const existing = await db.collection("members").findOne({ memberId: session.memberId });
    if (!existing) {
      return NextResponse.json({ error: "Member record not found" }, { status: 404 });
    }

    // ── Build the set of dot-notation keys being requested ────────────────────
    const requested: string[] = [];
    if (body.contact?.phone         !== undefined) requested.push("contact.phone");
    if (body.contact?.mobile        !== undefined) requested.push("contact.mobile");
    const ec = body.contact?.emergencyContact;
    if (ec?.name         !== undefined) requested.push("contact.emergencyContact.name");
    if (ec?.relationship !== undefined) requested.push("contact.emergencyContact.relationship");
    if (ec?.phone        !== undefined) requested.push("contact.emergencyContact.phone");
    if (ec?.email        !== undefined) requested.push("contact.emergencyContact.email");
    if (body.address) {
      for (const k of Object.keys(body.address)) requested.push(`address.${k}`);
    }
    if (body.medical?.notes  !== undefined) requested.push("medical.notes");
    if (body.medical?.optOut !== undefined) requested.push("medical.optOut");

    if (requested.length === 0) {
      return NextResponse.json({ error: "No recognised fields supplied" }, { status: 400 });
    }

    // ── Enforce the self-editable allow-list ──────────────────────────────────
    const notAllowed = requested.filter((k) => !SELF_EDITABLE.has(k));
    if (notAllowed.length > 0) {
      return NextResponse.json(
        { error: `These fields cannot be edited via self-service: ${notAllowed.join(", ")}` },
        { status: 403 },
      );
    }

    // ── Enforce admin-set field locks ─────────────────────────────────────────
    const lockedFields: string[] = (existing.lockedFields as string[] | undefined) ?? [];
    const blocked = requested.filter((k) => lockedFields.includes(k));
    if (blocked.length > 0) {
      return NextResponse.json(
        {
          error: `The following fields have been locked by your administrator and cannot be changed: ${blocked.join(", ")}`,
          lockedFields: blocked,
        },
        { status: 403 },
      );
    }

    // ── Build $set payload and change-log ─────────────────────────────────────
    const $set: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    const changes: Record<string, { old: unknown; new: unknown }> = {};

    // Helper to record a field change
    function trackChange(dotKey: string, oldVal: unknown, newVal: unknown): void {
      $set[dotKey] = newVal;
      if (oldVal !== newVal) changes[dotKey] = { old: oldVal ?? null, new: newVal ?? null };
    }

    if (body.contact?.phone !== undefined) {
      trackChange("contact.phone", existing.contact?.phone, body.contact.phone ?? null);
    }
    if (body.contact?.mobile !== undefined) {
      trackChange("contact.mobile", existing.contact?.mobile, body.contact.mobile ?? null);
    }
    if (ec?.name !== undefined) {
      trackChange("contact.emergencyContact.name", existing.contact?.emergencyContact?.name, ec.name);
    }
    if (ec?.relationship !== undefined) {
      trackChange("contact.emergencyContact.relationship", existing.contact?.emergencyContact?.relationship, ec.relationship);
    }
    if (ec?.phone !== undefined) {
      trackChange("contact.emergencyContact.phone", existing.contact?.emergencyContact?.phone, ec.phone);
    }
    if (ec?.email !== undefined) {
      trackChange("contact.emergencyContact.email", existing.contact?.emergencyContact?.email, ec.email ?? null);
    }
    if (body.address) {
      const addr = body.address;
      if (addr.street   !== undefined) trackChange("address.street",   existing.address?.street,   addr.street);
      if (addr.suburb   !== undefined) trackChange("address.suburb",   existing.address?.suburb,   addr.suburb);
      if (addr.state    !== undefined) trackChange("address.state",    existing.address?.state,    addr.state);
      if (addr.postcode !== undefined) trackChange("address.postcode", existing.address?.postcode, addr.postcode);
      if (addr.country  !== undefined) trackChange("address.country",  existing.address?.country,  addr.country);
    }
    if (body.medical?.notes !== undefined) {
      trackChange("medical.notes", existing.medical?.notes, body.medical.notes ?? null);
    }
    if (body.medical?.optOut !== undefined) {
      trackChange("medical.optOut", existing.medical?.optOut, body.medical.optOut);
    }

    if (Object.keys(changes).length === 0) {
      return NextResponse.json({ message: "No changes detected", member: existing });
    }

    // ── Persist changes ───────────────────────────────────────────────────────
    await db.collection("members").updateOne({ memberId: session.memberId }, { $set });

    // ── Audit log ─────────────────────────────────────────────────────────────
    const now = new Date().toISOString();
    await db.collection("member_change_logs").insertOne({
      memberId:    session.memberId,
      section:     "self-service",
      changes,
      timestamp:   now,
      updatedBy:   session.email ?? session.userId,
      updatedByName: session.name,
      updatedAt:   now,
      selfService: true,   // distinguishes self-edits from admin edits in history view
    });

    const updated = await db.collection("members").findOne({ memberId: session.memberId });
    return NextResponse.json({ success: true, member: updated });
  } catch (error: unknown) {
    console.error("💥 my-profile PATCH error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
