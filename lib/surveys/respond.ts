// lib/surveys/respond.ts
// Taking someone's answers. An invitation can be used once: it is marked done first, so a double click or two open
// tabs can't count twice. On an anonymous survey the response keeps no name and no time of day.

import { randomBytes } from "node:crypto";
import type { Db } from "mongodb";
import { INVITES, RESPONSES } from "@/lib/surveys/access";
import { cleanAnswers } from "@/lib/surveys/validate";
import type { Survey } from "@/lib/surveys/types";

export interface InviteDoc { inviteId: string; surveyId: string; memberId: string; token: string; status: string; onBehalfOf?: { memberId: string; name: string } }

/** What a person is shown: the questions, without anything about who else was asked. */
export function publicView(s: Survey, invite: Pick<InviteDoc, "status" | "onBehalfOf">) {
  return {
    surveyId: s.surveyId, title: s.title, intro: s.intro, thanks: s.thanks, anonymous: s.anonymous, closesAt: s.closesAt,
    subject: s.subject, purpose: s.purpose, questions: s.questions, status: s.status, alreadyAnswered: invite.status === "completed", declined: invite.status === "declined",
    onBehalfOf: invite.onBehalfOf?.name,
  };
}

export type SubmitResult = { ok: true } | { ok: false; error: string; status: number };

export async function submitResponse(db: Db, survey: Survey, invite: InviteDoc, rawAnswers: unknown, via: "app" | "email", now: Date = new Date()): Promise<SubmitResult> {
  if (survey.status !== "open" || Date.parse(survey.closesAt) <= now.getTime() || Date.parse(survey.opensAt) > now.getTime()) return { ok: false, error: "This survey isn't open for answers", status: 409 };
  if (invite.status === "completed") return { ok: false, error: "You've already answered this survey. Thank you!", status: 409 };
  const cleaned = cleanAnswers(survey.questions, rawAnswers);
  if (!cleaned.ok) return { ok: false, error: cleaned.error, status: 400 };

  const stamp = survey.anonymous ? `${now.toISOString().slice(0, 10)}T00:00:00.000Z` : now.toISOString();
  const claimed = await db.collection(INVITES).updateOne({ inviteId: invite.inviteId, status: { $in: ["pending", "declined"] } }, { $set: { status: "completed", completedAt: stamp, via } });
  if (!claimed.modifiedCount) return { ok: false, error: "You've already answered this survey. Thank you!", status: 409 };

  try {
    let memberName: string | undefined;
    if (!survey.anonymous) {
      const m = await db.collection("members").findOne({ memberId: invite.memberId }, { projection: { personalInfo: 1, firstName: 1, lastName: 1 } });
      memberName = `${m?.personalInfo?.firstName ?? m?.firstName ?? ""} ${m?.personalInfo?.lastName ?? m?.lastName ?? ""}`.trim() || undefined;
    }
    await db.collection(RESPONSES).insertOne({
      responseId: `RSP-${randomBytes(8).toString("hex")}`,
      surveyId: survey.surveyId,
      answers: cleaned.value,
      submittedAt: stamp,
      via,
      ...(survey.anonymous ? {} : { memberId: invite.memberId, ...(memberName ? { memberName } : {}), ...(invite.onBehalfOf ? { onBehalfOf: invite.onBehalfOf.name } : {}) }),
    });
  } catch (e) {
    await db.collection(INVITES).updateOne({ inviteId: invite.inviteId }, { $set: { status: "pending" }, $unset: { completedAt: "", via: "" } });
    throw e;
  }
  return { ok: true };
}

/** "Not now / don't ask me again": the pop-up stops, the survey stays under My surveys until it closes. */
export async function declineInvite(db: Db, invite: InviteDoc): Promise<void> {
  await db.collection(INVITES).updateOne({ inviteId: invite.inviteId, status: "pending" }, { $set: { status: "declined", declinedAt: new Date().toISOString() } });
}
