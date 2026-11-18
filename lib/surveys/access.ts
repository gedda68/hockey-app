// lib/surveys/access.ts
// Who may run surveys, and for which audiences. Same rules as announcements (Communications at edit level, or by
// login role), with "team" allowed to anyone who can reach that team's club.

import type { Db } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import type { SessionData } from "@/lib/auth/session";
import { canWriteTo, writableAudiences } from "@/lib/announcements/access";
import { userCanAccessClubResource } from "@/lib/auth/resourceAccessDb";
import type { SurveyLevel } from "@/lib/surveys/types";

export const COL = "surveys";
export const INVITES = "survey_invites";
export const RESPONSES = "survey_responses";

export async function surveyLevels(session: SessionData): Promise<SurveyLevel[] | null> {
  const a = await writableAudiences(session);
  if (!a) return null;
  return a.includes("club") ? [...a, "team"] : [...a];
}

export async function canRunSurveyAt(session: SessionData, level: SurveyLevel, scopeId: string, db?: Db): Promise<boolean> {
  if (level === "team") {
    const d = db ?? (await getDatabase());
    const team = await d.collection("teams").findOne({ teamId: scopeId }, { projection: { clubId: 1 } });
    return !!team?.clubId && userCanAccessClubResource(session, String(team.clubId));
  }
  return canWriteTo(session, level, scopeId);
}

/** The surveys this session may see and manage (its own club / association / teams; everything for a super-admin). */
export async function manageFilter(session: SessionData, db: Db): Promise<Record<string, unknown> | null> {
  if (session.role === "super-admin") return {};
  const or: Record<string, unknown>[] = [];
  if (session.clubId) {
    or.push({ level: "club", scopeId: session.clubId });
    const teams = await db.collection("teams").find({ clubId: session.clubId }, { projection: { teamId: 1 } }).limit(500).toArray();
    if (teams.length) or.push({ level: "team", scopeId: { $in: teams.map((t) => String(t.teamId)) } });
  }
  if (session.associationId) or.push({ level: "association", scopeId: session.associationId });
  return or.length ? { $or: or } : null;
}
