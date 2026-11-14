// Registration summary for a member: the ONLY data the member's registration pages (and the limited
// club/association admin view) are built from. It deliberately contains no contact details, address,
// medical, emergency, family, blue-card or login information.

import type { Db } from "mongodb";
import { computePlayerStats, type PlayerStats } from "@/lib/members/playerStats";
import { buildTeamHistory, type TeamHistoryRow } from "@/lib/members/teamHistory";
import { ageInYear } from "@/lib/registrations/pricing";

type Doc = Record<string, any>;

export const ADMIN_VIEW_ROLES = [
  "super-admin", "association-admin", "assoc-committee", "assoc-registrar",
  "club-admin", "club-committee", "registrar",
];

const ASSOC_ROLES = ["association-admin", "assoc-committee", "assoc-registrar"];

export interface LevelInfo { kind: "club" | "association"; id: string; name: string; primary: string; secondary: string }
export interface FeeSummary { sent: number; paid: number; outstanding: number }

export interface RegistrationSummary {
  member: { memberId: string; name: string; dateOfBirth: string; age: number | null; memberNumber: string; status: string };
  levels: LevelInfo[];
  registrations: {
    season: number; level: string; levelKind: "club" | "association"; levelId: string;
    category: string; status: string; roles: string[]; fee: number; fees: { name: string; amount: number }[];
  }[];
  fees: { bySeason: Record<string, FeeSummary & { byLevel: Record<string, FeeSummary> }>; total: FeeSummary };
  teams: { season: string; team: string; division: string; club: string; status: "selected" | "shadow" | "withdrawn"; position?: string; number?: string }[];
  nominations: { nominationId: string; window: string; status: string; date?: string }[];
  stats: PlayerStats | null;
  history: TeamHistoryRow[];
}

const PAID = new Set(["paid", "completed", "succeeded", "success"]);
const money = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : 0);
const empty = (): FeeSummary => ({ sent: 0, paid: 0, outstanding: 0 });

/** Pure: totals sent / paid / outstanding per season and level from registrations and payments. */
export function summariseFees(
  registrations: RegistrationSummary["registrations"],
  payments: Doc[],
  levelName: (kind: string, id: string) => string,
) {
  const bySeason: RegistrationSummary["fees"]["bySeason"] = {};
  const get = (season: string) => (bySeason[season] ??= { ...empty(), byLevel: {} });

  // Sent = every fee line on the member's registrations (the club registration holds the full stack;
  // association registrations repeat their own line, so count lines from club registrations only).
  for (const r of registrations.filter((x) => x.levelKind === "club")) {
    const s = get(String(r.season));
    for (const f of r.fees as any[]) {
      const key = f.associationId ? levelName("association", f.associationId) : levelName("club", f.clubId ?? r.levelId);
      const lvl = (s.byLevel[key] ??= empty());
      lvl.sent += money(f.amount);
      s.sent += money(f.amount);
    }
  }
  for (const p of payments) {
    if (!PAID.has(String(p.status ?? "").toLowerCase())) continue;
    const season = String(p.seasonYear ?? new Date(p.createdAt ?? Date.now()).getFullYear());
    const s = get(season);
    for (const it of (p.lineItems ?? []) as Doc[]) {
      const key = it.associationId ? levelName("association", it.associationId) : levelName("club", it.clubId ?? "");
      const lvl = (s.byLevel[key] ??= empty());
      lvl.paid += money(it.amount);
      s.paid += money(it.amount);
    }
  }
  const total = empty();
  for (const s of Object.values(bySeason)) {
    for (const l of Object.values(s.byLevel)) l.outstanding = Math.max(l.sent - l.paid, 0);
    s.outstanding = Math.max(s.sent - s.paid, 0);
    total.sent += s.sent; total.paid += s.paid; total.outstanding += s.outstanding;
  }
  return { bySeason, total };
}

export async function loadRegistrationSummary(db: Db, memberId: string): Promise<RegistrationSummary | null> {
  const m = await db.collection("members").findOne(
    { memberId },
    { projection: { memberId: 1, personalInfo: 1, clubId: 1, membership: 1, teams: 1, playerInfo: 1 } },
  );
  if (!m) return null;

  const [clubRegs, assocRegs, payments] = await Promise.all([
    db.collection("club-registrations").find({ memberId }).sort({ seasonYear: -1 }).limit(100).toArray(),
    db.collection("association-registrations").find({ memberId }).sort({ seasonYear: -1 }).limit(200).toArray(),
    db.collection("payments").find({ memberId }).limit(500).toArray(),
  ]);

  const clubId = String(m.membership?.clubId || m.clubId || clubRegs[0]?.clubId || "");
  const clubIds = [...new Set([clubId, ...clubRegs.map((r) => String(r.clubId))].filter(Boolean))];
  const clubs = clubIds.length
    ? await db.collection("clubs").find({ $or: [{ id: { $in: clubIds } }, { clubId: { $in: clubIds } }] }).toArray()
    : [];
  const allAssocs = await db.collection("associations").find({}, { projection: { associationId: 1, name: 1, parentAssociationId: 1, colors: 1 } }).toArray();
  const assocById = new Map(allAssocs.map((a) => [String(a.associationId), a]));

  const levels: LevelInfo[] = [];
  const mainClub = clubs.find((c) => [c.id, c.clubId].map(String).includes(clubId));
  if (mainClub) {
    levels.push({ kind: "club", id: clubId, name: String(mainClub.name ?? clubId), primary: mainClub.colors?.primary || "#06054e", secondary: mainClub.colors?.secondary || "#1a1870" });
    let cur = mainClub.parentAssociationId ? assocById.get(String(mainClub.parentAssociationId)) : undefined;
    const seen = new Set<string>();
    while (cur && !seen.has(String(cur.associationId))) {
      seen.add(String(cur.associationId));
      levels.push({ kind: "association", id: String(cur.associationId), name: String(cur.name ?? cur.associationId), primary: cur.colors?.primary || "#06054e", secondary: cur.colors?.secondary || "#1a1870" });
      cur = cur.parentAssociationId ? assocById.get(String(cur.parentAssociationId)) : undefined;
    }
  }
  const clubName = new Map(clubs.flatMap((c) => [c.id, c.clubId].filter(Boolean).map((k) => [String(k), String(c.name ?? k)] as const)));
  const levelName = (kind: string, id: string) =>
    kind === "club" ? clubName.get(id) ?? (id || "Club") : String(assocById.get(id)?.name ?? id);

  const toReg = (r: Doc, kind: "club" | "association") => ({
    season: Number(r.seasonYear),
    level: levelName(kind, String(kind === "club" ? r.clubId : r.associationId)),
    levelKind: kind,
    levelId: String(kind === "club" ? r.clubId : r.associationId),
    category: String(r.registrationCategory ?? r.ageCategory ?? r.membershipType ?? ""),
    status: String(r.status ?? ""),
    roles: (r.roleIds ?? []) as string[],
    fee: money(r.totalFee),
    fees: ((r.fees ?? []) as Doc[]).map((f) => ({ name: String(f.name ?? ""), amount: money(f.amount), associationId: f.associationId, clubId: f.clubId })),
  });
  const registrations = [...clubRegs.map((r) => toReg(r, "club")), ...assocRegs.map((r) => toReg(r, "association"))]
    .sort((a, b) => b.season - a.season || (a.levelKind === "club" ? -1 : 1));

  // Teams: selected, shadow (emergency) and withdrawn, by season.
  const rosters = await db.collection("teamRosters").find({
    $or: [
      { "teams.players.id": memberId }, { "teams.players.playerId": memberId }, { "teams.players.memberId": memberId },
      { "shadowPlayers.id": memberId }, { "shadowPlayers.playerId": memberId }, { "shadowPlayers.memberId": memberId },
      { "withdrawn.id": memberId }, { "withdrawn.playerId": memberId }, { "withdrawn.memberId": memberId },
      { "teams.coach.memberId": memberId }, { "teams.assistantCoach.memberId": memberId }, { "teams.manager.memberId": memberId }, { "teams.staff.memberId": memberId },
    ],
  }).limit(200).toArray();
  const is = (p: Doc) => [p.id, p.playerId, p.memberId].includes(memberId);
  const teams: RegistrationSummary["teams"] = [];
  for (const r of rosters) {
    const base = { season: String(r.season ?? ""), division: String(r.division ?? ""), club: levelName("club", String(r.clubId ?? "")) };
    for (const t of (r.teams ?? []) as Doc[]) {
      const p = ((t.players ?? []) as Doc[]).find(is);
      if (p) teams.push({ ...base, team: String(t.name ?? ""), status: "selected", position: p.position || undefined, number: p.number || undefined });
    }
    const sh = ((r.shadowPlayers ?? []) as Doc[]).find(is);
    if (sh) teams.push({ ...base, team: `${base.division} shadow squad`, status: "shadow", position: sh.position || undefined, number: sh.number || undefined });
    if (((r.withdrawn ?? []) as Doc[]).some(is)) teams.push({ ...base, team: `${base.division} (unavailable)`, status: "withdrawn" });
  }
  teams.sort((a, b) => b.season.localeCompare(a.season));

  // Nominations
  const noms = await db.collection("rep_nominations").find({ memberId }).sort({ createdAt: -1 }).limit(50).toArray();
  const winIds = [...new Set(noms.map((n) => String(n.windowId)).filter(Boolean))];
  const wins = winIds.length ? await db.collection("nomination_windows").find({ windowId: { $in: winIds } }, { projection: { windowId: 1, name: 1, title: 1 } }).toArray() : [];
  const winName = new Map(wins.map((w) => [String(w.windowId), String(w.name ?? w.title ?? w.windowId)]));
  const nominations = noms.map((n) => ({
    nominationId: String(n.nominationId ?? n._id), window: winName.get(String(n.windowId)) ?? String(n.windowId ?? ""),
    status: String(n.status ?? ""), date: n.createdAt ? new Date(n.createdAt).toISOString() : undefined,
  }));

  // Stats + team history
  const lineups = await db.collection("fixture_lineups").find({ $or: [{ "players.memberId": memberId }, { "staff.memberId": memberId }] }, { projection: { fixtureId: 1, teamId: 1, players: 1, staff: 1 } }).limit(2000).toArray();
  const fixtures = lineups.length
    ? await db.collection("league_fixtures").find({ fixtureId: { $in: lineups.map((l) => String(l.fixtureId)) } }, { projection: { fixtureId: 1, scheduledStart: 1, status: 1, matchEvents: 1 } }).toArray()
    : [];
  const stats = computePlayerStats(memberId, lineups, fixtures, new Date(), m.playerInfo?.appearances, m.playerInfo?.goals);
  const lineupTeamIds = [...new Set(lineups.map((l) => String(l.teamId)).filter(Boolean))];
  const teamDocs = lineupTeamIds.length ? await db.collection("teams").find({ teamId: { $in: lineupTeamIds } }, { projection: { teamId: 1, name: 1, displayName: 1 } }).toArray() : [];
  const history = buildTeamHistory({ memberId, rosters, memberTeams: m.teams ?? [], lineups, fixtures, teamNames: new Map(teamDocs.map((t) => [String(t.teamId), String(t.displayName ?? t.name ?? t.teamId)])) });

  const pi = m.personalInfo ?? {};
  const dob = String(pi.dateOfBirth ?? "").slice(0, 10);
  return {
    member: {
      memberId,
      name: `${pi.firstName ?? ""} ${pi.lastName ?? ""}`.trim(),
      dateOfBirth: dob,
      age: ageInYear(dob, new Date().getFullYear()),
      memberNumber: String(m.membership?.memberNumber ?? memberId),
      status: String(m.membership?.status ?? ""),
    },
    levels,
    registrations,
    fees: summariseFees(registrations, payments, levelName),
    teams,
    nominations,
    stats,
    history,
  };
}

/** Admin viewers see only the fee lines for levels they run (club admins see the whole club stack). */
export function limitForAdmin(
  s: RegistrationSummary,
  viewer: { role?: string; associationId?: string | null },
): RegistrationSummary {
  const assocId = viewer.associationId;
  if (!assocId || !ASSOC_ROLES.includes(String(viewer.role))) return s;
  const mine = s.levels.find((l) => l.kind === "association" && l.id === assocId)?.name;
  return {
    ...s,
    registrations: s.registrations.filter((r) => r.levelKind === "association" && r.levelId === assocId),
    fees: {
      bySeason: Object.fromEntries(Object.entries(s.fees.bySeason).map(([y, v]) => {
        const lvl = mine && v.byLevel[mine] ? { [mine]: v.byLevel[mine] } : {};
        const l = lvl[mine ?? ""] ?? empty();
        return [y, { ...l, byLevel: lvl }];
      })),
      total: Object.values(s.fees.bySeason).reduce((t, v) => {
        const l = (mine && v.byLevel[mine]) || empty();
        return { sent: t.sent + l.sent, paid: t.paid + l.paid, outstanding: t.outstanding + l.outstanding };
      }, empty()),
    },
  };
}
