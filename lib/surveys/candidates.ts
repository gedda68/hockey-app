// lib/surveys/candidates.ts
// An open survey you haven't answered, as a notification (and, for pop-up surveys, a flag the pop-up looks for). Pure.

import type { Candidate } from "@/lib/notifications/candidates";
import type { Level } from "@/lib/notifications/prefs";

export interface SurveyInviteLike {
  surveyId: string;
  title: string;
  intro?: string;
  level: "global" | "association" | "club" | "team";
  scopeId?: string;
  opensAt: string;
  closesAt: string;
  status: string;
  anonymous?: boolean;
  inApp?: boolean;
  popup?: boolean;
  /** Who the survey is about when answered for a child ("on behalf of Sam"). */
  onBehalfOf?: string;
}

const levelOf = (l: SurveyInviteLike["level"]): Level => (l === "team" ? "club" : l);

export function surveyCandidates(rows: SurveyInviteLike[], now: Date): Candidate[] {
  const out: Candidate[] = [];
  for (const s of rows) {
    if (s.status !== "open" || s.inApp === false && !s.popup) continue;
    const opens = Date.parse(s.opensAt), closes = Date.parse(s.closesAt);
    if (Number.isNaN(opens) || Number.isNaN(closes) || opens > now.getTime() || closes <= now.getTime()) continue;
    const closing = new Date(closes).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Brisbane" });
    out.push({
      dedupeKey: `survey:${s.surveyId}`,
      level: levelOf(s.level),
      category: "surveys",
      type: "survey",
      title: s.onBehalfOf ? `Survey for ${s.onBehalfOf}: ${s.title}` : `Survey: ${s.title}`,
      message: `${s.anonymous ? "Anonymous. " : ""}Takes a few minutes. Closes ${closing}.`,
      link: `/admin/my-surveys/${encodeURIComponent(s.surveyId)}`,
      eventAt: new Date(closes).toISOString(),
      expiresAt: new Date(closes).toISOString(),
      ...(s.level === "club" && s.scopeId ? { clubId: s.scopeId } : {}),
    });
  }
  return out;
}
