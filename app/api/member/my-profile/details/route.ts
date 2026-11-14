/**
 * PATCH /api/member/my-profile/details
 * Self-service edits to the wider profile: personal preferences, emergency contacts, healthcare,
 * medical details and blue card. Scoped to the signed-in member's own record; admin field locks
 * (member.lockedFields) are honoured; every change is written to member_change_logs.
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { sanitizeSelfDetails, blockedByLocks } from "@/lib/members/selfDetails";
import { applyBlueCardUpdate, memberClubId } from "@/lib/members/blueCardWorkflow";
import { notifyBlueCardVerifier } from "@/lib/notifications/blueCardVerification";

function pick(doc: any, path: string): unknown {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), doc);
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    if (!session.memberId) {
      return NextResponse.json({ error: "No member record is linked to this account" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const db = (await clientPromise).db("hockey-app");
    const memberKey = await resolveSessionMemberId(db, session);
    const existing = await db.collection("members").findOne({ memberId: memberKey });
    if (!existing) return NextResponse.json({ error: "Member record not found" }, { status: 404 });

    const { $set, touched, errors } = sanitizeSelfDetails(body, existing);
    if (errors.length) return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
    if (touched.length === 0) return NextResponse.json({ error: "No recognised fields supplied" }, { status: 400 });

    const locked = (existing.lockedFields as string[] | undefined) ?? [];
    const blocked = blockedByLocks(touched, locked);
    if (blocked.length) {
      return NextResponse.json(
        { error: `These fields are locked by your administrator: ${blocked.join(", ")}`, lockedFields: blocked },
        { status: 403 },
      );
    }

    // Blue card goes through the verification workflow as a non-verifier.
    let notify: string | null = null;
    const incomingCard = $set.__blueCardIncoming as Record<string, unknown> | undefined;
    delete $set.__blueCardIncoming;
    if (incomingCard) {
      const result = applyBlueCardUpdate({
        existing: existing.blueCard,
        incoming: incomingCard,
        canVerify: false,
        actor: { role: session.role, memberId: memberKey, name: session.name, clubId: session.clubId },
      });
      $set.blueCard = result.blueCard;
      if (result.notifyVerifier && result.verifierMemberId) notify = result.verifierMemberId;
    }

    const changes: Record<string, { old: unknown; new: unknown }> = {};
    for (const [path, val] of Object.entries($set)) {
      const old = pick(existing, path);
      if (JSON.stringify(old ?? null) !== JSON.stringify(val ?? null)) {
        changes[path] = { old: old ?? null, new: val ?? null };
      }
    }
    if (Object.keys(changes).length === 0) {
      return NextResponse.json({ message: "No changes detected", member: existing });
    }

    const now = new Date().toISOString();
    await db.collection("members").updateOne({ memberId: memberKey }, { $set: { ...$set, updatedAt: now } });
    await db.collection("member_change_logs").insertOne({
      memberId: memberKey,
      section: "self-service",
      changes,
      timestamp: now,
      updatedBy: session.email ?? session.userId,
      updatedByName: session.name,
      updatedAt: now,
      selfService: true,
    });

    if (notify) {
      try {
        const club = await db.collection("clubs").findOne({ $or: [{ id: memberClubId(existing) }, { clubId: memberClubId(existing) }] });
        await notifyBlueCardVerifier(db, {
          member: { ...existing, memberId: memberKey },
          verifierMemberId: notify,
          requestedBy: session.name || undefined,
          clubName: club?.name ? String(club.name) : undefined,
        });
      } catch (e) {
        console.error("Blue card verification notice failed", e);
      }
    }

    const updated = await db.collection("members").findOne({ memberId: memberKey });
    return NextResponse.json({ success: true, member: updated });
  } catch (error) {
    console.error("my-profile details PATCH error:", error);
    return NextResponse.json({ error: "Failed to update details" }, { status: 500 });
  }
}
