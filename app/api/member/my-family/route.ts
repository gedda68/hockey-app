/**
 * GET/POST/DELETE /api/member/my-family
 *
 * M4 — Family account linking (self-service).
 *
 * - GET: return family + members when the current session member is primary contact
 * - POST: link another member into the family (DOB verification)
 * - DELETE: unlink a member from the family (primary contact only)
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import {
  generateFamilyId,
  getFamilyMembers,
  addMemberToFamily,
  removeMemberFromFamily,
} from "@/lib/types/family";

type LinkBody = {
  targetMemberId: string;
  targetDateOfBirth: string; // YYYY-MM-DD or DD/MM/YYYY
  relationship?: string; // e.g. "Child"
};

function normalizeDate(v: string): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const memberId = session.memberId?.trim();
  if (!memberId) return NextResponse.json({ family: null, members: [] });

  const client = await clientPromise;
  const db = client.db();

  const me = await db.collection("members").findOne(
    { memberId },
    { projection: { memberId: 1, personalInfo: 1, contact: 1, clubId: 1, family: 1 } },
  );
  const myFamilyId = String((me as any)?.family?.familyId ?? "").trim();
  const isPrimary = Boolean((me as any)?.family?.isPrimaryContact);
  if (!myFamilyId || !isPrimary) {
    return NextResponse.json({ family: null, members: [] });
  }

  const family = await db.collection("families").findOne({ familyId: myFamilyId });
  const members = await getFamilyMembers(db as any, myFamilyId);

  return NextResponse.json({
    family,
    members: members.map((m: any) => ({
      memberId: String(m.memberId ?? ""),
      clubId: String(m.clubId ?? ""),
      displayName:
        String(m.personalInfo?.displayName ?? "").trim() ||
        `${m.personalInfo?.firstName ?? ""} ${m.personalInfo?.lastName ?? ""}`.trim() ||
        String(m.memberId ?? ""),
      dateOfBirth: String(m.personalInfo?.dateOfBirth ?? ""),
      isPrimaryContact: Boolean(m.family?.isPrimaryContact),
      relationship: String(m.family?.relationship ?? ""),
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const memberId = session.memberId?.trim();
  if (!memberId) {
    return NextResponse.json({ error: "No member profile on this account" }, { status: 400 });
  }

  const body = (await request.json()) as LinkBody;
  const targetMemberId = String(body.targetMemberId ?? "").trim();
  const targetDob = normalizeDate(String(body.targetDateOfBirth ?? ""));
  const relationship = String(body.relationship ?? "Child").trim() || "Child";

  if (!targetMemberId || !targetDob) {
    return NextResponse.json(
      { error: "targetMemberId and targetDateOfBirth are required" },
      { status: 400 },
    );
  }
  if (targetMemberId === memberId) {
    return NextResponse.json({ error: "Cannot link yourself" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db();

  const [me, target] = await Promise.all([
    db.collection("members").findOne(
      { memberId },
      { projection: { memberId: 1, personalInfo: 1, contact: 1, address: 1, clubId: 1, family: 1 } },
    ),
    db.collection("members").findOne(
      { memberId: targetMemberId },
      { projection: { memberId: 1, personalInfo: 1, clubId: 1, family: 1 } },
    ),
  ]);

  if (!me) return NextResponse.json({ error: "Your member profile was not found" }, { status: 404 });
  if (!target) return NextResponse.json({ error: "Target member not found" }, { status: 404 });

  const targetStoredDob = String((target as any)?.personalInfo?.dateOfBirth ?? "");
  if (normalizeDate(targetStoredDob) !== targetDob) {
    return NextResponse.json({ error: "Date of birth does not match" }, { status: 403 });
  }

  const existingTargetFamily = String((target as any)?.family?.familyId ?? "").trim();
  if (existingTargetFamily) {
    return NextResponse.json({ error: "Target member is already linked to a family" }, { status: 409 });
  }

  const myFamilyId = String((me as any)?.family?.familyId ?? "").trim();
  const myIsPrimary = Boolean((me as any)?.family?.isPrimaryContact);

  let familyId = myFamilyId;
  if (!familyId) {
    // Create a new family
    familyId = generateFamilyId();
    const familyName =
      `${(me as any)?.personalInfo?.lastName ?? "Family"}`.trim() + " Family";
    const billingName =
      String((me as any)?.personalInfo?.displayName ?? "").trim() ||
      `${(me as any)?.personalInfo?.firstName ?? ""} ${(me as any)?.personalInfo?.lastName ?? ""}`.trim();
    const billingEmail = String((me as any)?.contact?.primaryEmail ?? "").trim();
    const billingPhone = String((me as any)?.contact?.phone ?? (me as any)?.contact?.mobile ?? "").trim();
    const address = (me as any)?.address ?? {};

    await db.collection("families").insertOne({
      familyId,
      familyName,
      primaryContact: { memberId, userId: session.userId ?? null, role: "Parent" },
      members: [
        { memberId, clubId: String((me as any)?.clubId ?? ""), relationship: "Self", isPrimary: true },
      ],
      billingContact: {
        name: billingName || memberId,
        email: billingEmail,
        phone: billingPhone,
        address: {
          street: String(address.street ?? ""),
          suburb: String(address.suburb ?? ""),
          state: String(address.state ?? ""),
          postcode: String(address.postcode ?? ""),
          country: String(address.country ?? ""),
        },
      },
      settings: { sharedBilling: true, sharedCommunication: true, familyDiscountEligible: true },
      emergencyContact: { name: "", relationship: "", phone: "", mobile: "" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: session.userId ?? "self-service",
    });

    // Mark self as primary contact on member doc
    await db.collection("members").updateOne(
      { memberId },
      { $set: { family: { familyId, relationship: "Self", isPrimaryContact: true }, updatedAt: new Date().toISOString() } },
    );
  } else if (!myIsPrimary) {
    return NextResponse.json({ error: "Only the family primary contact can link members" }, { status: 403 });
  }

  await addMemberToFamily(db as any, familyId, targetMemberId, String((target as any)?.clubId ?? ""), relationship);

  return NextResponse.json({ ok: true, familyId });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const memberId = session.memberId?.trim();
  if (!memberId) return NextResponse.json({ error: "No member profile on this account" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const targetMemberId = searchParams.get("targetMemberId")?.trim() || "";
  if (!targetMemberId) return NextResponse.json({ error: "targetMemberId is required" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db();

  const me = await db.collection("members").findOne(
    { memberId },
    { projection: { family: 1 } },
  );
  const familyId = String((me as any)?.family?.familyId ?? "").trim();
  const isPrimary = Boolean((me as any)?.family?.isPrimaryContact);
  if (!familyId || !isPrimary) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (targetMemberId === memberId) {
    return NextResponse.json({ error: "Cannot unlink yourself" }, { status: 400 });
  }

  await removeMemberFromFamily(db as any, familyId, targetMemberId);
  return NextResponse.json({ ok: true });
}

