// lib/awards/access.ts — who runs a club's awards, and which club someone belongs to.

import type { Db } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import type { SessionData } from "@/lib/auth/session";
import { accessForSession } from "@/lib/access/memberAccess";
import { decideArea } from "@/lib/access/areaAccess";
import { userCanAccessClubResource } from "@/lib/auth/resourceAccessDb";
import { resolveClubByIdOrSlug, type ResolvedClubRef } from "@/lib/volunteerDuty/resolveClub";

const LEGACY = new Set(["super-admin", "association-admin", "club-admin", "club-committee"]);

/** The committee: the Communications area at edit level, or a club/association admin by role. */
export async function canRunAwards(session: SessionData): Promise<boolean> {
  const db = await getDatabase();
  const access = session.memberId ? await accessForSession(db, session).catch(() => null) : null;
  const d = decideArea(access, session.role, "comms", "E");
  return d.enforced ? d.allowed : LEGACY.has(String(session.role));
}

export async function awardsClub(session: SessionData, db: Db, requested?: string | null): Promise<ResolvedClubRef | null> {
  if (!(await canRunAwards(session))) return null;
  const ref = String(requested || session.clubId || session.clubSlug || "").trim();
  const club = ref ? await resolveClubByIdOrSlug(db, ref) : null;
  if (!club || !(await userCanAccessClubResource(session, club.clubId))) return null;
  return club;
}
