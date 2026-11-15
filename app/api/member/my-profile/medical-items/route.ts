/**
 * Conditions / allergies with their prescribed medications — one row at a time.
 *   POST   { item: { id?, kind, name, medications: [{name, dose}] } }  → add (no id) or update a row
 *   DELETE ?id=…                                                       → delete a row
 * Scoped to the signed-in member's own record; admin field locks are honoured; changes are logged.
 * The legacy flat strings (conditions/medications/allergies) are kept in sync.
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { blockedByLocks } from "@/lib/members/selfDetails";
import { itemsFromMedical, legacyFromItems, upsertMedicalItem, removeMedicalItem, type UpsertResult } from "@/lib/members/medicalItems";

async function apply(request: NextRequest, change: (current: ReturnType<typeof itemsFromMedical>) => UpsertResult | Promise<UpsertResult>) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (!session.memberId) return NextResponse.json({ error: "No member record is linked to this account" }, { status: 404 });

  const db = (await clientPromise).db("hockey-app");
  const memberKey = await resolveSessionMemberId(db, session);
  const existing = await db.collection("members").findOne({ memberId: memberKey });
  if (!existing) return NextResponse.json({ error: "Member record not found" }, { status: 404 });

  const touched = ["medical.items", "medical.conditions", "medical.medications", "medical.allergies"];
  const blocked = blockedByLocks(touched, (existing.lockedFields as string[] | undefined) ?? []);
  if (blocked.length) return NextResponse.json({ error: `These fields are locked by your administrator: ${blocked.join(", ")}` }, { status: 403 });

  const before = itemsFromMedical(existing.medical);
  const result = await change(before);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

  const flat = legacyFromItems(result.items);
  const now = new Date().toISOString();
  await db.collection("members").updateOne(
    { memberId: memberKey },
    { $set: { "medical.items": result.items, "medical.conditions": flat.conditions, "medical.medications": flat.medications, "medical.allergies": flat.allergies, updatedAt: now } },
  );
  await db.collection("member_change_logs").insertOne({
    memberId: memberKey,
    section: "self-service",
    changes: { "medical.items": { old: before, new: result.items } },
    timestamp: now,
    updatedBy: session.email ?? session.userId,
    updatedByName: session.name,
    updatedAt: now,
    selfService: true,
  });
  return NextResponse.json({ success: true, items: result.items });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    return await apply(request, (cur) => upsertMedicalItem(cur, (body as any).item));
  } catch (e) {
    console.error("medical-items POST error:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = (new URL(request.url).searchParams.get("id") ?? "").trim();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    return await apply(request, (cur) => removeMedicalItem(cur, id));
  } catch (e) {
    console.error("medical-items DELETE error:", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
