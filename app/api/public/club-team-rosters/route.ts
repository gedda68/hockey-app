// GET /api/public/club-team-rosters?clubId=&season=
// Unauthenticated: coaching staff only, contacts respect showEmail/showPhone (G3).

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import {
  mapTeamsStaffForPublic,
  type MemberContactForPublic,
} from "@/lib/coaching/publicStaffContact";

function isProbablyObjectId(s: string): boolean {
  return /^[a-f0-9]{24}$/i.test(s);
}

async function loadMemberContactsMap(
  db: import("mongodb").Db,
  rawIds: string[],
  clubId: string,
): Promise<Map<string, MemberContactForPublic>> {
  const unique = [...new Set(rawIds.map((x) => x.trim()).filter(Boolean))];
  const map = new Map<string, MemberContactForPublic>();
  if (unique.length === 0) return map;

  const or: Record<string, unknown>[] = [];
  for (const id of unique) {
    or.push({ memberId: id });
    if (isProbablyObjectId(id)) {
      try {
        or.push({ _id: new ObjectId(id) });
      } catch {
        /* ignore */
      }
    }
  }

  const docs = await db
    .collection("members")
    .find({ clubId, $or: or })
    .project({
      memberId: 1,
      "contact.primaryEmail": 1,
      "contact.email": 1,
      "contact.mobile": 1,
      "contact.phone": 1,
      primaryEmail: 1,
    })
    .toArray();

  const contactFrom = (rec: Record<string, unknown>): MemberContactForPublic => {
    const c = rec.contact as Record<string, unknown> | undefined;
    const email =
      (typeof c?.primaryEmail === "string" && c.primaryEmail.trim()) ||
      (typeof c?.email === "string" && c.email.trim()) ||
      (typeof rec.primaryEmail === "string" && rec.primaryEmail.trim()) ||
      null;
    const phone =
      (typeof c?.mobile === "string" && c.mobile.trim()) ||
      (typeof c?.phone === "string" && c.phone.trim()) ||
      null;
    return { email, phone };
  };

  for (const d of docs) {
    const rec = d as Record<string, unknown>;
    const cont = contactFrom(rec);
    const mid = typeof rec.memberId === "string" ? rec.memberId : "";
    const idStr = d._id?.toString?.() ?? "";
    if (mid) map.set(mid, cont);
    if (idStr) map.set(idStr, cont);
  }
  return map;
}

function collectStaffMemberIds(teams: unknown): string[] {
  const ids: string[] = [];
  if (!Array.isArray(teams)) return ids;
  for (const t of teams) {
    if (!t || typeof t !== "object") continue;
    const staff = (t as Record<string, unknown>).staff;
    if (!Array.isArray(staff)) continue;
    for (const s of staff) {
      if (s && typeof s === "object" && typeof (s as { memberId?: string }).memberId === "string") {
        ids.push((s as { memberId: string }).memberId);
      }
    }
  }
  return ids;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clubParam = searchParams.get("clubId")?.trim();
    const season = searchParams.get("season")?.trim() || null;

    if (!clubParam) {
      return NextResponse.json({ error: "clubId is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const club = await db.collection("clubs").findOne({
      $or: [{ id: clubParam }, { slug: clubParam }],
    });
    if (!club || typeof club.id !== "string") {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }
    const canonicalClubId = club.id;

    const q: Record<string, unknown> = { clubId: canonicalClubId };
    if (season) q.season = season;

    const rosterDocs = await db
      .collection("teamRosters")
      .find(q)
      .project({
        id: 1,
        clubId: 1,
        clubName: 1,
        division: 1,
        category: 1,
        gender: 1,
        season: 1,
        teams: 1,
      })
      .toArray();

    const allIds: string[] = [];
    for (const r of rosterDocs) {
      allIds.push(...collectStaffMemberIds(r.teams));
    }
    const memberMap = await loadMemberContactsMap(db, allIds, canonicalClubId);

    const rosters = rosterDocs.map((r) => ({
      rosterId: r.id,
      clubId: r.clubId,
      clubName: r.clubName ?? null,
      division: r.division ?? null,
      category: r.category ?? null,
      gender: r.gender ?? null,
      season: r.season ?? null,
      teams: mapTeamsStaffForPublic(r.teams, memberMap),
    }));

    return NextResponse.json(
      { clubId: canonicalClubId, season, rosters },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (e: unknown) {
    console.error("GET /api/public/club-team-rosters:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
