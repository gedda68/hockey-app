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

    // Linked related people must be real members (never yourself); their stored name is authoritative.
    const related = $set["personalInfo.relatedMembers"] as Record<string, any>[] | undefined;
    if (related) {
      const ids = related.map((r) => r.memberId).filter(Boolean) as string[];
      if (ids.includes(memberKey)) return NextResponse.json({ error: "You can't list yourself as a related person" }, { status: 400 });
      if (ids.length) {
        const found = await db.collection("members")
          .find({ memberId: { $in: ids } }, { projection: { memberId: 1, personalInfo: 1 } }).toArray();
        const names = new Map(found.map((m) => [m.memberId, `${m.personalInfo?.firstName ?? ""} ${m.personalInfo?.lastName ?? ""}`.trim()]));
        const clubOf = new Map(found.map((m) => [m.memberId, String(m.membership?.clubId ?? m.clubId ?? "")]));
        for (const r of related) {
          if (!r.memberId) continue;
          if (!names.has(r.memberId)) return NextResponse.json({ error: `Member ${r.memberId} was not found` }, { status: 400 });
          r.name = names.get(r.memberId) || r.name;
          r.clubId = clubOf.get(r.memberId) || r.clubId; // a linked person's club is authoritative
        }
      }
      // Same club → just name + relationship. Other club → club name and city inherited from the club record.
      const ownClub = String(existing.membership?.clubId ?? existing.clubId ?? "");
      const clubIds = [...new Set(related.map((r) => r.clubId).filter((c) => c && c !== ownClub))] as string[];
      const clubDocs = clubIds.length
        ? await db.collection("clubs").find({ id: { $in: clubIds } }, { projection: { _id: 0, id: 1, name: 1, city: 1, suburb: 1 } }).toArray()
        : [];
      const clubInfo = new Map(clubDocs.map((c) => [String(c.id), { clubName: String(c.name ?? ""), city: String(c.city ?? c.suburb ?? "") }]));
      for (const r of related) {
        const info = r.clubId && r.clubId !== ownClub ? clubInfo.get(r.clubId) : undefined;
        if (info) Object.assign(r, info);
        else { delete r.clubId; delete r.clubName; delete r.city; }
      }
    }

    // A linked emergency contact must be a real member (never yourself).
    const ecs = $set.emergencyContacts as Record<string, any>[] | undefined;
    if (ecs) {
      const ids = ecs.map((c) => c.memberId).filter(Boolean) as string[];
      if (ids.includes(memberKey)) return NextResponse.json({ error: "You can't list yourself as your emergency contact" }, { status: 400 });
      if (ids.length) {
        const found = await db.collection("members").find({ memberId: { $in: ids } }, { projection: { memberId: 1 } }).toArray();
        const ok = new Set(found.map((m) => m.memberId));
        for (const c of ecs) if (c.memberId && !ok.has(c.memberId)) delete c.memberId; // fall back to a manual entry
      }
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
