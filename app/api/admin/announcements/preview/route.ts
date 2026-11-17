/**
 * POST /api/admin/announcements/preview   { level, scopeId?, targeting? }
 * How many people that announcement would reach, and on which channels. Same permissions as writing it.
 * Counts are for up to the first 5000 people in the audience (`capped` says when that limit applied).
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { canWriteTo, writableAudiences } from "@/lib/announcements/access";
import { AUDIENCES, type Audience } from "@/lib/announcements/validate";
import { cleanTargeting } from "@/lib/announcements/targeting";
import { estimateReach, type ReachMember } from "@/lib/announcements/reach";
import { guardianIdsFor, isMinor } from "@/lib/access/guardians";
import { memberBelongsToClubFilter } from "@/lib/rosters/memberClubQuery";

const LIMIT = 5000;
const PROJ = { memberId: 1, personalInfo: 1, family: 1, notificationPrefs: 1 };
const toReach = (m: any, guardianIds?: string[]): ReachMember => ({ memberId: String(m.memberId), dateOfBirth: m.personalInfo?.dateOfBirth, prefs: m.notificationPrefs, guardianIds });

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const audiences = await writableAudiences(session);
    if (!audiences) return NextResponse.json({ error: "You can't write announcements" }, { status: 403 });

    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const level = (AUDIENCES as readonly string[]).includes(String(b.level)) ? (String(b.level) as Audience) : null;
    const scopeId = level === "global" ? "" : String(b.scopeId ?? "").trim();
    if (!level || (level !== "global" && !scopeId)) return NextResponse.json({ error: "Choose who it's for" }, { status: 400 });
    if (!audiences.includes(level) || !(await canWriteTo(session, level, scopeId))) return NextResponse.json({ error: "You can't write to that audience" }, { status: 403 });

    const db = await getDatabase();
    const targeting = level === "global" ? null : cleanTargeting(b.targeting);

    let filter: Record<string, unknown> = { "membership.status": { $nin: ["Inactive", "inactive"] } };
    if (level === "club") filter = { $and: [memberBelongsToClubFilter(scopeId), filter] };
    else if (level === "association") {
      const clubs = await db.collection("clubs").find({ parentAssociationId: scopeId }, { projection: { id: 1, clubId: 1, slug: 1 } }).toArray();
      const refs = [...new Set(clubs.flatMap((c) => [c.id, c.clubId, c.slug]).filter(Boolean).map(String))];
      filter = { $and: [{ $or: [{ "membership.associationId": scopeId }, { associationId: scopeId }, { "membership.clubId": { $in: refs } }, { clubId: { $in: refs } }] }, filter] };
    }
    const members = await db.collection("members").find(filter, { projection: PROJ }).limit(LIMIT + 1).toArray();
    const capped = members.length > LIMIT;
    const scopeDocs = members.slice(0, LIMIT);

    let rosterIds: Set<string> | undefined;
    if (targeting?.teamIds.length) {
      const teams = await db.collection("teams").find({ teamId: { $in: targeting.teamIds } }, { projection: { roster: 1 } }).toArray();
      rosterIds = new Set(teams.flatMap((t) => ((t.roster ?? []) as { memberId?: string }[]).map((r) => String(r.memberId))));
    }

    // Guardians only matter for the juniors the announcement is aimed at.
    const others = new Map<string, ReachMember>();
    const reachMembers: ReachMember[] = [];
    for (const m of scopeDocs) {
      let guardianIds: string[] | undefined;
      const aimedAt = !!targeting && targeting.includeGuardians && isMinor(m.personalInfo?.dateOfBirth) && (!targeting.teamIds.length || rosterIds?.has(String(m.memberId)));
      if (aimedAt) guardianIds = await guardianIdsFor(db, m).catch(() => []);
      reachMembers.push(toReach(m, guardianIds));
    }
    const need = [...new Set(reachMembers.flatMap((m) => m.guardianIds ?? []))].filter((id) => !reachMembers.some((m) => m.memberId === id));
    if (need.length) for (const g of await db.collection("members").find({ memberId: { $in: need } }, { projection: PROJ }).toArray()) others.set(String(g.memberId), toReach(g));

    return NextResponse.json({ ...estimateReach({ level, targeting, scope: reachMembers, rosterIds, others }), capped });
  } catch (e) {
    console.error("announcement preview error:", e);
    return NextResponse.json({ error: "Couldn't work that out" }, { status: 500 });
  }
}
