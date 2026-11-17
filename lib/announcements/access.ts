// lib/announcements/access.ts
// Who may write announcements, and to which audiences.

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

