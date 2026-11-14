/**
 * POST   /api/member/my-profile/photo  { dataUrl }  — set or replace your own profile photo
 * DELETE /api/member/my-profile/photo               — remove it
 * Scoped to the signed-in member; honours an admin lock on personalInfo.photoUrl; audit-logged.
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { validatePhotoDataUrl } from "@/lib/members/photo";

async function load() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) } as const;
  if (!session.memberId) return { error: NextResponse.json({ error: "No member record is linked to this account" }, { status: 404 }) } as const;
  const db = (await clientPromise).db("hockey-app");
  const memberKey = await resolveSessionMemberId(db, session);
  const existing = await db.collection("members").findOne({ memberId: memberKey });
  if (!existing) return { error: NextResponse.json({ error: "Member record not found" }, { status: 404 }) } as const;
  if (((existing.lockedFields as string[] | undefined) ?? []).includes("personalInfo.photoUrl")) {
    return { error: NextResponse.json({ error: "Your photo has been locked by your administrator" }, { status: 403 }) } as const;
  }
  return { session, db, memberKey, existing } as const;
}

async function apply(ctx: Exclude<Awaited<ReturnType<typeof load>>, { error: NextResponse }>, photoUrl: string | null) {
  const { session, db, memberKey, existing } = ctx;
  const now = new Date().toISOString();
  await db.collection("members").updateOne({ memberId: memberKey }, { $set: { "personalInfo.photoUrl": photoUrl, updatedAt: now } });
  await db.collection("member_change_logs").insertOne({
    memberId: memberKey,
    section: "self-service",
    // Don't store the image itself in the audit trail.
    changes: { "personalInfo.photoUrl": { old: existing.personalInfo?.photoUrl ? "(photo)" : null, new: photoUrl ? "(photo)" : null } },
    timestamp: now,
    updatedBy: session.email ?? session.userId,
    updatedByName: session.name,
    updatedAt: now,
    selfService: true,
  });
  return NextResponse.json({ success: true, photoUrl });
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await load();
    if ("error" in ctx) return ctx.error;
    const body = await request.json().catch(() => ({}));
    const v = validatePhotoDataUrl((body as { dataUrl?: unknown }).dataUrl);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    return await apply(ctx, v.value);
  } catch (e) {
    console.error("my-profile photo POST error:", e);
    return NextResponse.json({ error: "Failed to save photo" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const ctx = await load();
    if ("error" in ctx) return ctx.error;
    return await apply(ctx, null);
  } catch (e) {
    console.error("my-profile photo DELETE error:", e);
    return NextResponse.json({ error: "Failed to remove photo" }, { status: 500 });
  }
}
