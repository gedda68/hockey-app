// lib/rsvp/access.ts
// Who may ask a squad about availability: the staff of the team (coach, manager) and club or association admins who
// can reach that team's club. Same rule as running a team survey.

import type { Db } from "mongodb";
import type { SessionData } from "@/lib/auth/session";
import { canRunSurveyAt } from "@/lib/surveys/access";
import { teamsStaffedBy } from "@/lib/surveys/teamStaff";
import { writableAudiences } from "@/lib/announcements/access";
import { clubRefsUnder, descendantAssociationIds } from "@/lib/surveys/audience";

export const REQUESTS = "rsvp_requests";
export const INVITES = "rsvp_invites";

export const canManageTeam = (session: SessionData, teamId: string, db: Db) => canRunSurveyAt(session, "team", teamId, db);

/** The teams this person can ask: the ones they coach or manage, plus every team in their club (or association). */
export async function manageableTeams(session: SessionData, db: Db): Promise<{ teamId: string; clubId: string; name: string }[]> {
  const staffed = await teamsStaffedBy(session, db);
  const wide = session.role === "super-admin" || !!(await writableAudiences(session))?.includes("club");
  const or: Record<string, unknown>[] = [];
  if (staffed.length) or.push({ teamId: { $in: staffed } });
  if (wide) {
    if (session.role === "super-admin") or.push({});
    else if (session.clubId) or.push({ clubId: session.clubId });
    else if (session.associationId) {
      const assoc = await db.collection("associations").find({}, { projection: { associationId: 1, parentAssociationId: 1 } }).limit(500).toArray();
      const refs = await clubRefsUnder(db, descendantAssociationIds(assoc as never, session.associationId));
      if (refs.length) or.push({ clubId: { $in: refs } });
    }
  }
  if (!or.length) return [];
  const rows = await db.collection("teams").find({ $or: or, status: { $ne: "archived" } }, { projection: { teamId: 1, clubId: 1, name: 1, displayName: 1 } }).limit(500).toArray();
  return rows.map((t) => ({ teamId: String(t.teamId), clubId: String(t.clubId ?? ""), name: String(t.displayName || t.name || t.teamId) }));
}
