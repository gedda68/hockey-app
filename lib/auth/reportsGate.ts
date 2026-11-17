// lib/auth/reportsGate.ts
// Who may open the club-level reporting pages (club health, delivery log): Reports read access from the matrix
// when it applies to them, otherwise the roles that run a club.

import type { Db } from "mongodb";
import type { SessionData } from "@/lib/auth/session";
import { accessForSession } from "@/lib/access/memberAccess";
import { decideArea } from "@/lib/access/areaAccess";
import { userCanAccessClubResource } from "@/lib/auth/resourceAccessDb";

export const REPORT_ROLES = new Set(["super-admin", "association-admin", "club-admin", "club-committee", "registrar"]);

export async function canViewReports(db: Db, session: SessionData): Promise<boolean> {
  const access = session.memberId ? await accessForSession(db, session).catch(() => null) : null;
  const d = decideArea(access, session.role, "reports", "R");
  return d.enforced ? d.allowed : REPORT_ROLES.has(String(session.role));
}

/** The club a report is for: the one asked for (if allowed), else the person's own. Null with a message when it can't be decided. */
export async function reportClub(session: SessionData, asked: string | null | undefined): Promise<{ clubId: string } | { error: string; status: number }> {
  const want = asked?.trim();
  const clubId = want || session.clubId || "";
  if (!clubId) return { error: "Choose a club first", status: 400 };
  if (want && want !== session.clubId && !(await userCanAccessClubResource(session, want))) return { error: "You can't use that club", status: 403 };
  return { clubId };
}
