// lib/announcements/access.ts
// Who may write announcements, and to which audiences.

import type { Db } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import type { SessionData } from "@/lib/auth/session";
import { accessForSession } from "@/lib/access/memberAccess";
import { decideArea } from "@/lib/access/areaAccess";
import { userCanAccessAssociationResource, userCanAccessClubResource } from "@/lib/auth/resourceAccessDb";
import { legacyAudiences, type Audience } from "@/lib/announcements/validate";

export const COL = "announcements";

/** The audiences this session may write to, or null when it may not write at all. */
export async function writableAudiences(session: SessionData): Promise<Audience[] | null> {
  const db = await getDatabase();
  const access = session.memberId ? await accessForSession(db, session).catch(() => null) : null;
  const d = decideArea(access, session.role, "comms", "E");
  if (d.enforced) {
    if (!d.allowed) return null;
    // Matrix roles write to their own club or association; only a super-admin reaches everyone.
    return session.role === "super-admin" ? ["global", "association", "club"] : ["association", "club"];
  }
  const a = legacyAudiences(session.role);
  return a.length ? a : null;
}

/** Whether this audience and scope is one the person may write to. */
export async function canWriteTo(session: SessionData, level: Audience, scopeId: string): Promise<boolean> {
  if (level === "global") return session.role === "super-admin";
  if (level === "association") return userCanAccessAssociationResource(session, scopeId);
  return userCanAccessClubResource(session, scopeId);
}


/** Every team named must belong to the club (or to a club in the association) the announcement is for. */
export async function teamsBelongTo(db: Db, teamIds: string[], level: Audience, scopeId: string): Promise<boolean> {
  if (level === "global") return false;
  const teams = await db.collection("teams").find({ teamId: { $in: teamIds } }, { projection: { teamId: 1, clubId: 1 } }).toArray();
  if (teams.length !== new Set(teamIds).size) return false;
  if (level === "club") return teams.every((t) => String(t.clubId) === scopeId);
  const clubIds = [...new Set(teams.map((t) => String(t.clubId)))];
  const clubs = await db.collection("clubs").find({ $or: [{ id: { $in: clubIds } }, { clubId: { $in: clubIds } }, { slug: { $in: clubIds } }], parentAssociationId: scopeId }, { projection: { id: 1, clubId: 1, slug: 1 } }).toArray();
  const ok = new Set(clubs.flatMap((c) => [c.id, c.clubId, c.slug].filter(Boolean).map(String)));
  return clubIds.every((id) => ok.has(id));
}
