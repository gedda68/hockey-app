// lib/members/playingExtras.ts
// Milestones, competition rank, representative appearances and membership length for a playing member.
// Pure helpers; /api/member/my-stats supplies the documents.

type Doc = Record<string, any>;

export const MILESTONE_STEP = 50;

export interface MilestoneBadge { games: number; label: string }
export interface Milestones { badges: MilestoneBadge[]; next: { games: number; remaining: number } }

const ordinal = (n: number) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10 > 3 ? 0 : n % 10] ?? "th"}`;
};

/** A badge for every 50 games: 50th, 100th, 150th… */
export function computeMilestones(games: number, step = MILESTONE_STEP): Milestones {
  const g = Math.max(0, Math.floor(games || 0));
  const badges: MilestoneBadge[] = [];
  for (let n = step; n <= g; n += step) badges.push({ games: n, label: `${ordinal(n)} game` });
  const next = (Math.floor(g / step) + 1) * step;
  return { badges, next: { games: next, remaining: next - g } };
}

export interface CompetitionRank { seasonCompetitionId: string; competition: string; rank: number; of: number; goals: number }

/** Rank by goals (ties share a rank) among players who have scored or recorded stats. */
export function rankInCompetition(memberId: string, goalsByMember: Map<string, number>): { rank: number; of: number; goals: number } | null {
  const mine = goalsByMember.get(memberId);
  if (mine === undefined) return null;
  let ahead = 0;
  for (const g of goalsByMember.values()) if (g > mine) ahead++;
  return { rank: ahead + 1, of: goalsByMember.size, goals: mine };
}

export interface RepAppearance { year: string; label: string; kind: "selection" | "tournament" }

/**
 * Representative selections (accepted/elected player nominations) and tournaments attended.
 * `tournaments` maps tournamentId -> { title, season }.
 */
export function buildRepAppearances(
  memberId: string,
  nominations: Doc[],
  entries: Doc[],
  tournaments: Map<string, { title: string; season: string }>,
): RepAppearance[] {
  const out: RepAppearance[] = [];
  const seen = new Set<string>();
  for (const n of nominations) {
    if (!["accepted", "elected"].includes(String(n.status))) continue;
    const type = String(n.nominationType ?? "player");
    if (type !== "player") continue;
    if (![n.memberId, n.nomineeId, n.playerId].includes(memberId)) continue;
    const key = `sel|${n.season}|${n.ageGroup}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ year: String(n.season ?? ""), label: `Representative selection${n.ageGroup ? ` · ${n.ageGroup}` : ""}`, kind: "selection" });
  }
  for (const e of entries) {
    if (!((e.attendingMemberIds as string[] | undefined) ?? []).includes(memberId)) continue;
    const tid = String(e.tournamentId ?? "");
    if (!tid || seen.has(`tour|${tid}`)) continue;
    seen.add(`tour|${tid}`);
    const t = tournaments.get(tid);
    out.push({ year: t?.season ?? "", label: t?.title ?? "Tournament", kind: "tournament" });
  }
  return out.sort((a, b) => b.year.localeCompare(a.year) || a.label.localeCompare(b.label));
}

export interface MembershipLength { sinceYear: number | null; years: number }

/** Whole years since joining (falls back to the earliest season we have a record for). */
export function membershipLength(joinDate: unknown, now: Date, earliestSeasonYear?: number | null): MembershipLength {
  const d = joinDate ? new Date(String(joinDate)) : null;
  const joinYear = d && !Number.isNaN(d.getTime()) ? d.getFullYear() : null;
  const since = [joinYear, earliestSeasonYear ?? null].filter((y): y is number => typeof y === "number" && y > 1900).sort((a, b) => a - b)[0] ?? null;
  if (since === null) return { sinceYear: null, years: 0 };
  // Seasons count inclusively when only a year is known; with a real join date use elapsed whole years.
  if (joinYear !== null && d && since === joinYear) {
    let y = now.getFullYear() - joinYear;
    const anniversary = new Date(now.getFullYear(), d.getMonth(), d.getDate());
    if (now < anniversary) y--;
    return { sinceYear: since, years: Math.max(0, y) };
  }
  return { sinceYear: since, years: Math.max(0, now.getFullYear() - since) };
}
