// lib/rsvp/process.ts
// Asking a squad: who gets asked (the team's players; a junior's parents), the emails, the reminders to people who
// haven't answered, and closing requests when the match starts. Safe to run repeatedly.

import { randomBytes } from "node:crypto";
import type { Db } from "mongodb";
import { sendEmail } from "@/lib/email/client";
import { buildRsvpEmail } from "@/lib/email/templates/rsvpRequest";
import { guardianIdsFor, isMinor } from "@/lib/access/guardians";
import { isPlayerRole } from "@/lib/clubs/clubPortalData";
import { dueReminder, matchStartMs, type RsvpInput } from "@/lib/rsvp/logic";
import { INVITES, REQUESTS } from "@/lib/rsvp/access";

export const newToken = () => randomBytes(24).toString("base64url");
export const newRequestId = () => `RSVP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const nameOf = (m: any) => `${m.personalInfo?.firstName ?? m.firstName ?? ""} ${m.personalInfo?.lastName ?? m.lastName ?? ""}`.trim();
const firstOf = (m: any) => String(m.personalInfo?.firstName ?? m.firstName ?? "").trim();
const emailOf = (m: any) => String(m.contact?.primaryEmail ?? m.contact?.email ?? "").trim();
const emailOk = (m: any) => m.notificationPrefs?.enabled !== false;

export const whenText = (matchDate: string, startsAt?: string | null) => {
  const d = new Date(startsAt ?? `${matchDate}T00:00:00+10:00`);
  const day = d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "Australia/Brisbane" });
  return startsAt ? `${day}, ${d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Brisbane" })}` : day;
};

/** Players on a team: roster entries that are participants (not coaches, managers or officials). */
export async function squadPlayers(db: Db, teamId: string): Promise<{ memberId: string }[]> {
  const team = await db.collection("teams").findOne({ teamId }, { projection: { roster: 1 } });
  const seen = new Set<string>();
  const out: { memberId: string }[] = [];
  for (const r of ((team?.roster ?? []) as { memberId?: string; roleId?: string; roleCategory?: string; status?: string }[])) {
    const id = String(r.memberId ?? "");
    if (!id || seen.has(id)) continue;
    if (String(r.status ?? "").toLowerCase() === "inactive") continue;
    if (r.roleCategory === "Participant" || isPlayerRole(String(r.roleId ?? ""))) { seen.add(id); out.push({ memberId: id }); }
  }
  return out;
}

/** Gives every player on the team an invitation they can answer. Players who already have one are left alone, so it can be re-run for late additions. */
export async function createInvites(db: Db, req: { requestId: string; teamId: string }, now: Date = new Date()): Promise<{ added: number; total: number }> {
  const players = await squadPlayers(db, req.teamId);
  const have = new Set((await db.collection(INVITES).find({ requestId: req.requestId }, { projection: { playerId: 1 } }).toArray()).map((i) => String(i.playerId)));
  const fresh = players.filter((p) => !have.has(p.memberId));
  if (fresh.length) {
    const members = await db.collection("members").find({ memberId: { $in: fresh.map((p) => p.memberId) } }, { projection: { memberId: 1, personalInfo: 1, firstName: 1, lastName: 1, contact: 1, notificationPrefs: 1, family: 1, relatedPersons: 1, guardians: 1 } }).toArray();
    const byId = new Map(members.map((m: any) => [String(m.memberId), m]));
    const docs: Record<string, unknown>[] = [];
    for (const p of fresh) {
      const m: any = byId.get(p.memberId);
      if (!m) continue;
      let notify = [p.memberId];
      let emails = emailOk(m) && emailOf(m) ? [emailOf(m)] : [];
      let parentView = false;
      if (isMinor(m.personalInfo?.dateOfBirth, now)) {
        const gids = await guardianIdsFor(db, m).catch(() => [] as string[]);
        if (gids.length) {
          const guardians = await db.collection("members").find({ memberId: { $in: gids } }, { projection: { memberId: 1, contact: 1, notificationPrefs: 1 } }).toArray();
          notify = gids;
          emails = [...new Set(guardians.filter(emailOk).map(emailOf).filter(Boolean))];
          parentView = true;
        }
      }
      docs.push({ inviteId: `RINV-${randomBytes(8).toString("hex")}`, requestId: req.requestId, playerId: p.memberId, playerName: nameOf(m) || p.memberId, notify, emails, parentView, token: newToken(), status: "pending", remindersSent: 0, createdAt: now.toISOString() });
    }
    if (docs.length) await db.collection(INVITES).insertMany(docs);
  }
  const total = await db.collection(INVITES).countDocuments({ requestId: req.requestId });
  await db.collection(REQUESTS).updateOne({ requestId: req.requestId }, { $set: { invited: total, updatedAt: now.toISOString() } });
  return { added: fresh.length, total };
}

export async function createRequest(db: Db, input: RsvpInput, team: { teamId: string; clubId: string; name: string }, by: { id: string; name: string }, now: Date = new Date()) {
  const requestId = newRequestId();
  const doc = { requestId, teamId: team.teamId, clubId: team.clubId, teamName: team.name, ...input, status: "open", invited: 0, createdBy: by.id, createdByName: by.name, createdAt: now.toISOString() };
  await db.collection(REQUESTS).insertOne({ ...doc });
  const { total } = await createInvites(db, { requestId, teamId: team.teamId }, now);
  return { requestId, invited: total };
}

type Req = { requestId: string; title: string; teamName: string; matchDate: string; startsAt?: string | null; venue?: string; note?: string; status: string; createdAt: string };

async function sendOne(db: Db, req: Req, inv: any, reminder: boolean): Promise<boolean> {
  if (!inv.emails?.length) return false;
  let ok = false;
  const recipients = await db.collection("members").find({ memberId: { $in: inv.notify } }, { projection: { memberId: 1, personalInfo: 1, firstName: 1, contact: 1 } }).toArray();
  const firstByEmail = new Map(recipients.map((m: any) => [emailOf(m), firstOf(m)]));
  for (const to of inv.emails as string[]) {
    const mail = buildRsvpEmail({ name: firstByEmail.get(to) ?? "", title: req.title, whenText: whenText(req.matchDate, req.startsAt), venue: req.venue, note: req.note, teamName: req.teamName, token: String(inv.token), forChild: inv.parentView ? String(inv.playerName).split(" ")[0] : undefined, reminder });
    const r = await sendEmail({ to, ...mail });
    ok = r.success || ok;
  }
  return ok;
}

/** Emails the first ask to everyone who hasn't had it. */
export async function sendFirstAsk(db: Db, requestId: string, budgetMs = 30_000): Promise<number> {
  const req = (await db.collection(REQUESTS).findOne({ requestId }, { projection: { _id: 0 } })) as Req | null;
  if (!req || req.status !== "open") return 0;
  const started = Date.now();
  let sent = 0;
  const todo = await db.collection(INVITES).find({ requestId, status: "pending", emailedAt: { $exists: false } }).limit(400).toArray();
  for (const inv of todo) {
    if (Date.now() - started > budgetMs) break;
    const ok = await sendOne(db, req, inv, false);
    await db.collection(INVITES).updateOne({ inviteId: inv.inviteId }, { $set: { emailedAt: new Date().toISOString(), ...(ok ? {} : { emailFailed: true }) } });
    if (ok) sent++;
  }
  return sent;
}

/** Reminds everyone who hasn't answered right now (a coach pressing "Remind"). Returns how many were emailed. */
export async function remindNow(db: Db, requestId: string, now: Date = new Date()): Promise<number> {
  const req = (await db.collection(REQUESTS).findOne({ requestId }, { projection: { _id: 0 } })) as Req | null;
  if (!req || req.status !== "open" || now.getTime() >= matchStartMs(req)) return 0;
  let sent = 0;
  for (const inv of await db.collection(INVITES).find({ requestId, status: "pending" }).limit(400).toArray()) {
    if (await sendOne(db, req, inv, true)) sent++;
    await db.collection(INVITES).updateOne({ inviteId: inv.inviteId }, { $set: { lastRemindedAt: now.toISOString() }, $inc: { remindersSent: 1 } });
  }
  return sent;
}

/** Hourly: closes requests whose match has started, sends the first ask for new ones and automatic reminders to non-responders. */
export async function processDueRsvp(db: Db, now: Date = new Date(), budgetMs = 30_000): Promise<{ closed: number; asked: number; reminded: number }> {
  const out = { closed: 0, asked: 0, reminded: 0 };
  const open = (await db.collection(REQUESTS).find({ status: "open" }, { projection: { _id: 0 } }).limit(300).toArray()) as unknown as (Req & { requestId: string })[];
  const started = Date.now();
  for (const req of open) {
    if (now.getTime() >= matchStartMs(req)) {
      await db.collection(REQUESTS).updateOne({ requestId: req.requestId }, { $set: { status: "closed", closedAt: now.toISOString() } });
      out.closed++;
      continue;
    }
    out.asked += await sendFirstAsk(db, req.requestId, Math.max(1000, budgetMs - (Date.now() - started)));
    for (const inv of await db.collection(INVITES).find({ requestId: req.requestId, status: "pending", emailedAt: { $exists: true } }).limit(400).toArray()) {
      if (Date.now() - started > budgetMs) return out;
      if (!dueReminder(req, inv as never, now)) continue;
      const ok = await sendOne(db, req, inv, true);
      // Counted even without an email address, so a person who can't be emailed doesn't hold the schedule up; the in-app notice still shows.
      await db.collection(INVITES).updateOne({ inviteId: inv.inviteId }, { $set: { lastRemindedAt: now.toISOString() }, $inc: { remindersSent: 1 } });
      if (ok) out.reminded++;
    }
  }
  return out;
}
