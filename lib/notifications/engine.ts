// lib/notifications/engine.ts
// Works out what a member should be told about right now and stores it in their inbox (member_notifications).
// Runs when they open the app (at most every REFRESH_MINUTES), so there is no fan-out job to keep running.
// Each thing notifies once: the dedupe key keeps dismissed or read notifications from coming back.

import { randomUUID } from "node:crypto";
import type { Db } from "mongodb";
import { isTargeted, type Subject } from "@/lib/announcements/targeting";
import { dayInZone } from "@/lib/member/availability";
import { childrenOf } from "@/lib/access/guardians";
import { getMatrixRole } from "@/lib/access/matrix";
import { allows, mergePrefs, type NotificationPrefs } from "@/lib/notifications/prefs";
import { dispatchExtraChannels } from "@/lib/notifications/channels";
import { logDelivery } from "@/lib/notifications/deliveryLog";
import {
  announcementCandidates, approvalCandidates, eventCandidates, matchCandidates, nominationCandidates,
  type AnnouncementLike, type Candidate, type EventLike, type FixtureLike, type WaitingOnMe, type WindowLike,
} from "@/lib/notifications/candidates";

export const COLLECTION = "member_notifications";
export const REFRESH_MINUTES = 10;
/** Categories whose notifications go away by themselves once the thing is done (nominated, accepted…). */
const SELF_RESOLVING = ["approvals", "nominations", "announcements"];

const DAY = 86400000;

export async function loadPrefs(db: Db, memberId: string): Promise<{ prefs: NotificationPrefs; refreshedAt: string | null }> {
  const m = await db.collection("members").findOne({ memberId }, { projection: { notificationPrefs: 1, notificationsRefreshedAt: 1 } });
  return { prefs: mergePrefs(m?.notificationPrefs), refreshedAt: (m?.notificationsRefreshedAt as string | undefined) ?? null };
}

/** Everything that could notify this member right now, before their preferences are applied. */
export async function gatherCandidates(db: Db, memberId: string, now: Date): Promise<{ candidates: Candidate[]; recipient: { email: string | null; mobile: string | null } }> {
  const member = await db.collection("members").findOne(
    { memberId },
    { projection: { clubId: 1, associationId: 1, "membership.clubId": 1, "membership.associationId": 1, "personalInfo.dateOfBirth": 1, "personalInfo.gender": 1, gender: 1, contact: 1 } },
  );
  if (!member) return { candidates: [], recipient: { email: null, mobile: null } };

  const clubRef = String(member.membership?.clubId ?? member.clubId ?? "");
  const club = clubRef ? await db.collection("clubs").findOne({ $or: [{ id: clubRef }, { clubId: clubRef }, { slug: clubRef }] }, { projection: { id: 1, clubId: 1, slug: 1, parentAssociationId: 1, associationId: 1 } }) : null;
  const clubRefs = [...new Set([clubRef, club?.id, club?.clubId, club?.slug].filter(Boolean).map(String))];
  const associationId = String(member.membership?.associationId ?? member.associationId ?? club?.parentAssociationId ?? club?.associationId ?? "");
  const birthYear = member.personalInfo?.dateOfBirth ? new Date(String(member.personalInfo.dateOfBirth)).getFullYear() : null;
  const out: Candidate[] = [];

  // Matches: this member's teams, and their children's teams (shown to the guardian), next 3 days.
  const kids = await childrenOf(db, memberId);
  const kidIds = kids.map((k) => String(k.memberId));
  const matchSubjects: { id: string; child?: { memberId: string; name: string } }[] = [
    { id: memberId },
    ...kids.map((k: any) => ({ id: String(k.memberId), child: { memberId: String(k.memberId), name: String(k.personalInfo?.firstName ?? k.firstName ?? k.name ?? "Your child").trim() || "Your child" } })),
  ];
  for (const subject of matchSubjects) {
    const teams = await db.collection("teams").find({ "roster.memberId": subject.id }, { projection: { teamId: 1, clubId: 1, name: 1, displayName: 1 } }).toArray();
    if (!teams.length) continue;
    const myTeamIds = new Set(teams.map((t) => String(t.teamId)));
    const fixtures = (await db
      .collection("league_fixtures")
      .find(
        { $or: [{ homeTeamId: { $in: [...myTeamIds] } }, { awayTeamId: { $in: [...myTeamIds] } }], scheduledStart: { $gte: now.toISOString(), $lte: new Date(now.getTime() + 3 * DAY).toISOString() } },
        { projection: { fixtureId: 1, homeTeamId: 1, awayTeamId: 1, scheduledStart: 1, venueName: 1, round: 1, status: 1, seasonCompetitionId: 1 } },
      )
      .limit(50)
      .toArray()) as unknown as FixtureLike[];
    const ids = new Set<string>(myTeamIds);
    for (const f of fixtures) { if (f.homeTeamId) ids.add(f.homeTeamId); if (f.awayTeamId) ids.add(f.awayTeamId); }
    const named = await db.collection("teams").find({ teamId: { $in: [...ids] } }, { projection: { teamId: 1, name: 1, displayName: 1 } }).toArray();
    const names = new Map(named.map((t) => [String(t.teamId), String(t.displayName || t.name || "")]));
    out.push(...matchCandidates(fixtures, myTeamIds, names, new Map(teams.map((t) => [String(t.teamId), String(t.clubId ?? "")])), now, 72, subject.child));
  }

  // Nomination deadlines for my club and association.
  const scopes = [
    ...(clubRefs.length ? [{ scopeType: "club", scopeId: { $in: clubRefs } }] : []),
    ...(associationId ? [{ scopeType: "association", scopeId: associationId }] : []),
  ];
  if (scopes.length) {
    const today = dayInZone(now) as string;
    const inAWeek = dayInZone(new Date(now.getTime() + 8 * DAY)) as string;
    const windows = (await db
      .collection("nomination_windows")
      .find({ status: "open", openDate: { $lte: today }, closeDate: { $gte: today, $lte: inAWeek }, $or: scopes })
      .limit(50)
      .toArray()) as unknown as WindowLike[];
    if (windows.length) {
      const mine = await db.collection("rep_nominations").find({ memberId, windowId: { $in: windows.map((w) => w.windowId) }, status: { $ne: "withdrawn" } }, { projection: { windowId: 1 } }).toArray();
      out.push(...nominationCandidates(windows, new Set(mine.map((n) => String(n.windowId))), { birthYear, gender: member.personalInfo?.gender ?? member.gender }, now));
    }
  }

  // Events: mine (club / association) plus national and international ones.
  const eventOr: Record<string, unknown>[] = [{ scope: { $in: ["national", "international"] } }];
  if (clubRefs.length) eventOr.push({ "organization.id": { $in: clubRefs } }, { "references.clubId": { $in: clubRefs } });
  if (associationId) eventOr.push({ "organization.id": associationId }, { "references.associationId": associationId, calendarPropagation: { $in: ["global", "association", "club"] } });
  const events = (await db
    .collection("events")
    .find({ deleted: { $ne: true }, status: { $in: ["scheduled", "postponed"] }, visibility: { $in: ["public", "members-only"] }, startDate: { $gte: now, $lte: new Date(now.getTime() + 7 * DAY) }, $or: eventOr })
    .limit(50)
    .toArray()) as unknown as EventLike[];
  out.push(...eventCandidates(events, now));

  // Announcements written by admins for everyone, my association or my club.
  const annScopes: Record<string, unknown>[] = [{ level: "global" }];
  if (clubRefs.length) annScopes.push({ level: "club", scopeId: { $in: clubRefs } });
  if (associationId) annScopes.push({ level: "association", scopeId: associationId });
  const announcements = (await db
    .collection("announcements")
    .find({ status: "published", publishAt: { $lte: now.toISOString() }, $or: annScopes })
    .sort({ publishAt: -1 })
    .limit(30)
    .toArray()) as unknown as AnnouncementLike[];
  // Targeted ones (specific teams / ages) only reach the people they're aimed at, or their guardians.
  let who: { me: Subject; kids: Subject[] } | undefined;
  if (announcements.some((a) => isTargeted(a.targeting))) {
    const rosterTeams = await db.collection("teams").find({ "roster.memberId": { $in: [memberId, ...kidIds] } }, { projection: { teamId: 1, roster: 1 } }).toArray();
    const teamsOf = (id: string) => rosterTeams.filter((t) => ((t.roster ?? []) as { memberId?: string }[]).some((r) => r.memberId === id)).map((t) => String(t.teamId));
    who = {
      me: { teamIds: teamsOf(memberId), dateOfBirth: member.personalInfo?.dateOfBirth },
      kids: kids.map((k: any) => ({ teamIds: teamsOf(String(k.memberId)), dateOfBirth: k.personalInfo?.dateOfBirth })),
    };
  }
  out.push(...announcementCandidates(announcements, now, 14, who));

  // Waiting on me: invitations, and approvals for my children.
  const [invites, kidAppts, kidReqs] = await Promise.all([
    db.collection("role_appointments").find({ memberId, status: "pending", $or: [{ "guardianApproval.status": { $exists: false } }, { "guardianApproval.status": "approved" }] }).limit(20).toArray(),
    kidIds.length ? db.collection("role_appointments").find({ memberId: { $in: kidIds }, status: "pending", "guardianApproval.status": "pending", "guardianApproval.guardianIds": memberId }).limit(20).toArray() : [],
    kidIds.length ? db.collection("role_requests").find({ memberId: { $in: kidIds }, "guardianApproval.status": "pending", "guardianApproval.guardianIds": memberId, status: { $in: ["pending_payment", "awaiting_approval"] } }).limit(20).toArray() : [],
  ]);
  const waiting: WaitingOnMe = {
    invites: invites.map((a: any) => ({ appointmentId: a.appointmentId, roleName: getMatrixRole(String(a.roleKey))?.name ?? a.roleKey, sentByName: a.sentByName })),
    guardianAppointments: kidAppts.map((a: any) => ({ appointmentId: a.appointmentId, memberName: a.memberName, roleName: getMatrixRole(String(a.roleKey))?.name ?? a.roleKey })),
    guardianRequests: kidReqs.map((r: any) => ({ requestId: r.requestId, memberName: r.memberName, requestedRole: r.requestedRole })),
  };
  out.push(...approvalCandidates(waiting, now));

  const contact = (member.contact ?? {}) as Record<string, unknown>;
  return { candidates: out, recipient: { email: (contact.primaryEmail ?? contact.email ?? null) as string | null, mobile: (contact.mobile ?? contact.phone ?? null) as string | null } };
}

/**
 * Store what should be in the inbox. New notifications are stored only when the member's preferences allow
 * them (and go out on any extra channels they have on); notifications for things that are done (nominated,
 * accepted…) are cleared. Returns how many were newly created.
 */
export async function storeCandidates(
  db: Db,
  memberId: string,
  candidates: Candidate[],
  recipient: { email: string | null; mobile: string | null },
  prefs: NotificationPrefs,
  now: Date,
): Promise<number> {
  const col = db.collection(COLLECTION);
  let created = 0;
  for (const c of candidates) {
    if (!allows(prefs, c)) continue;
    const res = await col.updateOne(
      { memberId, dedupeKey: c.dedupeKey },
      {
        $setOnInsert: {
          notificationId: `notif-${randomUUID()}`,
          memberId,
          source: "engine",
          dedupeKey: c.dedupeKey,
          type: c.type,
          level: c.level,
          category: c.category,
          title: c.title,
          message: c.message,
          link: c.link,
          clubId: c.clubId ?? "",
          clubName: "",
          eventAt: c.eventAt,
          createdAt: now.toISOString(),
          expiresAt: c.expiresAt,
          readAt: null,
          dismissedAt: null,
        },
      },
      { upsert: true },
    );
    if (res.upsertedCount) {
      created++;
      // The in-app copy of an announcement counts as a delivery, so authors can see how many people got it.
      if (c.category === "announcements") await logDelivery(db, { memberId, dedupeKey: c.dedupeKey, channel: "inApp", status: "sent", category: c.category, level: c.level, clubId: c.clubId });
      await dispatchExtraChannels(db, c, { memberId, ...recipient }, prefs);
    }
  }

  // Things that are no longer true (already nominated, invitation answered) leave the inbox.
  await col.updateMany(
    { memberId, source: "engine", category: { $in: SELF_RESOLVING }, dismissedAt: null, dedupeKey: { $nin: candidates.map((c) => c.dedupeKey) } },
    { $set: { dismissedAt: now.toISOString(), resolved: true } },
  );
  return created;
}

/** Bring a member's inbox up to date (at most every REFRESH_MINUTES unless forced). */
export async function refreshForMember(db: Db, memberId: string, now: Date = new Date(), force = false): Promise<void> {
  const { prefs, refreshedAt } = await loadPrefs(db, memberId);
  if (!force && refreshedAt && now.getTime() - Date.parse(refreshedAt) < REFRESH_MINUTES * 60_000) return;
  await db.collection("members").updateOne({ memberId }, { $set: { notificationsRefreshedAt: now.toISOString() } });
  const { candidates, recipient } = await gatherCandidates(db, memberId, now);
  await storeCandidates(db, memberId, candidates, recipient, prefs, now);
}
