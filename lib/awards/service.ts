// lib/awards/service.ts
// The database side of awards: player-of-the-match vote rounds opened after each game, and the club's end-of-season
// award programs (nominations, judging, announcing). The rules live in ./logic and are tested there.

import { randomBytes } from "node:crypto";
import type { Db } from "mongodb";
import { sendEmail } from "@/lib/email/client";
import { buildVoteEmail } from "@/lib/email/templates/matchVote";
import { buildWinnerEmail } from "@/lib/email/templates/awardWinner";
import { isMinor } from "@/lib/access/guardians";
import { isQuietHour } from "@/lib/rsvp/logic";
import { memberBelongsToClubFilter } from "@/lib/rosters/memberClubQuery";
import { cleanBallot, checkNomination, decide, leaderboard, roundShouldClose, tally, windowState, type Ballot, type NominationLike, type TallyRow } from "@/lib/awards/logic";

export const ROUNDS = "match_vote_rounds";
export const VOTES = "match_votes";
export const AWARD_SETTINGS = "award_settings";
export const PROGRAMS = "award_programs";
export const NOMS = "award_nominations";
const DAY = 86400_000;
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
const nameOf = (m: any) => `${m?.personalInfo?.firstName ?? m?.firstName ?? ""} ${m?.personalInfo?.lastName ?? m?.lastName ?? ""}`.trim() || "Member";
const emailOf = (m: any) => String(m?.contact?.primaryEmail ?? m?.contact?.email ?? "").trim();

export async function namesFor(db: Db, ids: string[]): Promise<Map<string, string>> {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (!uniq.length) return new Map();
  const ms = await db.collection("members").find({ memberId: { $in: uniq } }, { projection: { memberId: 1, personalInfo: 1, firstName: 1, lastName: 1 } }).toArray();
  return new Map(ms.map((m: any) => [String(m.memberId), nameOf(m)]));
}

// ── Settings ─────────────────────────────────────────────────────────────────

export interface AwardSettings { clubId: string; matchVotes: { enabled: boolean; closeDays: number; staffVote: boolean } }
export async function loadAwardSettings(db: Db, clubId: string): Promise<AwardSettings> {
  const s: any = await db.collection(AWARD_SETTINGS).findOne({ clubId }, { projection: { _id: 0 } });
  const m = s?.matchVotes ?? {};
  return { clubId, matchVotes: { enabled: m.enabled !== false, closeDays: Math.min(14, Math.max(1, Math.round(Number(m.closeDays) || 3))), staffVote: m.staffVote !== false } };
}
export async function saveAwardSettings(db: Db, clubId: string, raw: any): Promise<AwardSettings> {
  const cur = await loadAwardSettings(db, clubId);
  const m = raw?.matchVotes ?? {};
  const next: AwardSettings = { clubId, matchVotes: {
    enabled: typeof m.enabled === "boolean" ? m.enabled : cur.matchVotes.enabled,
    closeDays: m.closeDays != null ? Math.min(14, Math.max(1, Math.round(Number(m.closeDays) || cur.matchVotes.closeDays))) : cur.matchVotes.closeDays,
    staffVote: typeof m.staffVote === "boolean" ? m.staffVote : cur.matchVotes.staffVote,
  } };
  await db.collection(AWARD_SETTINGS).updateOne({ clubId }, { $set: next }, { upsert: true });
  return next;
}

// ── Match votes ──────────────────────────────────────────────────────────────

const matchDay = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "Australia/Brisbane" });

/** After each completed game with a match-day lineup, opens a vote for the squad (and staff). Safe to run repeatedly. */
export async function openDueRounds(db: Db, now: Date = new Date()): Promise<{ opened: number; emailed: number }> {
  const since = new Date(now.getTime() - 7 * DAY).toISOString();
  const fixtures: any[] = await db.collection("league_fixtures").find({ status: "completed", scheduledStart: { $gte: since } }, { projection: { fixtureId: 1, seasonCompetitionId: 1, homeTeamId: 1, awayTeamId: 1, scheduledStart: 1 } }).limit(400).toArray();
  let opened = 0, emailed = 0;
  for (const f of fixtures) {
    for (const [teamId, otherId] of [[f.homeTeamId, f.awayTeamId], [f.awayTeamId, f.homeTeamId]] as const) {
      if (!teamId) continue;
      if (await db.collection(ROUNDS).findOne({ fixtureId: String(f.fixtureId), teamId: String(teamId) }, { projection: { roundId: 1 } })) continue;
      const lineup: any = await db.collection("fixture_lineups").findOne({ fixtureId: String(f.fixtureId), teamId: String(teamId) });
      const players: any[] = (lineup?.players ?? []).filter((p: any) => p?.memberId && !p.didNotPlay);
      if (players.length < 3) continue;
      const team: any = await db.collection("teams").findOne({ teamId: String(teamId) }, { projection: { teamId: 1, clubId: 1, name: 1, displayName: 1 } });
      const clubId = String(team?.clubId ?? "");
      if (!clubId) continue;
      const settings = await loadAwardSettings(db, clubId);
      if (!settings.matchVotes.enabled) continue;
      const other: any = otherId ? await db.collection("teams").findOne({ teamId: String(otherId) }, { projection: { name: 1, displayName: 1 } }) : null;
      const staffIds: string[] = settings.matchVotes.staffVote ? (lineup?.staff ?? []).map((s: any) => String(s.memberId)).filter(Boolean) : [];
      const candidateIds = players.map((p) => String(p.memberId));
      const names = await namesFor(db, [...candidateIds, ...staffIds]);
      const shirt = new Map(players.map((p: any) => [String(p.memberId), p.shirtNumber ?? null]));
      const round = {
        roundId: newId("MVR"), fixtureId: String(f.fixtureId), seasonCompetitionId: String(f.seasonCompetitionId ?? ""), teamId: String(teamId), clubId,
        teamName: String(team?.displayName || team?.name || "Your team"), opponentName: String(other?.displayName || other?.name || "").trim(),
        startsAt: String(f.scheduledStart), matchDate: String(f.scheduledStart).slice(0, 10), status: "open",
        voterIds: [...new Set([...candidateIds, ...staffIds])], candidates: candidateIds.map((id) => ({ memberId: id, name: names.get(id) ?? "Player", shirtNumber: shirt.get(id) ?? null })),
        votedCount: 0, tally: [] as TallyRow[], winnerId: null as string | null, result: null as any,
        openedAt: now.toISOString(), closesAt: new Date(now.getTime() + settings.matchVotes.closeDays * DAY).toISOString(),
      };
      await db.collection(ROUNDS).insertOne(round);
      opened++;
      if (!isQuietHour(now)) emailed += await emailVoters(db, round);
    }
  }
  return { opened, emailed };
}

async function emailVoters(db: Db, round: any): Promise<number> {
  const ms: any[] = await db.collection("members").find({ memberId: { $in: round.voterIds } }, { projection: { memberId: 1, personalInfo: 1, firstName: 1, lastName: 1, contact: 1, notificationPrefs: 1 } }).toArray();
  let n = 0;
  for (const m of ms) {
    const to = emailOf(m);
    if (!to || m.notificationPrefs?.enabled === false) continue;
    const mail = buildVoteEmail({ name: String(m.personalInfo?.firstName ?? m.firstName ?? ""), teamName: round.teamName, opponent: round.opponentName, whenText: matchDay(round.startsAt), closesText: matchDay(round.closesAt) });
    const r = await sendEmail({ to, subject: mail.subject, html: mail.html, text: mail.text }).catch(() => ({ success: false }));
    if ((r as any)?.success) n++;
  }
  return n;
}

export type VoteResult = { ok: true } | { ok: false; error: string; status: number };

export async function castVote(db: Db, roundId: string, voterId: string, raw: unknown, now: Date = new Date()): Promise<VoteResult> {
  const round: any = await db.collection(ROUNDS).findOne({ roundId });
  if (!round) return { ok: false, error: "Voting not found", status: 404 };
  if (round.status !== "open" || Date.parse(round.closesAt) <= now.getTime()) return { ok: false, error: "Voting has closed", status: 409 };
  if (!round.voterIds.includes(voterId)) return { ok: false, error: "You weren't part of this match", status: 403 };
  const checked = cleanBallot(raw, voterId, round.candidates.map((c: any) => c.memberId));
  if (!checked.ok) return { ok: false, error: checked.error, status: 400 };
  await db.collection(VOTES).updateOne({ roundId, voterId }, { $set: { roundId, voterId, ballot: checked.ballot, votedAt: now.toISOString() } }, { upsert: true });
  const count = (await db.collection(VOTES).find({ roundId }, { projection: { voterId: 1 } }).toArray()).length;
  await db.collection(ROUNDS).updateOne({ roundId }, { $set: { votedCount: count } });
  if (roundShouldClose({ status: "open", closesAt: round.closesAt, voterCount: round.voterIds.length, votedCount: count }, now)) await closeRound(db, roundId, now);
  return { ok: true };
}

/** Counts the votes and records the result. A tie on points and first-place votes is left for staff to settle. */
export async function closeRound(db: Db, roundId: string, now: Date = new Date()): Promise<{ status: string; winnerId: string | null; tied: string[] }> {
  const round: any = await db.collection(ROUNDS).findOne({ roundId });
  if (!round) return { status: "missing", winnerId: null, tied: [] };
  if (round.status !== "open") return { status: round.status, winnerId: round.winnerId ?? null, tied: round.result?.memberIds ?? [] };
  const votes: any[] = await db.collection(VOTES).find({ roundId }, { projection: { ballot: 1 } }).toArray();
  const rows = tally(votes.map((v) => v.ballot as Ballot));
  const d = decide(rows);
  const winnerId = d.kind === "winner" ? d.memberId : null;
  await db.collection(ROUNDS).updateOne({ roundId }, { $set: { status: "closed", closedAt: now.toISOString(), tally: rows, votedCount: votes.length, winnerId, result: d } });
  return { status: "closed", winnerId, tied: d.kind === "tied" ? d.memberIds : [] };
}

export async function resolveTie(db: Db, roundId: string, winnerId: string): Promise<VoteResult> {
  const round: any = await db.collection(ROUNDS).findOne({ roundId });
  if (!round) return { ok: false, error: "Not found", status: 404 };
  if (round.status !== "closed" || round.result?.kind !== "tied") return { ok: false, error: "This vote isn't tied", status: 409 };
  if (!round.result.memberIds.includes(winnerId)) return { ok: false, error: "Choose one of the tied players", status: 400 };
  await db.collection(ROUNDS).updateOne({ roundId }, { $set: { winnerId, result: { kind: "winner", memberId: winnerId, chosenByStaff: true } } });
  return { ok: true };
}

export async function closeDueRounds(db: Db, now: Date = new Date()): Promise<{ closed: number }> {
  const open: any[] = await db.collection(ROUNDS).find({ status: "open" }, { projection: { roundId: 1, closesAt: 1, voterIds: 1, votedCount: 1, status: 1 } }).limit(500).toArray();
  let closed = 0;
  for (const r of open) if (roundShouldClose({ status: r.status, closesAt: r.closesAt, voterCount: (r.voterIds ?? []).length, votedCount: Number(r.votedCount) || 0 }, now)) { await closeRound(db, String(r.roundId), now); closed++; }
  return { closed };
}

/** A person's open votes (with their own ballot when they've voted) and what recently finished for their teams. */
export async function myVotes(db: Db, memberId: string, now: Date = new Date()) {
  const mine: any[] = await db.collection(ROUNDS).find({ voterIds: memberId }, { projection: { _id: 0 } }).sort({ startsAt: -1 }).limit(40).toArray();
  const votes: any[] = mine.length ? await db.collection(VOTES).find({ voterId: memberId, roundId: { $in: mine.map((r) => String(r.roundId)) } }, { projection: { roundId: 1, ballot: 1 } }).toArray() : [];
  const ballotOf = new Map(votes.map((v) => [String(v.roundId), v.ballot]));
  const strip = (r: any) => ({ roundId: r.roundId, teamId: r.teamId, teamName: r.teamName, opponentName: r.opponentName, startsAt: r.startsAt, closesAt: r.closesAt, status: r.status, candidates: r.candidates, myBallot: ballotOf.get(String(r.roundId)) ?? null });
  const open = mine.filter((r) => r.status === "open" && Date.parse(r.closesAt) > now.getTime()).map(strip);
  const winnerNames = await namesFor(db, mine.map((r) => r.winnerId).filter(Boolean));
  const done = mine.filter((r) => r.status === "closed").slice(0, 10).map((r) => ({ roundId: r.roundId, teamName: r.teamName, opponentName: r.opponentName, startsAt: r.startsAt, winnerId: r.winnerId, winnerName: r.winnerId ? winnerNames.get(String(r.winnerId)) ?? "" : null, tied: r.result?.kind === "tied" }));
  return { open, done };
}

/** Season totals for a team (or a whole club), with names. */
export async function seasonBoard(db: Db, q: { teamId?: string; clubId?: string; year: string }, limit = 15) {
  const filter: any = { status: "closed", matchDate: { $gte: `${q.year}-01-01`, $lte: `${q.year}-12-31` } };
  if (q.teamId) filter.teamId = q.teamId; else if (q.clubId) filter.clubId = q.clubId;
  const rounds: any[] = await db.collection(ROUNDS).find(filter, { projection: { teamId: 1, status: 1, tally: 1, winnerId: 1 } }).limit(1500).toArray();
  const rows = leaderboard(rounds).slice(0, limit);
  const names = await namesFor(db, rows.map((r) => r.memberId));
  return rows.map((r) => ({ ...r, name: names.get(r.memberId) ?? "Player" }));
}

// ── Season awards ────────────────────────────────────────────────────────────

export interface Category { categoryId: string; name: string; description?: string }
export function cleanCategories(raw: unknown): Category[] {
  const out: Category[] = [];
  for (const c of Array.isArray(raw) ? raw : []) {
    const name = String(c?.name ?? "").trim().slice(0, 80);
    if (!name || out.some((o) => o.name.toLowerCase() === name.toLowerCase())) continue;
    out.push({ categoryId: String(c?.categoryId || "").trim() || newId("CAT"), name, ...(String(c?.description ?? "").trim() ? { description: String(c.description).trim().slice(0, 200) } : {}) });
    if (out.length >= 20) break;
  }
  return out;
}

export async function nominate(db: Db, programId: string, nominatorId: string, body: { categoryId?: string; nomineeId?: string; reason?: string }, now: Date = new Date()): Promise<VoteResult & { nominationId?: string }> {
  const p: any = await db.collection(PROGRAMS).findOne({ programId });
  if (!p) return { ok: false, error: "Awards not found", status: 404 };
  if (windowState(p, now) !== "open") return { ok: false, error: "Nominations aren't open", status: 409 };
  const [me, nominee]: any[] = await Promise.all([
    db.collection("members").findOne({ memberId: nominatorId, ...memberBelongsToClubFilter(p.clubId) }, { projection: { memberId: 1, personalInfo: 1 } }),
    db.collection("members").findOne({ memberId: String(body.nomineeId ?? ""), ...memberBelongsToClubFilter(p.clubId) }, { projection: { memberId: 1 } }),
  ]);
  if (!me) return { ok: false, error: "Only members of this club can nominate", status: 403 };
  if (isMinor(me.personalInfo?.dateOfBirth, now)) return { ok: false, error: "Nominations are made by adult members. Ask a parent or guardian to nominate for you.", status: 403 };
  if (!nominee) return { ok: false, error: "That person isn't a member of this club", status: 400 };
  const category = (p.categories ?? []).find((c: Category) => c.categoryId === body.categoryId);
  if (!category) return { ok: false, error: "Choose an award", status: 400 };
  const existing = (await db.collection(NOMS).find({ programId, nominatorId }, { projection: { nominationId: 1, categoryId: 1, nomineeId: 1, nominatorId: 1, reason: 1 } }).toArray()) as unknown as NominationLike[];
  const problem = checkNomination({ nominatorId, nomineeId: String(body.nomineeId), reason: String(body.reason ?? ""), categoryId: category.categoryId }, existing);
  if (problem) return { ok: false, error: problem, status: 400 };
  const nominationId = newId("NOM");
  await db.collection(NOMS).insertOne({ nominationId, programId, clubId: p.clubId, categoryId: category.categoryId, nomineeId: String(body.nomineeId), nominatorId, reason: String(body.reason).trim(), createdAt: now.toISOString() });
  return { ok: true, nominationId };
}

export async function withdrawNomination(db: Db, nominationId: string, nominatorId: string, now: Date = new Date()): Promise<VoteResult> {
  const n: any = await db.collection(NOMS).findOne({ nominationId, nominatorId });
  if (!n) return { ok: false, error: "Not found", status: 404 };
  const p: any = await db.collection(PROGRAMS).findOne({ programId: n.programId });
  if (!p || windowState(p, now) !== "open") return { ok: false, error: "Nominations have closed", status: 409 };
  await db.collection(NOMS).updateOne({ nominationId }, { $set: { withdrawn: true } });
  return { ok: true };
}

/** What the committee sees: each nominee per award with the reasons given, most nominated first. */
export async function nominationsView(db: Db, programId: string) {
  const rows: any[] = await db.collection(NOMS).find({ programId, withdrawn: { $ne: true } }, { projection: { _id: 0 } }).limit(3000).toArray();
  const names = await namesFor(db, rows.flatMap((r) => [String(r.nomineeId), String(r.nominatorId)]));
  const by = new Map<string, any>();
  for (const r of rows) {
    const k = `${r.categoryId}|${r.nomineeId}`;
    const g = by.get(k) ?? { categoryId: r.categoryId, nomineeId: r.nomineeId, nomineeName: names.get(String(r.nomineeId)) ?? "Member", count: 0, reasons: [] };
    g.count++; g.reasons.push({ by: names.get(String(r.nominatorId)) ?? "Member", reason: r.reason });
    by.set(k, g);
  }
  return [...by.values()].sort((a, b) => String(a.categoryId).localeCompare(String(b.categoryId)) || b.count - a.count);
}

/** Choose the winner (or joint winners) for one award. */
export async function setWinners(db: Db, programId: string, categoryId: string, memberIds: string[]): Promise<VoteResult> {
  const p: any = await db.collection(PROGRAMS).findOne({ programId });
  if (!p) return { ok: false, error: "Not found", status: 404 };
  if (p.status === "announced") return { ok: false, error: "These awards have been announced", status: 409 };
  if (!(p.categories ?? []).some((c: Category) => c.categoryId === categoryId)) return { ok: false, error: "No such award", status: 400 };
  const ids = [...new Set(memberIds.map(String).filter(Boolean))].slice(0, 5);
  if (ids.length) {
    const found = await db.collection("members").find({ memberId: { $in: ids }, ...memberBelongsToClubFilter(p.clubId) }, { projection: { memberId: 1 } }).toArray();
    if (found.length !== ids.length) return { ok: false, error: "Winners must be members of this club", status: 400 };
  }
  await db.collection(PROGRAMS).updateOne({ programId }, { $set: { [`winners.${categoryId}`]: ids } });
  return { ok: true };
}

/** Makes the winners public to the club and tells them. */
export async function announce(db: Db, programId: string, now: Date = new Date()): Promise<VoteResult & { emailed?: number }> {
  const p: any = await db.collection(PROGRAMS).findOne({ programId });
  if (!p) return { ok: false, error: "Not found", status: 404 };
  if (p.status === "announced") return { ok: false, error: "Already announced", status: 409 };
  const won = Object.entries(p.winners ?? {}).filter(([, v]) => (v as string[]).length);
  if (!won.length) return { ok: false, error: "Choose at least one winner first", status: 400 };
  await db.collection(PROGRAMS).updateOne({ programId }, { $set: { status: "announced", announcedAt: now.toISOString() } });
  const club: any = await db.collection("clubs").findOne({ $or: [{ clubId: p.clubId }, { id: p.clubId }] }, { projection: { name: 1 } });
  let emailed = 0;
  if (!isQuietHour(now)) {
    const byWinner = new Map<string, string[]>();
    for (const [cat, ids] of won) for (const id of ids as string[]) byWinner.set(id, [...(byWinner.get(id) ?? []), (p.categories.find((c: Category) => c.categoryId === cat)?.name as string) ?? "an award"]);
    const ms: any[] = await db.collection("members").find({ memberId: { $in: [...byWinner.keys()] } }, { projection: { memberId: 1, personalInfo: 1, firstName: 1, contact: 1, notificationPrefs: 1 } }).toArray();
    for (const m of ms) {
      const to = emailOf(m);
      if (!to || m.notificationPrefs?.enabled === false) continue;
      const mail = buildWinnerEmail({ name: String(m.personalInfo?.firstName ?? m.firstName ?? ""), clubName: String(club?.name ?? p.clubName ?? "your club"), awards: byWinner.get(String(m.memberId)) ?? [], seasonYear: String(p.seasonYear) });
      const r = await sendEmail({ to, subject: mail.subject, html: mail.html, text: mail.text }).catch(() => ({ success: false }));
      if ((r as any)?.success) emailed++;
    }
  }
  return { ok: true, emailed };
}

/** Programs whose window has ended move on to judging by themselves. */
export async function closeDuePrograms(db: Db, now: Date = new Date()): Promise<{ closed: number }> {
  const open: any[] = await db.collection(PROGRAMS).find({ status: "open" }, { projection: { programId: 1, opensAt: 1, closesAt: 1, status: 1 } }).limit(300).toArray();
  let closed = 0;
  for (const p of open) if (windowState(p, now) === "closed") { await db.collection(PROGRAMS).updateOne({ programId: p.programId }, { $set: { status: "judging" } }); closed++; }
  return { closed };
}

export async function processAwards(db: Db, now: Date = new Date()) {
  const opened = await openDueRounds(db, now);
  const closed = await closeDueRounds(db, now);
  const programs = await closeDuePrograms(db, now);
  return { opened: opened.opened, emailed: opened.emailed, closed: closed.closed, programsClosed: programs.closed };
}
