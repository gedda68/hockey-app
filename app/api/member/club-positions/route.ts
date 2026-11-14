/**
 * GET  /api/member/club-positions   — open club position windows at the member's club, with eligibility
 * POST /api/member/club-positions   { windowId, statement? } — self-nominate for one
 * Positions: coaching, assistant coaching, admin, committee, management, umpiring.
 */

import { NextRequest, NextResponse } from "next/server";
import type { Db } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { classifyPosition, evaluateClubPosition, KIND_LABELS } from "@/lib/nominations/clubPositions";

type Doc = Record<string, any>;

async function loadMember(db: Db, session: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  const memberKey = await resolveSessionMemberId(db, session);
  const member = await db.collection("members").findOne({ memberId: memberKey });
  return { memberKey, member };
}

/** Every id/slug a club may be referred to by, so windows match however scopeId was stored. */
async function clubRefs(db: Db, member: Doc): Promise<{ refs: string[]; name: string }> {
  const ref = String(member.membership?.clubId ?? member.clubId ?? "");
  if (!ref) return { refs: [], name: "" };
  const club = await db.collection("clubs").findOne({ $or: [{ id: ref }, { clubId: ref }, { slug: ref }] });
  const refs = [ref, club?.id, club?.clubId, club?.slug, club?._id ? String(club._id) : undefined]
    .filter(Boolean).map(String);
  return { refs: Array.from(new Set(refs)), name: club?.name ? String(club.name) : "" };
}

const openQuery = (refs: string[]) => {
  const today = new Date().toISOString().split("T")[0];
  return { category: "club-position", scopeType: "club", scopeId: { $in: refs }, status: "open", openDate: { $lte: today }, closeDate: { $gte: today } };
};

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    if (!session.memberId) return NextResponse.json({ error: "No member record is linked to this account" }, { status: 404 });

    const db = (await clientPromise).db("hockey-app");
    const { memberKey, member } = await loadMember(db, session);
    if (!member) return NextResponse.json({ error: "Member record not found" }, { status: 404 });

    const { refs, name } = await clubRefs(db, member);
    if (refs.length === 0) return NextResponse.json({ clubName: "", positions: [] });

    const wins = await db.collection("nomination_windows").find(openQuery(refs)).sort({ closeDate: 1 }).toArray();
    const mine = await db.collection("rep_nominations")
      .find({ memberId: memberKey, windowId: { $in: wins.map((w) => w.windowId) }, status: { $ne: "withdrawn" } }).toArray();
    const nominated = new Set(mine.map((n) => n.windowId));

    const positions = wins.map((w) => {
      const verdict = evaluateClubPosition({ dateOfBirth: member.personalInfo?.dateOfBirth }, w as Doc, parseInt(String(w.seasonYear), 10) || new Date().getFullYear());
      const done = nominated.has(w.windowId);
      return {
        windowId: w.windowId,
        title: w.title,
        positionTitle: w.positionTitle ?? w.title,
        kind: verdict.kind,
        kindLabel: KIND_LABELS[verdict.kind],
        description: w.description ?? "",
        seasonYear: w.seasonYear,
        closeDate: w.closeDate,
        requiresStatement: !!w.requiresStatement,
        workflow: w.workflow,
        allowed: verdict.allowed && !done,
        alreadyNominated: done,
        reason: done ? "Already nominated" : verdict.reason,
      };
    });
    return NextResponse.json({ clubName: name, positions });
  } catch (e) {
    console.error("club-positions GET error:", e);
    return NextResponse.json({ error: "Failed to load club positions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    if (!session.memberId) return NextResponse.json({ error: "No member record is linked to this account" }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as { windowId?: string; statement?: string };
    const windowId = String(body.windowId ?? "").trim();
    if (!windowId) return NextResponse.json({ error: "windowId is required" }, { status: 400 });

    const db = (await clientPromise).db("hockey-app");
    const { memberKey, member } = await loadMember(db, session);
    if (!member) return NextResponse.json({ error: "Member record not found" }, { status: 404 });

    const { refs } = await clubRefs(db, member);
    const win = refs.length ? await db.collection("nomination_windows").findOne({ windowId, ...openQuery(refs) }) : null;
    if (!win) return NextResponse.json({ error: "That position isn't open for nomination at your club" }, { status: 409 });

    if (win.requiresStatement && !String(body.statement ?? "").trim()) {
      return NextResponse.json({ error: "A short statement is required for this position" }, { status: 400 });
    }

    const season = String(win.seasonYear ?? new Date().getFullYear());
    const verdict = evaluateClubPosition({ dateOfBirth: member.personalInfo?.dateOfBirth }, win as Doc, parseInt(season, 10));
    if (!verdict.allowed) return NextResponse.json({ error: verdict.reason ?? "You can't nominate for this position" }, { status: 403 });

    if (win.requiresFinancialMembership) {
      const reg = await db.collection("registrations").findOne({ memberId: memberKey, status: { $in: ["active", "financial"] }, seasonYear: season });
      const fin = reg ?? (await db.collection("members").findOne({ memberId: memberKey, "membership.status": { $in: ["financial", "active", "Active"] } }));
      if (!fin) return NextResponse.json({ error: "A current financial membership is required for this position" }, { status: 422 });
    }

    const dup = await db.collection("rep_nominations").findOne({ windowId, memberId: memberKey, status: { $ne: "withdrawn" } });
    if (dup) return NextResponse.json({ error: "You have already nominated for this position" }, { status: 409 });

    const dob = String(member.personalInfo?.dateOfBirth ?? "");
    const name = `${member.personalInfo?.firstName ?? ""} ${member.personalInfo?.lastName ?? ""}`.trim();
    const now = new Date().toISOString();
    const nomination = {
      nominationId: `nom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      windowId,
      season,
      ageGroup: win.ageGroup ?? "",
      clubId: win.scopeId,
      clubName: win.scopeName,
      nomineeId: memberKey,
      nomineeName: name,
      nomineeType: "member",
      memberId: memberKey,
      memberName: name,
      dateOfBirth: dob,
      ageAtSeason: dob ? parseInt(season, 10) - new Date(dob).getFullYear() : 0,
      nominatedBy: memberKey,
      nominatedByName: name,
      nomineeAccepted: true,
      ...(String(body.statement ?? "").trim() ? { statement: String(body.statement).trim().slice(0, 2000) } : {}),
      status: "pending",
      nominatedAt: now,
      updatedAt: now,
      nominationType: "club-position",
      role: classifyPosition(win as Doc),
    };
    await db.collection("rep_nominations").insertOne(nomination);
    return NextResponse.json({ success: true, nomination }, { status: 201 });
  } catch (e) {
    console.error("club-positions POST error:", e);
    return NextResponse.json({ error: "Failed to submit nomination" }, { status: 500 });
  }
}
