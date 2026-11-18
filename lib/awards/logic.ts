// lib/awards/logic.ts
// Player-of-the-match votes (3-2-1) and end-of-season award nominations. Pure: no database in here.

export const POINTS = [3, 2, 1] as const;
export type Ballot = { first: string; second?: string; third?: string };

export interface BallotCheck { ok: true; ballot: Ballot }
export interface BallotFail { ok: false; error: string }

/** A voter's picks, checked: one to three different teammates from the squad, never themselves. */
export function cleanBallot(raw: unknown, voterId: string, candidateIds: string[]): BallotCheck | BallotFail {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const picks = (["first", "second", "third"] as const).map((k) => (typeof r[k] === "string" && r[k] ? String(r[k]) : ""));
  if (!picks[0]) return { ok: false, error: "Choose who you think was best on ground" };
  if ((picks[2] && !picks[1])) return { ok: false, error: "Fill in second place before third" };
  const chosen = picks.filter(Boolean);
  if (new Set(chosen).size !== chosen.length) return { ok: false, error: "Each vote must go to a different player" };
  const ok = new Set(candidateIds);
  for (const id of chosen) {
    if (id === voterId) return { ok: false, error: "You can't vote for yourself" };
    if (!ok.has(id)) return { ok: false, error: "That player wasn't in the squad for this match" };
  }
  return { ok: true, ballot: { first: picks[0], ...(picks[1] ? { second: picks[1] } : {}), ...(picks[2] ? { third: picks[2] } : {}) } };
}

export interface TallyRow { memberId: string; points: number; firsts: number; seconds: number; thirds: number }

export function tally(ballots: Ballot[]): TallyRow[] {
  const by = new Map<string, TallyRow>();
  const row = (id: string) => { let t = by.get(id); if (!t) by.set(id, (t = { memberId: id, points: 0, firsts: 0, seconds: 0, thirds: 0 })); return t; };
  for (const b of ballots) {
    const first = row(b.first); first.points += 3; first.firsts++;
    if (b.second) { const t = row(b.second); t.points += 2; t.seconds++; }
    if (b.third) { const t = row(b.third); t.points += 1; t.thirds++; }
  }
  return [...by.values()].sort((a, b) => b.points - a.points || b.firsts - a.firsts || b.seconds - a.seconds || a.memberId.localeCompare(b.memberId));
}

export type Decision = { kind: "none" } | { kind: "winner"; memberId: string } | { kind: "tied"; memberIds: string[] };

/** Most points wins; a tie on points is broken by first-place votes; still level and staff choose between them. */
export function decide(rows: TallyRow[]): Decision {
  if (!rows.length) return { kind: "none" };
  const top = rows[0];
  const level = rows.filter((r) => r.points === top.points && r.firsts === top.firsts);
  return level.length === 1 ? { kind: "winner", memberId: top.memberId } : { kind: "tied", memberIds: level.map((r) => r.memberId) };
}

export interface RoundLike { teamId: string; status: string; tally?: TallyRow[]; winnerId?: string | null }
export interface BoardRow { memberId: string; points: number; wins: number; rounds: number }

/** Season totals across decided matches: points from every vote received, and how many times they were player of the match. */
export function leaderboard(rounds: RoundLike[]): BoardRow[] {
  const by = new Map<string, BoardRow>();
  for (const r of rounds) {
    if (r.status !== "closed") continue;
    for (const t of r.tally ?? []) {
      const b = by.get(t.memberId) ?? { memberId: t.memberId, points: 0, wins: 0, rounds: 0 };
      b.points += t.points; b.rounds++;
      by.set(t.memberId, b);
    }
    if (r.winnerId) { const b = by.get(r.winnerId); if (b) b.wins++; }
  }
  return [...by.values()].sort((a, b) => b.points - a.points || b.wins - a.wins || a.memberId.localeCompare(b.memberId));
}

export interface CompRound { kind?: string; status: string; tally?: TallyRow[]; winnerId?: string | null; teamName?: string }
export interface CompRow { memberId: string; teamPoints: number; officialPoints: number; total: number; wins: number; games: number; teamName: string }

/**
 * Everyone in a competition on one table. Points from their own team's votes and from the umpires and officials add up
 * to the season total, which decides player of the season. Ties go to most match wins, then official points.
 */
export function competitionLeaderboard(rounds: CompRound[]): CompRow[] {
  const by = new Map<string, CompRow>();
  const row = (id: string, team?: string) => { let r = by.get(id); if (!r) by.set(id, (r = { memberId: id, teamPoints: 0, officialPoints: 0, total: 0, wins: 0, games: 0, teamName: team ?? "" })); if (team && !r.teamName) r.teamName = team; return r; };
  for (const r of rounds) {
    if (r.status !== "closed") continue;
    const official = r.kind === "officials";
    for (const t of r.tally ?? []) {
      const x = row(t.memberId, official ? undefined : r.teamName);
      if (official) x.officialPoints += t.points; else { x.teamPoints += t.points; x.games++; }
      x.total += t.points;
    }
    if (r.winnerId) row(r.winnerId).wins++;
  }
  return [...by.values()].sort((a, b) => b.total - a.total || b.wins - a.wins || b.officialPoints - a.officialPoints || a.memberId.localeCompare(b.memberId));
}

/** Should this round be closed now? When time is up, or everyone who can vote has. */
export function roundShouldClose(r: { status: string; closesAt: string; voterCount: number; votedCount: number }, now: Date): boolean {
  if (r.status !== "open") return false;
  return Date.parse(r.closesAt) <= now.getTime() || (r.voterCount > 0 && r.votedCount >= r.voterCount);
}

// ── End-of-season nominations ────────────────────────────────────────────────

export const MAX_NOMINATIONS_PER_CATEGORY = 3;
export type WindowState = "not_open" | "open" | "closed";

export function windowState(p: { opensAt?: string | null; closesAt?: string | null; status?: string }, now: Date): WindowState {
  if (p.status === "draft") return "not_open";
  if (p.status === "judging" || p.status === "announced") return "closed";
  const open = p.opensAt ? Date.parse(p.opensAt) : NaN, close = p.closesAt ? Date.parse(p.closesAt) : NaN;
  if (!Number.isNaN(open) && now.getTime() < open) return "not_open";
  if (!Number.isNaN(close) && now.getTime() >= close) return "closed";
  return "open";
}

export interface NominationLike { nominationId: string; categoryId: string; nomineeId: string; nominatorId: string; reason: string }

export function checkNomination(n: { nominatorId: string; nomineeId: string; reason: string; categoryId: string }, existing: NominationLike[]): string | null {
  if (!n.categoryId) return "Choose an award";
  if (!n.nomineeId) return "Choose who you're nominating";
  if (n.nomineeId === n.nominatorId) return "You can't nominate yourself";
  const reason = n.reason.trim();
  if (reason.length < 15) return "Tell us in a sentence or two why they deserve it";
  if (reason.length > 800) return "Please keep the reason under 800 characters";
  const mine = existing.filter((e) => e.nominatorId === n.nominatorId && e.categoryId === n.categoryId);
  if (mine.some((e) => e.nomineeId === n.nomineeId)) return "You've already nominated them for this award";
  if (mine.length >= MAX_NOMINATIONS_PER_CATEGORY) return `You can nominate up to ${MAX_NOMINATIONS_PER_CATEGORY} people for each award`;
  return null;
}

export interface NomineeGroup { categoryId: string; nomineeId: string; count: number; reasons: string[] }

/** For the committee: each nominee per award, most-nominated first, with what people said. */
export function groupNominations(noms: NominationLike[]): NomineeGroup[] {
  const by = new Map<string, NomineeGroup>();
  for (const n of noms) {
    const k = `${n.categoryId}|${n.nomineeId}`;
    const g = by.get(k) ?? { categoryId: n.categoryId, nomineeId: n.nomineeId, count: 0, reasons: [] };
    g.count++; g.reasons.push(n.reason);
    by.set(k, g);
  }
  return [...by.values()].sort((a, b) => a.categoryId.localeCompare(b.categoryId) || b.count - a.count || a.nomineeId.localeCompare(b.nomineeId));
}

export const DEFAULT_CATEGORIES = [
  { name: "Club Champion", description: "The player who has been the club's best across the season" },
  { name: "Coach's Award", description: "Chosen for attitude, effort and what they bring to the team" },
  { name: "Most Improved", description: "Has come the furthest this season" },
  { name: "Rookie of the Year", description: "Best newcomer to the club" },
  { name: "Volunteer of the Year", description: "Went above and beyond off the field" },
  { name: "Spirit of the Club", description: "Embodies what the club is about" },
];
