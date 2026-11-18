// lib/draw/service.ts
// Loads what the draw needs (teams, pitches, what is already booked, officials and their conflicts), builds the plan,
// and saves it. The plan is always rebuilt on the server when saving, so what is saved is what the rules produce.

import type { Db } from "mongodb";
import { randomBytes, randomUUID } from "crypto";
import type { Busy, DrawPitch } from "@/lib/draw/generate";
import { generateMultiDraw, type MultiDrawResult } from "@/lib/draw/multi";
import { findClashes, type Clash, type SchedFixture } from "@/lib/draw/clashes";
import { suggestUmpires, tierFromLabel, type Gap, type Official, type Suggestion, type UmpMatch } from "@/lib/draw/umpires";
import { DEFAULT_OFFSET, addDays, isClock, isDay } from "@/lib/draw/time";
import { activeRosterMemberIds, immediateFamilyRelatedMemberIds, memberPrimaryClubIdFromDoc } from "@/lib/officiating/umpireCoiAndAvailability";

export interface DivisionPick { seasonCompetitionId: string; teamIds: string[] }
export interface DrawInput {
  divisions: DivisionPick[];
  /** Keep a club's meetings together across divisions (default true). */
  alignClubs?: boolean;
  doubleRound?: boolean;
  startDate: string;
  roundGapDays?: number;
  slotTimes: string[];
  slotMinutes?: number;
  bufferMinutes?: number;
  pitchIds?: string[];
  blackoutDates?: string[];
  suggestUmpires?: boolean;
  umpireSlots?: number;
  replace?: boolean;
}
export interface PlanFixture {
  key: string; seasonCompetitionId: string; competitionId: string; divisionName: string; round: number;
  homeTeamId: string; awayTeamId: string; homeName: string; awayName: string;
  date: string | null; start: string | null; end: string | null; pitchId: string | null; venueId: string | null; venueName: string | null; addressLine: string | null;
  groupKey: string | null; warnings: string[]; umpires: Suggestion[];
}
export interface DrawPlan {
  fixtures: PlanFixture[];
  roundDates: Record<number, string>;
  unplaced: MultiDrawResult["unplaced"];
  homeAway: MultiDrawResult["homeAway"];
  alignment: MultiDrawResult["alignment"];
  clashes: Clash[];
  umpireGaps: (Gap & { key: string })[];
  umpireLoad: { id: string; name: string; matches: number }[];
}
export type PlanResult = { ok: true; plan: DrawPlan; scope: { associationId: string } } | { ok: false; status: number; error: string };

const FIXTURES = "league_fixtures", REGISTER = "association_official_register";

export function cleanDrawInput(raw: unknown): { ok: true; value: DrawInput } | { ok: false; error: string } {
  const b = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : []);
  const rawDivs = Array.isArray(b.divisions) ? b.divisions : [];
  const divisions: DivisionPick[] = rawDivs.map((d) => { const o = (d && typeof d === "object" ? d : {}) as Record<string, unknown>; return { seasonCompetitionId: String(o.seasonCompetitionId ?? "").trim(), teamIds: [...new Set(list(o.teamIds))] }; }).filter((d) => d.seasonCompetitionId);
  if (!divisions.length) return { ok: false, error: "Choose at least one division" };
  if (new Set(divisions.map((d) => d.seasonCompetitionId)).size !== divisions.length) return { ok: false, error: "A division is listed twice" };
  if (divisions.length > 12) return { ok: false, error: "Too many divisions for one draw" };
  if (divisions.some((d) => d.teamIds.length < 2)) return { ok: false, error: "Each division needs at least two teams" };
  if (divisions.some((d) => d.teamIds.length > 40)) return { ok: false, error: "Too many teams in one division" };
  const all = divisions.flatMap((d) => d.teamIds);
  if (new Set(all).size !== all.length) return { ok: false, error: "A team is in more than one division" };
  if (!isDay(b.startDate)) return { ok: false, error: "Use a start date like 2026-03-07" };
  const slotTimes = [...new Set(list(b.slotTimes))].filter(isClock);
  if (!slotTimes.length) return { ok: false, error: "Add at least one start time, like 08:30" };
  const num = (v: unknown, d: number, lo: number, hi: number) => { const n = Number(v ?? d); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d; };
  return { ok: true, value: {
    divisions, alignClubs: b.alignClubs !== false, doubleRound: !!b.doubleRound, startDate: b.startDate, roundGapDays: num(b.roundGapDays, 7, 1, 28), slotTimes,
    slotMinutes: num(b.slotMinutes, 90, 30, 240), bufferMinutes: num(b.bufferMinutes, 15, 0, 120),
    pitchIds: list(b.pitchIds), blackoutDates: list(b.blackoutDates).filter(isDay), suggestUmpires: b.suggestUmpires !== false,
    umpireSlots: num(b.umpireSlots, 2, 0, 4), replace: !!b.replace,
  } };
}

export async function buildPlan(db: Db, input: DrawInput): Promise<PlanResult> {
  const scs = await Promise.all(input.divisions.map((d) => db.collection("season_competitions").findOne({ seasonCompetitionId: d.seasonCompetitionId })));
  if (scs.some((x) => !x)) return { ok: false, status: 404, error: "Season competition not found" };
  const associationId = String(scs[0]!.owningAssociationId ?? "");
  if (scs.some((x) => String(x!.owningAssociationId ?? "") !== associationId)) return { ok: false, status: 400, error: "All divisions must belong to the same association" };
  const comps = await db.collection("competitions").find({ competitionId: { $in: scs.map((x) => String(x!.competitionId ?? "")) } }).toArray();
  const divName = (sc: Record<string, unknown>) => String(sc.competitionName || comps.find((c) => c.competitionId === sc.competitionId)?.name || sc.seasonCompetitionId);

  const allTeamIds = input.divisions.flatMap((d) => d.teamIds);
  const teamDocs = await db.collection("teams").find({ teamId: { $in: allTeamIds } }).toArray();
  if (teamDocs.length !== allTeamIds.length) return { ok: false, status: 400, error: "One or more teams were not found" };
  const teams = allTeamIds.map((id) => { const t = teamDocs.find((d) => d.teamId === id)!; return { teamId: id, clubId: (t.clubId as string) ?? null, homeVenueId: (t.homeVenueId as string) ?? null, name: String(t.name ?? t.teamName ?? id), roster: t }; });
  const teamById = new Map(teams.map((t) => [t.teamId, t]));
  const nameOf = new Map(teams.map((t) => [t.teamId, t.name]));
  const clubOf: Record<string, string | null> = Object.fromEntries(teams.map((t) => [t.teamId, t.clubId]));

  const venues = await db.collection("association_venues").find({ associationId, status: "active" }).toArray();
  const pitches: DrawPitch[] = venues.flatMap((v) => ((v.pitches ?? []) as { pitchId: string; label?: string }[]).map((p) => {
    const a = v.address as Record<string, string> | undefined;
    return { pitchId: p.pitchId, venueId: String(v.venueId), venueName: `${v.name ?? "Venue"}${p.label ? ` · ${p.label}` : ""}`, addressLine: a ? [a.street, a.suburb, a.city].filter(Boolean).join(", ") : null };
  }));
  const chosen = input.pitchIds?.length ? pitches.filter((p) => input.pitchIds!.includes(p.pitchId)) : pitches;
  if (!chosen.length) return { ok: false, status: 400, error: "No pitches available. Add a venue with pitches first" };

  // What is already booked in this association over the draw's dates.
  const slotMs = (input.slotMinutes ?? 90) * 60_000, biggest = Math.max(...input.divisions.map((d) => d.teamIds.length)), rounds = (biggest - (biggest % 2 ? 0 : 1)) * (input.doubleRound ? 2 : 1);
  const from = addDays(input.startDate, -1), to = addDays(input.startDate, (input.roundGapDays ?? 7) * (rounds + 12) + 2);
  const existing = await db.collection(FIXTURES).find({ owningAssociationId: associationId, scheduledStart: { $gte: from, $lte: `${to}T23:59` }, status: { $nin: ["cancelled"] } }).toArray();
  const picked = new Set(input.divisions.map((d) => d.seasonCompetitionId));
  const others = input.replace ? existing.filter((f) => !picked.has(String(f.seasonCompetitionId))) : existing;
  const win = (f: Record<string, unknown>): Busy | null => { const s = Date.parse(String(f.scheduledStart ?? "")); if (Number.isNaN(s)) return null; const e = Date.parse(String(f.scheduledEnd ?? "")); return { start: s, end: Number.isNaN(e) || e <= s ? s + slotMs : e }; };
  const pitchBusy: Record<string, Busy[]> = {}, teamBusy: Record<string, Busy[]> = {}, officialBusy: Record<string, { start: number; end: number; venueId?: string | null }[]> = {};
  for (const f of others) {
    const w = win(f); if (!w) continue;
    if (f.pitchId) (pitchBusy[String(f.pitchId)] ??= []).push(w);
    for (const t of [f.homeTeamId, f.awayTeamId]) if (allTeamIds.includes(String(t))) (teamBusy[String(t)] ??= []).push(w);
    for (const u of (f.umpires ?? []) as { umpireId?: string; isStandby?: boolean }[]) if (u.umpireId && !u.isStandby) (officialBusy[u.umpireId] ??= []).push({ ...w, venueId: (f.venueId as string) ?? null });
  }

  const draw = generateMultiDraw({
    divisions: input.divisions.map((d, i) => ({ id: d.seasonCompetitionId, name: divName(scs[i] as Record<string, unknown>), doubleRound: input.doubleRound, teams: d.teamIds.map((id) => teamById.get(id)!) })),
    alignClubs: input.alignClubs, startDate: input.startDate, roundGapDays: input.roundGapDays, slotTimes: input.slotTimes, slotMinutes: input.slotMinutes ?? 90, bufferMinutes: input.bufferMinutes,
    pitches: chosen, blackoutDates: input.blackoutDates, pitchBusy, teamBusy, offset: DEFAULT_OFFSET,
  });
  const scById = new Map(scs.map((x) => [String(x!.seasonCompetitionId), x as Record<string, unknown>]));
  const fixtures: PlanFixture[] = draw.fixtures.map((f, i) => {
    const sc = scById.get(f.divisionId)!;
    return { key: `d${i}`, seasonCompetitionId: f.divisionId, competitionId: String(sc.competitionId ?? ""), divisionName: divName(sc), round: f.round, homeTeamId: f.homeTeamId, awayTeamId: f.awayTeamId, homeName: nameOf.get(f.homeTeamId) ?? f.homeTeamId, awayName: nameOf.get(f.awayTeamId) ?? f.awayTeamId, date: f.date, start: f.start, end: f.end, pitchId: f.pitchId, venueId: f.venueId, venueName: f.venueName, addressLine: f.addressLine, groupKey: f.groupKey, warnings: f.warnings, umpires: [] };
  });

  let umpireGaps: DrawPlan["umpireGaps"] = [], umpireLoad: DrawPlan["umpireLoad"] = [];
  const officialNames: Record<string, string> = {}, officialClub: Record<string, string | null> = {};
  if (input.suggestUmpires !== false && (input.umpireSlots ?? 2) > 0) {
    const reg = await db.collection(REGISTER).find({ associationId, isActive: { $ne: false } }).toArray();
    const memberIds = reg.map((r) => String(r.memberId ?? "")).filter(Boolean);
    const members = memberIds.length ? await db.collection("members").find({ memberId: { $in: memberIds } }).toArray() : [];
    const byMember = new Map(members.map((m) => [String(m.memberId), m]));
    const rosters = new Map(teams.map((t) => [t.teamId, activeRosterMemberIds(t.roster as { roster?: unknown })]));
    const days = [...new Set(fixtures.map((f) => f.date).filter(Boolean))] as string[];
    const away = memberIds.length && days.length ? await db.collection("member_availability").find({ memberId: { $in: memberIds }, kind: "unavailable", from: { $lte: days[days.length - 1] }, to: { $gte: days[0] } }).toArray() : [];

    const officials: Official[] = reg.map((r) => {
      const id = String(r.memberId || r.umpireNumber || r._id), mem = r.memberId ? byMember.get(String(r.memberId)) : undefined;
      const relatives = mem ? immediateFamilyRelatedMemberIds(mem) : new Set<string>();
      const conflictTeamIds = teams.filter((t) => [...relatives].some((rel) => rosters.get(t.teamId)?.has(rel))).map((t) => t.teamId);
      const mid = String(r.memberId ?? ""), blocked = away.filter((a) => a.memberId === mid);
      const unavailableDays = days.filter((d) => blocked.some((a) => String(a.from) <= d && String(a.to) >= d));
      const clubId = (r.primaryClubId as string) || (mem ? memberPrimaryClubIdFromDoc(mem) : null);
      officialNames[id] = String(r.displayName ?? id); officialClub[id] = clubId;
      return { id, name: String(r.displayName ?? id), clubId, tier: tierFromLabel(r.levelLabel as string, (r.qualificationCodes as string[]) ?? []), unavailable: r.allocationAvailability === "unavailable", unavailableDays, conflictTeamIds };
    });
    const matches: UmpMatch[] = fixtures.filter((f) => f.start && f.end).map((f) => ({ id: f.key, start: Date.parse(f.start!), end: Date.parse(f.end!), venueId: f.venueId, homeTeamId: f.homeTeamId, awayTeamId: f.awayTeamId, slots: input.umpireSlots ?? 2 }));
    const r = suggestUmpires(matches, officials, { clubOf, offset: DEFAULT_OFFSET, busy: officialBusy });
    for (const s of r.suggestions) fixtures.find((f) => f.key === s.matchId)?.umpires.push(s);
    for (const f of fixtures) f.umpires.sort((a, b) => a.slotIndex - b.slotIndex);
    umpireGaps = r.gaps.map((g) => ({ ...g, key: g.matchId }));
    umpireLoad = Object.entries(r.load).map(([id, matches]) => ({ id, name: officialNames[id] ?? id, matches })).sort((a, b) => b.matches - a.matches);
  }

  const sched: SchedFixture[] = fixtures.map((f) => ({ id: f.key, start: f.start ? Date.parse(f.start) : null, end: f.end ? Date.parse(f.end) : null, pitchId: f.pitchId, venueId: f.venueId, homeTeamId: f.homeTeamId, awayTeamId: f.awayTeamId, umpires: f.umpires.map((u) => u.umpireId) }));
  const clashes = findClashes(sched, { bufferMinutes: input.bufferMinutes, clubOf, umpireClub: officialClub, nameOf: (id) => nameOf.get(id) ?? officialNames[id] ?? id });
  return { ok: true, plan: { fixtures, roundDates: draw.roundDates, unplaced: draw.unplaced, homeAway: draw.homeAway, alignment: draw.alignment, clashes, umpireGaps, umpireLoad }, scope: { associationId } };
}

/** Saves the plan as unpublished fixtures, with umpire allocations when asked. Returns what was written. */
export async function savePlan(db: Db, scope: { associationId: string }, plan: DrawPlan, o: { userId: string; replace?: boolean; withUmpires?: boolean }) {
  const now = new Date().toISOString();
  const comps = [...new Set(plan.fixtures.map((f) => f.seasonCompetitionId))];
  if (o.replace) for (const sc of comps) await db.collection(FIXTURES).deleteMany({ seasonCompetitionId: sc });
  const stamp = Date.now();
  const docs = plan.fixtures.map((f, i) => ({
    fixtureId: `fx-${f.seasonCompetitionId}-${f.round}-${i}-${stamp}`, seasonCompetitionId: f.seasonCompetitionId, competitionId: f.competitionId, owningAssociationId: scope.associationId,
    round: f.round, homeTeamId: f.homeTeamId, awayTeamId: f.awayTeamId, status: "scheduled", venueId: f.venueId, venueName: f.venueName, pitchId: f.pitchId, addressLine: f.addressLine,
    scheduledStart: f.start, scheduledEnd: f.end, timezone: "Australia/Brisbane", published: false, publishedAt: null,
    result: null, resultStatus: null, resultSubmittedAt: null, resultSubmittedBy: null, resultApprovedAt: null, resultApprovedBy: null, legacyMatchId: null,
    umpires: o.withUmpires && f.umpires.length ? f.umpires.map((u) => ({ umpireType: u.umpireType, umpireId: u.umpireId, allocationStatus: "assigned", dateAllocated: now, dateNotified: null, dateAccepted: null, dateDeclined: null, dateUpdated: now, isStandby: false })) : null,
    matchEvents: null, matchLevel: "league", createdAt: now, createdBy: o.userId,
  }));
  if (docs.length) await db.collection(FIXTURES).insertMany(docs);

  let assignments = 0;
  if (o.withUmpires) {
    const rows = plan.fixtures.flatMap((f, i) => f.umpires.map((u, slotIndex) => ({
      assignmentId: `ua-${randomUUID()}`, fixtureId: docs[i].fixtureId, seasonCompetitionId: f.seasonCompetitionId, associationId: scope.associationId, slotIndex, umpireId: u.umpireId, umpireType: u.umpireType,
      qualificationTier: null, isStandby: false, allocationStatus: "assigned", dateNotified: null, dateAccepted: null, dateDeclined: null,
      responseToken: randomBytes(32).toString("hex"), tokenExpiresAt: new Date(Date.now() + 14 * 86_400_000).toISOString(), coiOverride: false, coiOverrideReason: null,
      assignedBy: o.userId, round: f.round, scheduledStart: f.start, venueName: f.venueName, umpireDisplayName: u.umpireName, createdAt: now, updatedAt: now,
    })));
    if (rows.length) await db.collection("umpire_assignments").insertMany(rows);
    assignments = rows.length;
  }
  return { fixtures: docs.length, umpireAssignments: assignments, competitions: comps.length };
}

/** Clash check on the fixtures already saved for a competition. */
export async function checkCompetition(db: Db, seasonCompetitionId: string, bufferMinutes = 15): Promise<{ clashes: Clash[]; fixtures: number } | null> {
  const sc = await db.collection("season_competitions").findOne({ seasonCompetitionId });
  if (!sc) return null;
  const fx = await db.collection(FIXTURES).find({ owningAssociationId: String(sc.owningAssociationId ?? ""), status: { $nin: ["cancelled"] } }).toArray();
  const teamIds = [...new Set(fx.flatMap((f) => [String(f.homeTeamId), String(f.awayTeamId)]))];
  const teams = teamIds.length ? await db.collection("teams").find({ teamId: { $in: teamIds } }).toArray() : [];
  const clubOf = Object.fromEntries(teams.map((t) => [String(t.teamId), (t.clubId as string) ?? null]));
  const names = Object.fromEntries(teams.map((t) => [String(t.teamId), String(t.name ?? t.teamName ?? t.teamId)]));
  const slotMs = 90 * 60_000;
  const sched: SchedFixture[] = fx.map((f) => { const s = Date.parse(String(f.scheduledStart ?? "")), e = Date.parse(String(f.scheduledEnd ?? "")); const ok = !Number.isNaN(s); return { id: String(f.fixtureId), start: ok ? s : null, end: ok ? (Number.isNaN(e) || e <= s ? s + slotMs : e) : null, pitchId: (f.pitchId as string) ?? null, venueId: (f.venueId as string) ?? null, homeTeamId: String(f.homeTeamId), awayTeamId: String(f.awayTeamId), umpires: ((f.umpires ?? []) as { umpireId?: string; isStandby?: boolean }[]).filter((u) => u.umpireId && !u.isStandby).map((u) => u.umpireId!) }; });
  const mine = new Set(fx.filter((f) => f.seasonCompetitionId === seasonCompetitionId).map((f) => String(f.fixtureId)));
  const clashes = findClashes(sched, { bufferMinutes, clubOf, nameOf: (id) => names[id] ?? id }).filter((c) => c.fixtureIds.some((id) => mine.has(id)));
  return { clashes, fixtures: mine.size };
}
