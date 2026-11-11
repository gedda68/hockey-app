// lib/clubs/clubPortalData.ts
// Data for the club site (club portal): dashboard counts, members with their
// teams + positions, teams with current players/staff, and upcoming fixtures.
//
// A club's members = members whose primary clubId is the club, plus members
// with a club registration for it (e.g. players who also play for this club).

import type { Db, Document } from "mongodb";
import { FIXTURE_LINEUPS_COLLECTION } from "@/lib/db/schemas/fixtureLineup.schema";

type Doc = Record<string, any>;

export const PLAYER_ROLE_IDS = new Set(["role-player", "role-junior-player", "role-social-player"]);
export const isCoachRole = (roleId: string) => /coach/i.test(roleId);
export const isPlayerRole = (roleId: string) => PLAYER_ROLE_IDS.has(roleId);

const ROLE_LABEL: Record<string, string> = {
  "role-player": "Player",
  "role-junior-player": "Junior Player",
  "role-social-player": "Social Player",
  "role-coach": "Coach",
  "role-team-manager": "Team Manager",
  "role-manager": "Team Manager",
  "role-umpire": "Umpire",
  "role-committee-member": "Committee Member",
  "role-president": "President",
  "role-treasurer": "Treasurer",
  "role-secretary": "Secretary",
  "role-volunteer": "Volunteer",
  "role-parent-guardian": "Parent/Guardian",
  "role-social-member": "Social Member",
  "role-life-member": "Life Member",
};
export const roleLabel = (roleId: string) =>
  ROLE_LABEL[roleId] ?? roleId.replace(/^role-/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export async function resolveClub(db: Db, clubIdOrSlug: string): Promise<Doc | null> {
  return db.collection("clubs").findOne({ $or: [{ id: clubIdOrSlug }, { slug: clubIdOrSlug }] });
}

export function clubMemberFilter(clubId: string): Document {
  return { $or: [{ clubId }, { "clubRegistrations.clubId": clubId }] };
}

export const isActiveMember = (m: Doc) =>
  /^active$/i.test(String(m.membership?.status ?? "")) && m.status?.banned !== true;

// ── Dashboard ────────────────────────────────────────────────────────────────

export interface ClubMemberStats {
  total: number;
  active: number;
  inactive: number;
  players: number;
  activePlayers: number;
  coaches: number;
  activeCoaches: number;
}

export async function getClubMemberStats(db: Db, club: Doc): Promise<ClubMemberStats> {
  const clubId = String(club.id);
  const members = await db
    .collection("members")
    .find(clubMemberFilter(clubId), { projection: { memberId: 1, roles: 1, membership: 1, status: 1 } })
    .toArray();
  const teams = await db
    .collection("teams")
    .find({ clubId }, { projection: { teamId: 1, roster: 1 } })
    .toArray();

  // Roles from members + roles held in this club's team rosters
  const rosterRoles = new Map<string, Set<string>>();
  for (const t of teams) {
    for (const r of (t.roster as Doc[]) ?? []) {
      if (!r?.memberId) continue;
      const set = rosterRoles.get(String(r.memberId)) ?? new Set<string>();
      if (r.roleId) set.add(String(r.roleId));
      if (r.roleCategory === "Participant") set.add("role-player");
      rosterRoles.set(String(r.memberId), set);
    }
  }
  // People named on team sheets count too
  const lineups = teams.length
    ? await db.collection(FIXTURE_LINEUPS_COLLECTION).find({ teamId: { $in: teams.map((t) => String(t.teamId)) } }, { projection: { players: 1, staff: 1 } }).toArray()
    : [];
  for (const l of lineups) {
    // Players selected on a team sheet (who took the field) count as players
    for (const p of (l.players as Doc[]) ?? []) {
      if (!p?.memberId || p.didNotPlay) continue;
      const set = rosterRoles.get(String(p.memberId)) ?? new Set<string>();
      set.add("role-player");
      rosterRoles.set(String(p.memberId), set);
    }
    for (const s of (l.staff as Doc[]) ?? []) {
      if (!s?.memberId || !/coach/i.test(String(s.role ?? ""))) continue;
      const set = rosterRoles.get(String(s.memberId)) ?? new Set<string>();
      set.add("role-coach");
      rosterRoles.set(String(s.memberId), set);
    }
  }

  const players = new Set<string>();
  const coaches = new Set<string>();
  let active = 0;
  const activeIds = new Set<string>();
  for (const m of members) {
    const id = String(m.memberId);
    const roles = new Set<string>([...((m.roles as string[]) ?? []), ...(rosterRoles.get(id) ?? [])]);
    if ([...roles].some(isPlayerRole)) players.add(id);
    if ([...roles].some(isCoachRole)) coaches.add(id);
    if (isActiveMember(m)) {
      active++;
      activeIds.add(id);
    }
  }
  return {
    total: members.length,
    active,
    inactive: members.length - active,
    players: players.size,
    activePlayers: [...players].filter((id) => activeIds.has(id)).length,
    coaches: coaches.size,
    activeCoaches: [...coaches].filter((id) => activeIds.has(id)).length,
  };
}

// ── Teams ────────────────────────────────────────────────────────────────────

export type TeamCategory = "mens" | "womens" | "masters-men" | "masters-women" | "junior-boys" | "junior-girls";

export const TEAM_CATEGORY_LABEL: Record<TeamCategory, string> = {
  mens: "Men",
  womens: "Women",
  "masters-men": "Masters Men",
  "masters-women": "Masters Women",
  "junior-boys": "Junior Boys",
  "junior-girls": "Junior Girls",
};
export const TEAM_CATEGORY_ORDER: TeamCategory[] = ["mens", "womens", "masters-men", "masters-women", "junior-boys", "junior-girls"];

/**
 * Team gender "mixed" (Altius labels BHA men's/boys' grades "Coed") counts as
 * men's/boys' unless the competition name says women/girls.
 */
export function teamCategory(team: { ageCategory?: string; gender?: string; name?: string; grade?: string }): TeamCategory {
  const text = `${team.name ?? ""} ${team.grade ?? ""}`;
  const female = team.gender === "female" || /\b(women|womens|women's|ladies|girls)\b/i.test(text);
  const age = String(team.ageCategory ?? "senior").toLowerCase();
  if (age === "masters") return female ? "masters-women" : "masters-men";
  if (age === "junior") return female ? "junior-girls" : "junior-boys";
  return female ? "womens" : "mens";
}

export interface ClubTeamPerson {
  memberId: string;
  name: string;
  role: string;
  /** Registered to the team (roster) vs. played as a fill-in. */
  registered: boolean;
  /** Games in the team's lineups. */
  games: number;
  /** Played in the team's most recent recorded lineup. */
  inLatestLineup: boolean;
  shirtNumber: number | null;
  isCaptain: boolean;
  isGoalkeeper: boolean;
}

export interface ClubTeamOverview {
  teamId: string;
  name: string;
  grade: string | null;
  season: string | null;
  seasonCompetitionId: string | null;
  category: TeamCategory;
  latestMatch: { fixtureId: string; dateTime: string | null } | null;
  players: ClubTeamPerson[];
  staff: ClubTeamPerson[];
}

const nameOf = (m: Doc | undefined, fallback: string) => {
  const pi = m?.personalInfo ?? {};
  return String(pi.displayName || [pi.firstName, pi.lastName].filter(Boolean).join(" ") || fallback);
};

export async function getClubTeamsOverview(
  db: Db,
  club: Doc,
  opts: { season?: string; /** Just this team (its own season). */ teamId?: string } = {},
): Promise<{ seasons: string[]; season: string | null; teams: ClubTeamOverview[] }> {
  const clubId = String(club.id);
  const allTeams = await db
    .collection("teams")
    .find({ clubId, status: { $ne: "archived" } }, { projection: { teamId: 1, name: 1, displayName: 1, grade: 1, season: 1, seasonCompetitionId: 1, ageCategory: 1, gender: 1, division: 1, roster: 1, leadership: 1 } })
    .toArray();
  const seasons = [...new Set(allTeams.map((t) => String(t.season ?? "")).filter(Boolean))].sort().reverse();
  const only = opts.teamId ? allTeams.find((t) => String(t.teamId) === opts.teamId) : undefined;
  if (opts.teamId && !only) return { seasons, season: null, teams: [] };
  const season = only ? (only.season ? String(only.season) : null) : opts.season && seasons.includes(opts.season) ? opts.season : seasons[0] ?? null;
  const teams = only ? [only] : allTeams.filter((t) => !season || String(t.season ?? "") === season);
  const teamIds = teams.map((t) => String(t.teamId));

  // Lineups (week-to-week team sheets) for these teams
  const lineups = await db
    .collection(FIXTURE_LINEUPS_COLLECTION)
    .find({ teamId: { $in: teamIds } }, { projection: { fixtureId: 1, teamId: 1, players: 1, staff: 1 } })
    .toArray();
  const fixtures = lineups.length
    ? await db
        .collection("league_fixtures")
        .find({ fixtureId: { $in: [...new Set(lineups.map((l) => String(l.fixtureId)))] } }, { projection: { fixtureId: 1, scheduledStart: 1 } })
        .toArray()
    : [];
  const startOf = new Map(fixtures.map((f) => [String(f.fixtureId), String(f.scheduledStart ?? "")]));

  const memberIds = new Set<string>();
  for (const t of teams) for (const r of (t.roster as Doc[]) ?? []) if (r?.memberId) memberIds.add(String(r.memberId));
  for (const l of lineups) {
    for (const p of (l.players as Doc[]) ?? []) memberIds.add(String(p.memberId));
    for (const s of (l.staff as Doc[]) ?? []) memberIds.add(String(s.memberId));
  }
  const members = await db
    .collection("members")
    .find({ memberId: { $in: [...memberIds] } }, { projection: { memberId: 1, personalInfo: 1 } })
    .toArray();
  const memberById = new Map(members.map((m) => [String(m.memberId), m]));

  const out: ClubTeamOverview[] = teams.map((t) => {
    const teamId = String(t.teamId);
    const tl = lineups
      .filter((l) => String(l.teamId) === teamId)
      .sort((a, b) => (startOf.get(String(b.fixtureId)) ?? "").localeCompare(startOf.get(String(a.fixtureId)) ?? ""));
    const latest = tl[0];
    const latestPlayers = new Set(((latest?.players as Doc[]) ?? []).filter((p) => !p.didNotPlay).map((p) => String(p.memberId)));
    const latestStaff = new Set(((latest?.staff as Doc[]) ?? []).map((s) => String(s.memberId)));

    const people = new Map<string, ClubTeamPerson & { kind: "player" | "staff" }>();
    const upsert = (memberId: string, kind: "player" | "staff", patch: Partial<ClubTeamPerson>) => {
      const cur = people.get(`${kind}:${memberId}`) ?? {
        memberId,
        name: nameOf(memberById.get(memberId), memberId),
        role: kind === "player" ? "Player" : "Staff",
        registered: false,
        games: 0,
        inLatestLineup: false,
        shirtNumber: null,
        isCaptain: false,
        isGoalkeeper: false,
        kind,
      };
      people.set(`${kind}:${memberId}`, { ...cur, ...patch });
    };

    for (const r of (t.roster as Doc[]) ?? []) {
      if (!r?.memberId) continue;
      const kind = r.roleCategory === "Participant" || isPlayerRole(String(r.roleId)) ? "player" : "staff";
      upsert(String(r.memberId), kind, {
        registered: r.registrationType === "registered" || kind === "staff",
        role: kind === "player" ? (r.position === "Goalkeeper" ? "Goalkeeper" : "Player") : roleLabel(String(r.roleId ?? "")),
        shirtNumber: typeof r.jerseyNumber === "number" ? r.jerseyNumber : null,
        isGoalkeeper: r.position === "Goalkeeper",
      });
    }
    const captainId = t.leadership?.captain ? String(t.leadership.captain) : null;
    for (const l of tl) {
      for (const p of (l.players as Doc[]) ?? []) {
        if (p.didNotPlay) continue;
        const id = String(p.memberId);
        const cur = people.get(`player:${id}`);
        upsert(id, "player", {
          games: (cur?.games ?? 0) + 1,
          shirtNumber: cur?.shirtNumber ?? (typeof p.shirtNumber === "number" ? p.shirtNumber : null),
          isGoalkeeper: (cur?.isGoalkeeper ?? false) || p.isGoalkeeper === true,
        });
      }
      for (const s of (l.staff as Doc[]) ?? []) {
        const id = String(s.memberId);
        if (!people.has(`staff:${id}`)) upsert(id, "staff", { role: String(s.role ?? "Staff") });
      }
    }
    for (const [key, p] of people) {
      p.inLatestLineup = p.kind === "player" ? latestPlayers.has(p.memberId) : latestStaff.has(p.memberId);
      p.isCaptain = p.memberId === captainId;
      people.set(key, p);
    }

    const sortPeople = (a: ClubTeamPerson, b: ClubTeamPerson) =>
      Number(b.inLatestLineup) - Number(a.inLatestLineup) ||
      Number(b.registered) - Number(a.registered) ||
      (a.shirtNumber ?? 999) - (b.shirtNumber ?? 999) ||
      a.name.localeCompare(b.name);
    const strip = ({ kind: _k, ...p }: ClubTeamPerson & { kind: string }) => p;
    return {
      teamId,
      name: String(t.displayName || t.name),
      grade: t.grade ? String(t.grade) : t.division?.name ? String(t.division.name) : null,
      season: t.season ? String(t.season) : null,
      seasonCompetitionId: t.seasonCompetitionId ? String(t.seasonCompetitionId) : null,
      category: teamCategory({ ageCategory: t.ageCategory, gender: t.gender, name: t.name, grade: t.grade }),
      latestMatch: latest ? { fixtureId: String(latest.fixtureId), dateTime: startOf.get(String(latest.fixtureId)) || null } : null,
      players: [...people.values()].filter((p) => p.kind === "player").map(strip).sort(sortPeople),
      staff: [...people.values()].filter((p) => p.kind === "staff").map(strip).sort(sortPeople),
    };
  });

  // Hide empty placeholder teams from BYE competitions
  const visible = opts.teamId ? out : out.filter((t) => !(/\bbye\b/i.test(`${t.name} ${t.grade ?? ""}`) && t.players.length + t.staff.length === 0));
  visible.sort(
    (a, b) =>
      TEAM_CATEGORY_ORDER.indexOf(a.category) - TEAM_CATEGORY_ORDER.indexOf(b.category) ||
      a.name.localeCompare(b.name, "en", { numeric: true }),
  );
  return { seasons, season, teams: visible };
}

// ── Members: teams + positions ───────────────────────────────────────────────

/** A member's teams at this club and the roles/positions they hold. */
export interface MemberTeamLink {
  teamId: string;
  name: string;
  season: string | null;
  role: string;
}

/**
 * For each member: the club's teams they're associated with (roster, team
 * staff or lineups) and positions held (club committee + non-player roles).
 */
export async function getClubMemberLinks(
  db: Db,
  club: Doc,
  members: Doc[],
): Promise<Record<string, { teams: MemberTeamLink[]; /** e.g. ["President", "Player", "Coach", "Umpire"] */ positions: string[] }>> {
  const clubId = String(club.id);
  const ids = members.map((m) => String(m.memberId));
  const teams = await db
    .collection("teams")
    .find({ clubId }, { projection: { teamId: 1, name: 1, displayName: 1, season: 1, roster: 1 } })
    .toArray();
  const teamById = new Map(teams.map((t) => [String(t.teamId), t]));
  const lineups = await db
    .collection(FIXTURE_LINEUPS_COLLECTION)
    .find({ teamId: { $in: [...teamById.keys()] }, $or: [{ "players.memberId": { $in: ids } }, { "staff.memberId": { $in: ids } }] }, { projection: { teamId: 1, players: 1, staff: 1 } })
    .toArray();

  const out: Record<string, { teams: Map<string, MemberTeamLink>; positions: Set<string> }> = {};
  const get = (id: string) => (out[id] ??= { teams: new Map(), positions: new Set() });
  const link = (memberId: string, teamId: string, role: string) => {
    if (!out[memberId] && !ids.includes(memberId)) return;
    const t = teamById.get(teamId);
    if (!t) return;
    const entry = get(memberId);
    if (!entry.teams.has(teamId)) {
      entry.teams.set(teamId, { teamId, name: String(t.displayName || t.name), season: t.season ? String(t.season) : null, role });
    }
  };
  const idSet = new Set(ids);
  for (const t of teams) {
    for (const r of (t.roster as Doc[]) ?? []) {
      const id = String(r?.memberId ?? "");
      if (!idSet.has(id)) continue;
      const staff = r.roleCategory !== "Participant" && !isPlayerRole(String(r.roleId));
      link(id, String(t.teamId), staff ? roleLabel(String(r.roleId ?? "")) : "Player");
    }
  }
  for (const l of lineups) {
    for (const p of (l.players as Doc[]) ?? []) if (idSet.has(String(p.memberId)) && !p.didNotPlay) link(String(p.memberId), String(l.teamId), "Player");
    for (const s of (l.staff as Doc[]) ?? []) {
      if (!idSet.has(String(s.memberId))) continue;
      link(String(s.memberId), String(l.teamId), String(s.role ?? "Staff"));
    }
  }

  // Roles & positions: committee positions, then every role the member holds
  // (from their member record and from this club's teams: Player, Coach,
  // Team Manager…), then Umpire / Volunteer / admin roles.
  const committee = (club.committee as Doc[]) ?? [];
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const ordered = new Map<string, string[]>();
  for (const m of members) {
    const id = String(m.memberId);
    const full = norm(`${m.personalInfo?.firstName ?? ""}${m.personalInfo?.lastName ?? ""}`);
    const list: string[] = [];
    const add = (label: string) => {
      if (label && !list.includes(label)) list.push(label);
    };
    for (const c of committee) {
      if ((c.memberId && String(c.memberId) === id) || (c.name && full && norm(String(c.name)) === full)) {
        if (c.position) add(String(c.position));
      }
    }
    const teamRoles = [...(out[id]?.teams.values() ?? [])].map((t) => t.role);
    const roleLabels = [...((m.roles as string[]) ?? []).map(roleLabel), ...teamRoles];
    // Players / coaches / managers first, then everything else
    const rank = (l: string) => (/player|goalkeeper/i.test(l) ? 0 : /coach/i.test(l) ? 1 : /manager/i.test(l) ? 2 : /umpire|official|judge/i.test(l) ? 3 : 4);
    for (const l of [...new Set(roleLabels)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))) add(l);
    ordered.set(id, list);
  }

  return Object.fromEntries(
    ids.map((id) => [
      id,
      {
        teams: [...(out[id]?.teams.values() ?? [])].sort((a, b) => String(b.season).localeCompare(String(a.season)) || a.name.localeCompare(b.name, "en", { numeric: true })),
        positions: ordered.get(id) ?? [],
      },
    ]),
  );
}

// ── Fixtures ────────────────────────────────────────────────────────────────

export interface ClubFixture {
  fixtureId: string;
  dateTime: string | null;
  round: number | null;
  competition: string;
  seasonCompetitionId: string;
  teamId: string;
  teamName: string;
  opponent: string;
  isHome: boolean;
  venue: string | null;
  category: TeamCategory;
}

export async function getClubUpcomingFixtures(db: Db, club: Doc, now = new Date()): Promise<ClubFixture[]> {
  const clubId = String(club.id);
  const teams = await db
    .collection("teams")
    .find({ clubId }, { projection: { teamId: 1, name: 1, displayName: 1, grade: 1, ageCategory: 1, gender: 1 } })
    .toArray();
  if (!teams.length) return [];
  const teamById = new Map(teams.map((t) => [String(t.teamId), t]));
  const ids = [...teamById.keys()];
  const fixtures = await db
    .collection("league_fixtures")
    .find(
      {
        published: true,
        status: { $in: ["scheduled", "in_progress", "postponed"] },
        // scheduledStart is an ISO string (seeded/admin) or a Date (older data)
        $and: [
          { $or: [{ scheduledStart: { $gte: now.toISOString() } }, { scheduledStart: { $gte: now } }] },
          { $or: [{ homeTeamId: { $in: ids } }, { awayTeamId: { $in: ids } }] },
        ],
      },
      { projection: { fixtureId: 1, scheduledStart: 1, round: 1, seasonCompetitionId: 1, homeTeamId: 1, awayTeamId: 1, venueName: 1 } },
    )
    .sort({ scheduledStart: 1 })
    .limit(500)
    .toArray();

  const oppIds = [...new Set(fixtures.flatMap((f) => [String(f.homeTeamId), String(f.awayTeamId)]))].filter((id) => !teamById.has(id));
  const opps = oppIds.length
    ? await db.collection("teams").find({ teamId: { $in: oppIds } }, { projection: { teamId: 1, name: 1, displayName: 1 } }).toArray()
    : [];
  const nameById = new Map([...teams, ...opps].map((t) => [String(t.teamId), String(t.displayName || t.name)]));
  const scs = await db
    .collection("season_competitions")
    .find({ seasonCompetitionId: { $in: [...new Set(fixtures.map((f) => String(f.seasonCompetitionId)))] } }, { projection: { seasonCompetitionId: 1, displayName: 1 } })
    .toArray();
  const scName = new Map(scs.map((s) => [String(s.seasonCompetitionId), String(s.displayName ?? "")]));

  const out: ClubFixture[] = [];
  for (const f of fixtures) {
    for (const side of ["home", "away"] as const) {
      const teamId = String(side === "home" ? f.homeTeamId : f.awayTeamId);
      const t = teamById.get(teamId);
      if (!t) continue; // not this club's team
      const oppId = String(side === "home" ? f.awayTeamId : f.homeTeamId);
      out.push({
        fixtureId: String(f.fixtureId),
        dateTime: f.scheduledStart ? new Date(f.scheduledStart).toISOString() : null,
        round: typeof f.round === "number" ? f.round : null,
        competition: scName.get(String(f.seasonCompetitionId)) || String(t.grade ?? ""),
        seasonCompetitionId: String(f.seasonCompetitionId),
        teamId,
        teamName: String(t.displayName || t.name),
        opponent: nameById.get(oppId) ?? "TBC",
        isHome: side === "home",
        venue: f.venueName ? String(f.venueName) : null,
        category: teamCategory({ ageCategory: t.ageCategory, gender: t.gender, name: t.name, grade: t.grade }),
      });
    }
  }
  return out;
}

// ── Coaches & players ───────────────────────────────────────────────────────

export interface ClubPersonTeam {
  teamId: string;
  name: string;
  season: string | null;
  /** e.g. "Coach", "Assistant Coach", "Player", "Goalkeeper" */
  role: string;
  /** Matches on the team's team sheets (players: games played). */
  games: number;
}

export interface ClubPerson {
  memberId: string;
  name: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  /** Roles held of this kind, e.g. ["Coach", "Assistant Coach"] or ["Player"] */
  roles: string[];
  teams: ClubPersonTeam[];
}

/**
 * Active members of the club who coach / play — the same rule as the dashboard
 * counts: a matching role on their member record, in one of the club's team
 * rosters, or on a team sheet — with the club teams they coach / are selected in.
 */
async function getClubActivePeople(db: Db, club: Doc, kind: "coach" | "player"): Promise<ClubPerson[]> {
  const clubId = String(club.id);
  const [members, teams] = await Promise.all([
    db.collection("members").find(clubMemberFilter(clubId), { projection: { memberId: 1, roles: 1, membership: 1, status: 1, personalInfo: 1, consents: 1, preferences: 1 } }).toArray(),
    db.collection("teams").find({ clubId }, { projection: { teamId: 1, name: 1, displayName: 1, season: 1, roster: 1 } }).toArray(),
  ]);
  const teamById = new Map(teams.map((t) => [String(t.teamId), t]));
  const lineups = teams.length
    ? await db.collection(FIXTURE_LINEUPS_COLLECTION).find({ teamId: { $in: [...teamById.keys()] } }, { projection: { teamId: 1, players: 1, staff: 1 } }).toArray()
    : [];

  // memberId → teamId → { role, games }
  const links = new Map<string, Map<string, { role: string; games: number }>>();
  const addTeam = (memberId: string, teamId: string, role: string, games = 0) => {
    const m = links.get(memberId) ?? new Map<string, { role: string; games: number }>();
    const cur = m.get(teamId);
    m.set(teamId, { role: cur?.role ?? role, games: (cur?.games ?? 0) + games });
    links.set(memberId, m);
  };
  const memberRoleMatches = kind === "coach" ? isCoachRole : isPlayerRole;
  for (const t of teams) {
    for (const r of (t.roster as Doc[]) ?? []) {
      if (!r?.memberId) continue;
      const isPlayer = r.roleCategory === "Participant" || isPlayerRole(String(r.roleId ?? ""));
      if (kind === "player" && isPlayer) addTeam(String(r.memberId), String(t.teamId), r.position === "Goalkeeper" ? "Goalkeeper" : "Player");
      if (kind === "coach" && !isPlayer && isCoachRole(String(r.roleId ?? ""))) addTeam(String(r.memberId), String(t.teamId), roleLabel(String(r.roleId)));
    }
  }
  for (const l of lineups) {
    if (kind === "player") {
      for (const p of (l.players as Doc[]) ?? []) {
        if (p?.memberId && !p.didNotPlay) addTeam(String(p.memberId), String(l.teamId), p.isGoalkeeper ? "Goalkeeper" : "Player", 1);
      }
    } else {
      for (const s of (l.staff as Doc[]) ?? []) {
        if (s?.memberId && /coach/i.test(String(s.role ?? ""))) addTeam(String(s.memberId), String(l.teamId), String(s.role), 1);
      }
    }
  }

  const out: ClubPerson[] = [];
  for (const m of members) {
    if (!isActiveMember(m)) continue;
    const id = String(m.memberId);
    const memberRoles = ((m.roles as string[]) ?? []).filter(memberRoleMatches).map(roleLabel);
    const teamLinks = links.get(id);
    if (!memberRoles.length && !teamLinks?.size) continue;
    const pi = m.personalInfo ?? {};
    const photoOk = m.consents?.photoConsent === true || m.preferences?.photoConsent === true;
    const personTeams: ClubPersonTeam[] = [...(teamLinks ?? new Map()).entries()]
      .map(([teamId, { role, games }]) => {
        const t = teamById.get(teamId)!;
        return { teamId, name: String(t.displayName || t.name), season: t.season ? String(t.season) : null, role, games };
      })
      .sort((a, b) => String(b.season).localeCompare(String(a.season)) || b.games - a.games || a.name.localeCompare(b.name, "en", { numeric: true }));
    out.push({
      memberId: id,
      name: nameOf(m, id),
      firstName: String(pi.firstName ?? ""),
      lastName: String(pi.lastName ?? ""),
      photoUrl: photoOk && pi.photoUrl ? String(pi.photoUrl) : null,
      roles: [...new Set([...memberRoles, ...personTeams.map((t) => t.role)])],
      teams: personTeams,
    });
  }
  return out.sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName) || a.name.localeCompare(b.name));
}

/** Active coaches and the teams they coach. */
export const getClubActiveCoaches = (db: Db, club: Doc) => getClubActivePeople(db, club, "coach");
/** Active players and the teams they're selected in (roster or team sheets). */
export const getClubActivePlayers = (db: Db, club: Doc) => getClubActivePeople(db, club, "player");
