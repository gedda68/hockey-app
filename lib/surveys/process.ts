// lib/surveys/process.ts
// Running a survey: publishing it (working out who it goes to and giving each person a private link), sending the
// emails when it opens, the reminder before it closes, and closing it on time. Safe to run repeatedly.

import { randomBytes } from "node:crypto";
import type { Db } from "mongodb";
import { sendEmail } from "@/lib/email/client";
import { buildSurveyInviteEmail } from "@/lib/email/templates/surveyInvite";
import { resolveRespondents } from "@/lib/surveys/audience";
import { COL, INVITES } from "@/lib/surveys/access";
import type { Survey } from "@/lib/surveys/types";

const DAY = 86400000;
export const newToken = () => randomBytes(24).toString("base64url");
export const newSurveyId = () => `SRV-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Who is asking, shown in the email: the club or association, else the app. */
async function askedBy(db: Db, s: Survey): Promise<string> {
  try {
    if (s.level === "club") { const c = await db.collection("clubs").findOne({ $or: [{ id: s.scopeId }, { clubId: s.scopeId }, { slug: s.scopeId }] }, { projection: { name: 1 } }); if (c?.name) return String(c.name); }
    if (s.level === "association") { const a = await db.collection("associations").findOne({ associationId: s.scopeId }, { projection: { name: 1 } }); if (a?.name) return String(a.name); }
    if (s.level === "team") { const t = await db.collection("teams").findOne({ teamId: s.scopeId }, { projection: { name: 1, displayName: 1 } }); if (t) return String(t.displayName || t.name); }
  } catch { /* fall through */ }
  return s.createdByName || "Your hockey organisation";
}

/** Gives everyone in the audience their invitation. Only people without one yet are added, so it can be re-run. */
export async function createInvites(db: Db, s: Survey, now: Date = new Date()): Promise<{ added: number; total: number; capped: boolean }> {
  const { respondents, capped } = await resolveRespondents(db, s, now);
  const have = new Set((await db.collection(INVITES).find({ surveyId: s.surveyId }, { projection: { memberId: 1 } }).toArray()).map((i) => String(i.memberId)));
  const fresh = respondents.filter((r) => !have.has(r.memberId));
  if (fresh.length) {
    await db.collection(INVITES).insertMany(fresh.map((r) => ({
      inviteId: `INV-${randomBytes(8).toString("hex")}`,
      surveyId: s.surveyId,
      memberId: r.memberId,
      token: newToken(),
      ...(r.onBehalfOf ? { onBehalfOf: r.onBehalfOf } : {}),
      email: r.emailOk ? r.email : null,
      status: "pending",
      createdAt: now.toISOString(),
    })));
  }
  await db.collection(COL).updateOne({ surveyId: s.surveyId }, { $set: { invited: have.size + fresh.length, updatedAt: now.toISOString() } });
  return { added: fresh.length, total: have.size + fresh.length, capped };
}

async function emailBatch(db: Db, s: Survey, query: Record<string, unknown>, field: "emailedAt" | "remindedAt", reminder: boolean, budgetMs: number): Promise<{ sent: number; failed: number }> {
  const from = await askedBy(db, s);
  const started = Date.now();
  let sent = 0, failed = 0;
  const invites = await db.collection(INVITES).find({ surveyId: s.surveyId, status: "pending", email: { $ne: null }, ...query }).limit(500).toArray();
  for (const inv of invites) {
    if (Date.now() - started > budgetMs) break;
    const member = await db.collection("members").findOne({ memberId: inv.memberId }, { projection: { personalInfo: 1, firstName: 1 } });
    const mail = buildSurveyInviteEmail({
      name: String(member?.personalInfo?.firstName ?? member?.firstName ?? ""),
      title: s.title, intro: s.intro, fromName: from, token: String(inv.token), closesAt: s.closesAt, anonymous: s.anonymous,
      onBehalfOf: inv.onBehalfOf?.name, reminder,
    });
    const r = await sendEmail({ to: String(inv.email), ...mail });
    if (r.success) { sent++; await db.collection(INVITES).updateOne({ inviteId: inv.inviteId }, { $set: { [field]: new Date().toISOString() } }); }
    else { failed++; await db.collection(INVITES).updateOne({ inviteId: inv.inviteId }, { $set: { emailError: r.error ?? "failed" } }); }
  }
  return { sent, failed };
}

/** Opens scheduled surveys that are due, emails new invitations, sends reminders, closes surveys past their end. */
export async function processDueSurveys(db: Db, now: Date = new Date(), budgetMs = 40_000): Promise<{ opened: number; emailed: number; reminded: number; closed: number }> {
  const out = { opened: 0, emailed: 0, reminded: 0, closed: 0 };
  const iso = now.toISOString();

  const closing = await db.collection(COL).updateMany({ status: { $in: ["open", "scheduled"] }, closesAt: { $lte: iso } }, { $set: { status: "closed", closedAt: iso, updatedAt: iso } });
  out.closed = closing.modifiedCount;
  const opening = await db.collection(COL).updateMany({ status: "scheduled", opensAt: { $lte: iso }, closesAt: { $gt: iso } }, { $set: { status: "open", updatedAt: iso } });
  out.opened = opening.modifiedCount;

  const open = (await db.collection(COL).find({ status: "open" }, { projection: { _id: 0 } }).limit(100).toArray()) as unknown as Survey[];
  for (const s of open) {
    if (s.delivery?.email) {
      out.emailed += (await emailBatch(db, s, { emailedAt: { $exists: false } }, "emailedAt", false, budgetMs)).sent;
      if (s.remindDaysBefore && Date.parse(s.closesAt) - now.getTime() <= s.remindDaysBefore * DAY) {
        out.reminded += (await emailBatch(db, s, { remindedAt: { $exists: false }, emailedAt: { $exists: true } }, "remindedAt", true, budgetMs)).sent;
      }
    }
  }
  return out;
}
