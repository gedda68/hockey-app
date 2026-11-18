// lib/volunteers/access.ts
// Who runs a club's volunteer shifts, and which club a volunteer belongs to.

import type { Db } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import type { SessionData } from "@/lib/auth/session";
import { accessForSession } from "@/lib/access/memberAccess";
import { decideArea } from "@/lib/access/areaAccess";
import { userCanAccessClubResource } from "@/lib/auth/resourceAccessDb";
import { resolveClubByIdOrSlug, type ResolvedClubRef } from "@/lib/volunteerDuty/resolveClub";

export const SHIFTS = "volunteer_shifts";
export const SIGNUPS = "volunteer_signups";

const LEGACY_COORDINATORS = new Set(["super-admin", "association-admin", "club-admin", "club-committee"]);

/** Whether this person can create and manage shifts (the Volunteers & Rosters area at edit level, or a club/association admin by role). */
export async function canCoordinate(session: SessionData): Promise<boolean> {
  const db = await getDatabase();
  const access = session.memberId ? await accessForSession(db, session).catch(() => null) : null;
  const d = decideArea(access, session.role, "volunteers", "E");
  return d.enforced ? d.allowed : LEGACY_COORDINATORS.has(String(session.role));
}

/** The club this coordinator is working in: the one asked for (when they can reach it), else their own. */
export async function coordinatedClub(session: SessionData, db: Db, requested?: string | null): Promise<ResolvedClubRef | null> {
  if (!(await canCoordinate(session))) return null;
  const ref = String(requested || session.clubId || session.clubSlug || "").trim();
  const club = ref ? await resolveClubByIdOrSlug(db, ref) : null;
  if (!club || !(await userCanAccessClubResource(session, club.clubId))) return null;
  return club;
}

/** The club a member belongs to, in the same canonical form shifts use. */
export async function clubOfMember(db: Db, memberId: string): Promise<ResolvedClubRef | null> {
  const m = await db.collection("members").findOne({ memberId }, { projection: { membership: 1, clubId: 1 } });
  const ref = String(m?.membership?.clubId ?? m?.clubId ?? "").trim();
  return ref ? resolveClubByIdOrSlug(db, ref) : null;
}
