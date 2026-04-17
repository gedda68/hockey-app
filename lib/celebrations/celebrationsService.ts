import type { Db } from "mongodb";
import type { MemberPlayingHistoryRow, CoachTeamAnalyticsRow } from "@/types/memberStats";
import {
  GAMES_PLAYED_MILESTONES,
  WINS_MILESTONES,
  type CelebrationAlert,
  isWithinDays,
  pickMilestoneJustHit,
} from "@/lib/celebrations/milestones";
import {
  listPlayingHistoryForMember,
  listCoachAnalyticsForMemberCoach,
  listCoachAnalyticsForStaff,
  summarizeCoachAnalytics,
} from "@/lib/stats/memberStatsService";

type MemberDoc = {
  memberId: string;
  clubId?: string;
  associationId?: string;
  personalInfo?: { dateOfBirth?: string; firstName?: string; lastName?: string; displayName?: string };
};

function displayNameForMember(m: MemberDoc): string {
  const pi = m.personalInfo ?? {};
  return (
    (pi.displayName || "").trim() ||
    `${String(pi.firstName ?? "").trim()} ${String(pi.lastName ?? "").trim()}`.trim() ||
    String(m.memberId)
  );
}

function sameMonthDay(dobIso: string, now = new Date()): boolean {
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return false;
  return dob.getUTCMonth() === now.getUTCMonth() && dob.getUTCDate() === now.getUTCDate();
}

function calcAge(dobIso: string, now = new Date()): number | null {
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return null;
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age--;
  return age >= 0 ? age : null;
}

function isGameRow(r: MemberPlayingHistoryRow): boolean {
  return r.eventType === "fixture" || r.eventType === "friendly" || r.eventType === "representative";
}

function sumGames(rows: MemberPlayingHistoryRow[]): number {
  return rows.reduce((n, r) => n + (isGameRow(r) ? 1 : 0), 0);
}

function sumWins(rows: MemberPlayingHistoryRow[]): number {
  return rows.reduce((n, r) => n + (isGameRow(r) && r.result === "win" ? 1 : 0), 0);
}

function latestGameDate(rows: MemberPlayingHistoryRow[]): string | null {
  const g = rows.find((r) => isGameRow(r));
  return g?.date ?? null;
}

async function clubIdsForAssociation(db: Db, associationId: string): Promise<Set<string>> {
  const rows = await db
    .collection("clubs")
    .find({ parentAssociationId: associationId })
    .project({ id: 1 })
    .toArray();
  const ids = new Set<string>();
  for (const r of rows) {
    const id = String((r as any).id ?? "").trim();
    if (id) ids.add(id);
  }
  return ids;
}

export async function buildCelebrationsForMember(db: Db, memberId: string): Promise<CelebrationAlert[]> {
  const member = (await db
    .collection("members")
    .findOne({ memberId }, { projection: { memberId: 1, clubId: 1, associationId: 1, personalInfo: 1 } })) as
    | MemberDoc
    | null;

  if (!member) return [];

  const name = displayNameForMember(member);
  const dob = String(member.personalInfo?.dateOfBirth ?? "").trim();

  const alerts: CelebrationAlert[] = [];

  if (dob && sameMonthDay(dob)) {
    const age = calcAge(dob);
    alerts.push({
      id: `birthday:${memberId}:${new Date().toISOString().slice(0, 10)}`,
      kind: "birthday",
      title: `Happy birthday, ${name}!`,
      message: age != null ? `Wishing you an awesome ${age}th birthday.` : "Wishing you an awesome birthday.",
      achievedAt: new Date().toISOString(),
    });
  }

  const playingRows = await listPlayingHistoryForMember(db, memberId);
  const latest = latestGameDate(playingRows);
  const recentEnough = latest ? isWithinDays(latest, 14) : false;

  const totalGames = sumGames(playingRows);
  const totalWins = sumWins(playingRows);

  const clubId = String(member.clubId ?? "").trim();
  const clubRows = clubId ? playingRows.filter((r) => r.clubId === clubId) : [];
  const clubGames = sumGames(clubRows);
  const clubWins = sumWins(clubRows);

  // Association scope: use member.associationId if present; otherwise fallback to club.parentAssociationId.
  let associationId = String(member.associationId ?? "").trim();
  if (!associationId && clubId) {
    const club = await db
      .collection("clubs")
      .findOne({ id: clubId }, { projection: { parentAssociationId: 1 } });
    associationId = String((club as any)?.parentAssociationId ?? "").trim();
  }

  let associationGames = 0;
  let associationWins = 0;
  if (associationId) {
    const ids = await clubIdsForAssociation(db, associationId);
    if (clubId) ids.add(clubId);
    const assocRows = playingRows.filter((r) => r.clubId && ids.has(String(r.clubId)));
    associationGames = sumGames(assocRows);
    associationWins = sumWins(assocRows);
  }

  function maybePushCountMilestone(
    kind: "games_played" | "wins",
    scope: "club" | "association" | "total",
    value: number,
    achievedAt: string | null,
  ) {
    const m =
      kind === "games_played"
        ? pickMilestoneJustHit(value, GAMES_PLAYED_MILESTONES)
        : pickMilestoneJustHit(value, WINS_MILESTONES);
    if (!m) return;
    if (!recentEnough) return;
    alerts.push({
      id: `${kind}:${scope}:${memberId}:${m}`,
      kind,
      scope,
      title:
        kind === "games_played"
          ? `${m} games played (${scope})`
          : `${m} wins (${scope})`,
      message:
        kind === "games_played"
          ? `Congratulations ${name} — you’ve hit ${m} games played ${scope === "total" ? "overall" : `for ${scope}`}.`
          : `Congratulations ${name} — you’ve hit ${m} wins ${scope === "total" ? "overall" : `for ${scope}`}.`,
      achievedAt: achievedAt ?? undefined,
    });
  }

  maybePushCountMilestone("games_played", "total", totalGames, latest);
  maybePushCountMilestone("wins", "total", totalWins, latest);

  if (clubId) {
    maybePushCountMilestone("games_played", "club", clubGames, latest);
    maybePushCountMilestone("wins", "club", clubWins, latest);
  }
  if (associationId) {
    maybePushCountMilestone("games_played", "association", associationGames, latest);
    maybePushCountMilestone("wins", "association", associationWins, latest);
  }

  // Coaching milestones (if the member also coaches, these collections are authoritative)
  const sessionLike = await db.collection("users").findOne(
    { memberId },
    { projection: { userId: 1 } },
  );
  const userId = String((sessionLike as any)?.userId ?? "").trim();
  const coachRows: CoachTeamAnalyticsRow[] = [
    ...(userId ? await listCoachAnalyticsForStaff(db, userId) : []),
    ...(memberId ? await listCoachAnalyticsForMemberCoach(db, memberId) : []),
  ];
  const merged = new Map<string, CoachTeamAnalyticsRow>();
  for (const r of coachRows) merged.set(r.analyticsId, r);
  const uniqueCoachRows = [...merged.values()];
  const coachTotals = summarizeCoachAnalytics(uniqueCoachRows);

  const coachedMilestone = pickMilestoneJustHit(coachTotals.gamesCoached, GAMES_PLAYED_MILESTONES);
  if (coachedMilestone && recentEnough) {
    alerts.push({
      id: `games_coached:total:${memberId}:${coachedMilestone}`,
      kind: "games_coached",
      scope: "total",
      title: `${coachedMilestone} games coached (total)`,
      message: `Huge coaching milestone, ${name} — ${coachedMilestone} games coached in total.`,
    });
  }
  const coachedWinsMilestone = pickMilestoneJustHit(coachTotals.wins, WINS_MILESTONES);
  if (coachedWinsMilestone && recentEnough) {
    alerts.push({
      id: `wins_coached:total:${memberId}:${coachedWinsMilestone}`,
      kind: "wins_coached",
      scope: "total",
      title: `${coachedWinsMilestone} wins coached (total)`,
      message: `Awesome result, ${name} — ${coachedWinsMilestone} wins as a coach.`,
    });
  }

  return alerts;
}

