// lib/altius/transform.ts
// Pure transform: Altius harvest JSON → hockey-app documents.
//
// Produces documents for: competitions, season_competitions, teams,
// league_fixtures (with matchEvents + umpires), members (players, team staff,
// match officials), association-registrations, club-registrations,
// association_venues and competition_awards.
//
// Every ID is deterministic and derived from Altius IDs, so re-running the seed
// updates in place instead of duplicating. Each document carries an `altius`
// sub-document recording where it came from.

import { modernizeMemberFields } from "../members/modernize";
import type {
  AltiusCompetition,
  AltiusHarvest,
  AltiusLeague,
  AltiusMatchDetail,
  AltiusMatchRow,
} from "./harvestTypes";

// ── Club mapping ──────────────────────────────────────────────────────────────
// Altius team-code prefix → hockey-app club shortName (see scripts/data/bha-clubs.json).
export const ALTIUS_CODE_TO_CLUB_SHORTNAME: Record<string, string> = {
  ALS: "ALS", // Allstars
  BUL: "BUL", // Bulimba
  CHC: "CHC", // Commercial
  EST: "EST", // Eastern Suburbs
  KWC: "KWC", // Kedron Wavell Services
  LAB: "LAB", // Labrador
  NTH: "NTH", // Northern Suburbs
  PHC: "PNH", // Pine Hills
  PNH: "PNH",
  PH: "PNH",
  PKHC: "PNJ", // Punjabi Kookaburras
  PNJ: "PNJ",
  RHC: "RDC", // Redcliffe
  RDC: "RDC",
  RDL: "RED", // Redlands
  RED: "RED",
  SBE: "STH", // South Brisbane Eagles
  STH: "STH",
  SBS: "STB", // Southbank Strikers
  STB: "STB",
  STA: "STS", // Pine Rivers St Andrews
  STS: "STS",
  SWU: "STW", // South West United
  STW: "STW",
  UQH: "UQH", // University of Queensland
  VAL: "VAL", // Valley
};

/** Name keywords used when a team code isn't in the table above. */
export const ALTIUS_NAME_TO_CLUB_SHORTNAME: [RegExp, string][] = [
  [/all ?stars/i, "ALS"],
  [/bulimba/i, "BUL"],
  [/commercial/i, "CHC"],
  [/eastern suburbs|easts/i, "EST"],
  [/kedron/i, "KWC"],
  [/labrador/i, "LAB"],
  [/northern suburbs|norths/i, "NTH"],
  [/pine hills/i, "PNH"],
  [/punjabi/i, "PNJ"],
  [/redcliffe/i, "RDC"],
  [/redlands/i, "RED"],
  [/south brisbane|eagles/i, "STH"],
  [/southbank|strikers?/i, "STB"],
  [/st andrews|pine rivers/i, "STS"],
  [/south west/i, "STW"],
  [/university|uq/i, "UQH"],
  [/valley/i, "VAL"],
];

export interface ClubRef {
  id: string;
  shortName: string;
  name: string;
}

export interface TransformOptions {
  associationId: string; // e.g. "bha"
  season: string; // "2026"
  clubsByShortName: Map<string, ClubRef>;
  by?: string;
  now?: Date;
  /** Create minimal club records for Altius clubs not found in `clubsByShortName` (default true). */
  createMissingClubs?: boolean;
}

// ── Small helpers ─────────────────────────────────────────────────────────────

export const slug = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const titleWord = (w: string) =>
  w
    .toLowerCase()
    .replace(/(^|[-'’\s])([a-z])/g, (_m, p: string, c: string) => p + c.toUpperCase())
    .replace(/^Mc([a-z])/, (_m, c: string) => "Mc" + c.toUpperCase());

/** "PEMBERTON Nicola" → {first:"Nicola", last:"Pemberton"}; "VAN DER ZEE Ana" → {first:"Ana", last:"Van Der Zee"}. */
export function splitAltiusName(raw: string): { firstName: string; lastName: string; displayName: string } {
  const clean = raw.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  const parts = clean.split(" ").filter(Boolean);
  const isUpper = (w: string) => w === w.toUpperCase() && /[A-Z]/.test(w);
  let i = 0;
  while (i < parts.length - 1 && isUpper(parts[i]!)) i++;
  if (i === 0) i = 1; // no all-caps surname found: first token is the surname
  if (parts.length > 1 && i >= parts.length) i = parts.length - 1;
  const lastName = parts.slice(0, i).map(titleWord).join(" ");
  const firstName = parts.slice(i).map(titleWord).join(" ");
  return { firstName, lastName, displayName: `${firstName} ${lastName}`.trim() };
}

/** "BHA 2026 BHL 1" → "BHL 1"; "BHA 2026 JHL Under 12 BYE Games" → "JHL Under 12 BYE Games". */
export function gradeFromTitle(title: string, season: string): string {
  return title.replace(/^BHA\s+/i, "").replace(new RegExp(`^${season}\\s+`), "").trim();
}

export function divisionLevelFromGrade(grade: string): number {
  const n = grade.match(/(?:BHL|MHL|J)\s*(\d+)\b/i);
  if (n) return Math.max(1, Number(n[1]));
  const letter = grade.match(/U\d+\s*([A-Z])\b/i);
  if (letter) return letter[1]!.toUpperCase().charCodeAt(0) - 64;
  return 1;
}

export function ageCategoryFor(league: AltiusLeague): "junior" | "senior" | "masters" {
  return league === "JHL" ? "junior" : league === "MHL" ? "masters" : "senior";
}

export function genderFromCategory(category: string): "male" | "female" | "mixed" {
  if (/\bwomens?\b|\bgirls?\b/i.test(category)) return "female";
  if (/\bmens?\b|\bboys?\b/i.test(category)) return "male";
  return "mixed";
}

export function ageGroupLabel(category: string, league: AltiusLeague): string {
  const u = category.match(/Under\s*(\d+)/i);
  if (u) return `U${u[1]}`;
  const o = category.match(/Over\s*(\d+)/i);
  if (o) return `O${o[1]}`;
  return league === "BHL" ? "Open" : league;
}

/** Brisbane has no DST: local "2026-03-14 11:00:00" → UTC ISO. Other zones fall back to +10:00 too. */
export function localToIso(local: string | null, timezone = "Australia/Brisbane"): string | null {
  if (!local) return null;
  const offset = /Brisbane|Queensland/i.test(timezone) ? "+10:00" : "+10:00";
  const d = new Date(`${local.replace(" ", "T")}${offset}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const isoDay = (iso: string | null) => (iso ? iso.slice(0, 10) : null);

/** Map an Altius team (code + name) to a hockey-app club shortName. */
export function clubShortNameForTeam(code: string, name: string): string | null {
  const prefix = (code || "").trim().split(/\s+/)[0]?.toUpperCase() ?? "";
  if (ALTIUS_CODE_TO_CLUB_SHORTNAME[prefix]) return ALTIUS_CODE_TO_CLUB_SHORTNAME[prefix]!;
  for (const [re, sn] of ALTIUS_NAME_TO_CLUB_SHORTNAME) if (re.test(name) || re.test(code)) return sn;
  return null;
}

// ── Venues ────────────────────────────────────────────────────────────────────
// Addresses for venues on https://www.bha.org.au/bha-clubs/playing-venues
// (postcodes added). Matched against the Altius venue name / pitch code.
export const KNOWN_VENUES: {
  match: RegExp;
  name: string;
  shortCode: string;
  address: { street: string; suburb: string; city: string; state: string; postcode: string; country: string };
  surface: "turf" | "grass";
}[] = [
  { match: /state hockey centre|^SHC\b/i, name: "Queensland State Hockey Centre", shortCode: "SHC", surface: "turf",
    address: { street: "Lytton Road", suburb: "Colmslie", city: "Brisbane", state: "QLD", postcode: "4170", country: "Australia" } },
  { match: /brisbane north|burringbar|^BNHC\b/i, name: "Brisbane North Hockey Centre", shortCode: "BNHC", surface: "turf",
    address: { street: "Burringbar Park, Kittyhawk Drive", suburb: "Chermside", city: "Brisbane", state: "QLD", postcode: "4032", country: "Australia" } },
  { match: /easts|tiger ?turf|clem jones|^EHTT\b|^EST\b/i, name: "Easts Hockey Tiger Turf", shortCode: "EHTT", surface: "turf",
    address: { street: "Clem Jones Centre, Stanley Street", suburb: "Carina", city: "Brisbane", state: "QLD", postcode: "4152", country: "Australia" } },
  { match: /gold coast hockey|^GCHC\b/i, name: "Gold Coast Hockey Centre", shortCode: "GCHC", surface: "turf",
    address: { street: "Musgrave Avenue", suburb: "Labrador", city: "Gold Coast", state: "QLD", postcode: "4215", country: "Australia" } },
  { match: /redcliffe|mary nairn|^RED\d*\b|^RHC\b/i, name: "Redcliffe Hockey Turf", shortCode: "RED", surface: "turf",
    address: { street: "Mary Nairn Fields, Oxley Avenue", suburb: "Redcliffe", city: "Moreton Bay", state: "QLD", postcode: "4020", country: "Australia" } },
  { match: /university of queensland|\bUQ\b|^UQ\d*\b/i, name: "University of Queensland Turf", shortCode: "UQ", surface: "turf",
    address: { street: "Oval 4, off Union Road", suburb: "St Lucia", city: "Brisbane", state: "QLD", postcode: "4067", country: "Australia" } },
  { match: /bulimba|col gardiner|^BUL\b/i, name: "Bulimba Hockey Club", shortCode: "BUL", surface: "grass",
    address: { street: "Col Gardiner Drive", suburb: "Morningside", city: "Brisbane", state: "QLD", postcode: "4170", country: "Australia" } },
  { match: /downey/i, name: "Downey Park", shortCode: "DWN", surface: "grass",
    address: { street: "Green Terrace", suburb: "Windsor", city: "Brisbane", state: "QLD", postcode: "4030", country: "Australia" } },
  { match: /dorrington/i, name: "Dorrington Park", shortCode: "DOR", surface: "grass",
    address: { street: "5 Mirrabooka Road", suburb: "Ashgrove", city: "Brisbane", state: "QLD", postcode: "4060", country: "Australia" } },
  { match: /finsbury/i, name: "Finsbury Park", shortCode: "FIN", surface: "grass",
    address: { street: "Finsbury Street", suburb: "Wilston", city: "Brisbane", state: "QLD", postcode: "4051", country: "Australia" } },
  { match: /pine hills|drysdale/i, name: "James Drysdale Reserve", shortCode: "PNH", surface: "grass",
    address: { street: "Sports Lane", suburb: "Bunya", city: "Moreton Bay", state: "QLD", postcode: "4055", country: "Australia" } },
  { match: /south ?pine|pine rivers|st andrews|brendale|^SPSC\b/i, name: "South Pine Sports Complex", shortCode: "SPSC", surface: "grass",
    address: { street: "620 South Pine Road", suburb: "Brendale", city: "Moreton Bay", state: "QLD", postcode: "4500", country: "Australia" } },
  { match: /rasey/i, name: "Rasey Park", shortCode: "RAS", surface: "grass",
    address: { street: "95 Butterfield Street", suburb: "Herston", city: "Brisbane", state: "QLD", postcode: "4006", country: "Australia" } },
  { match: /shaw park/i, name: "Shaw Park", shortCode: "SHAW", surface: "grass",
    address: { street: "Shaw Road", suburb: "Wooloowin", city: "Brisbane", state: "QLD", postcode: "4030", country: "Australia" } },
];

/** Split Altius venue/pitch strings into a venue + pitch. */
export function resolveVenue(venueFull: string | null | undefined, pitch: string | null | undefined) {
  const p = (pitch ?? "").trim();
  const [pitchCode, pitchLabelRaw] = p.includes(" - ") ? p.split(" - ").map((s) => s.trim()) : [p.replace(/\d+$/, ""), p];
  let venueName = (venueFull ?? "").trim();
  // "Queensland State Hockey Centre - SHC1" → strip the pitch suffix
  if (venueName.includes(" - ")) venueName = venueName.slice(0, venueName.lastIndexOf(" - ")).trim();
  const known = KNOWN_VENUES.find((k) => k.match.test(venueName) || k.match.test(pitchCode ?? "") || k.match.test(p));
  const name = known?.name ?? (venueName || pitchCode || p || "Unknown venue");
  const venueId = `venue-altius-${slug(known?.shortCode ?? name)}`;
  const pitchLabel = pitchLabelRaw || p || "Main";
  return {
    venueId,
    venueName: name,
    known,
    pitchId: `${venueId}-${slug(pitchLabel)}`,
    pitchLabel,
    altiusVenueText: venueFull ?? null,
    altiusPitchText: pitch ?? null,
  };
}

// ── Output types ──────────────────────────────────────────────────────────────

type Doc = Record<string, any>;

export interface TransformResult {
  competitions: Doc[];
  seasonCompetitions: Doc[];
  teams: Doc[];
  fixtures: Doc[];
  members: Doc[];
  associationRegistrations: Doc[];
  clubRegistrations: Doc[];
  venues: Doc[];
  awards: Doc[];
  newClubs: Doc[];
  /** `fixture_lineups`: one per fixture + team, with match-day shirt numbers */
  lineups: Doc[];
  warnings: string[];
  unmappedTeams: { code: string; name: string; competition: string }[];
}

interface Appearance {
  teamId: string;
  clubId: string;
  league: AltiusLeague;
  date: string | null;
  shirt: string;
  gk: boolean;
  captain: boolean;
}

// ── Main transform ────────────────────────────────────────────────────────────

export function transformHarvest(h: AltiusHarvest, opts: TransformOptions): TransformResult {
  const now = opts.now ?? new Date();
  const nowIso = now.toISOString();
  const by = opts.by ?? "import";
  const assoc = opts.associationId;
  const season = opts.season;
  const warnings: string[] = [];
  const unmappedTeams: TransformResult["unmappedTeams"] = [];

  const out: TransformResult = {
    competitions: [], seasonCompetitions: [], teams: [], fixtures: [], members: [],
    associationRegistrations: [], clubRegistrations: [], venues: [], awards: [], newClubs: [], lineups: [], warnings, unmappedTeams,
  };

  const comps = Object.values(h.comps).sort((a, b) => Number(a.altiusCompetitionId) - Number(b.altiusCompetitionId));

  // Altius team id → our team id + context (first competition that lists the team owns it)
  const teamCtx = new Map<string, { teamId: string; clubId: string; clubShort: string; name: string; scId: string; comp: AltiusCompetition }>();
  const teamDocs = new Map<string, Doc>();
  const venueDocs = new Map<string, Doc>();
  const playerApps = new Map<string, { name: string; apps: Appearance[] }>();
  const staffApps = new Map<string, { name: string; roleId: string; clubId: string; teams: Set<string> }>();
  const officials = new Map<string, { name: string; roles: Set<string>; altiusIds: Set<string> }>();
  const fixtureByAltius = new Map<string, Doc>();

  const memberIdForPlayer = (pid: string) => `MBR_${pid}`;
  const memberIdForStaff = (name: string, clubShort: string) => `MBR_STAFF-${clubShort}-${slug(name)}`.toUpperCase();
  const memberIdForOfficial = (name: string) => `MBR_OFF-${slug(name)}`.toUpperCase();

  for (const c of comps) {
    const grade = gradeFromTitle(c.title, season);
    const gradeKey = slug(grade);
    const league = c.league;
    const competitionId = `comp-altius-${assoc}-${gradeKey}`;
    const seasonCompetitionId = `sc-altius-${assoc}-${gradeKey}-${season}`;
    const divisionId = `${gradeKey}-d1`;
    const gender = genderFromCategory(c.category);
    const ageCategory = ageCategoryFor(league);
    const isByeComp = /bye/i.test(grade);
    const finished = c.matches.length > 0 && c.matches.every((m) => /official|complete|forfeit/i.test(m.status ?? "") || m.scoreText === "BYE");

    out.competitions.push({
      competitionId,
      owningAssociationId: assoc,
      name: grade,
      sport: "hockey",
      geographyScope: { region: "Brisbane", city: "Brisbane", state: "QLD", country: "Australia" },
      status: "published",
      altius: { league, grade },
      updatedAt: now,
      updatedBy: by,
    });

    out.seasonCompetitions.push({
      seasonCompetitionId,
      competitionId,
      owningAssociationId: assoc,
      season,
      displayName: `${season} ${grade}`,
      divisions: [{ divisionId, name: grade, grade, gender, ageCategory }],
      resultApprovalRequired: false,
      ladderRules: {
        pointsWin: 3, pointsDraw: 1, pointsLoss: 0, pointsForfeitWin: 3, pointsForfeitLoss: 0,
        pointsShootoutWin: 2, pointsShootoutLoss: 1, tieBreakers: ["points", "gd", "gf"],
        includeAbandonedInPlayed: false,
      },
      homeAndAway: !isByeComp,
      blockoutPeriods: [],
      specialMatchPeriods: [],
      finalsSeries: {
        teamCountThreshold: 10,
        qualifierCountBelowThreshold: 4,
        qualifierCountAtOrAboveThreshold: 5,
        seriesFormat: "page_playoff",
      },
      clubNominatedVenues: [],
      status: finished ? "completed" : "in_progress",
      altius: {
        competitionId: c.altiusCompetitionId,
        sourceUrl: c.sourceUrl,
        title: c.title,
        category: c.category,
        dateRange: c.dateRange,
        finalStandings: c.teams.map((t) => ({ altiusTeamId: t.altiusTeamId, team: t.name, standing: t.finalStanding })),
        ladder: c.pools.flatMap((p) => p.rows),
        harvestedAt: h.finished ?? h.started,
      },
      updatedAt: now,
      updatedBy: by,
    });

    // Teams
    const codeToTeamId = new Map<string, string>();
    for (const t of c.teams) {
      if (!t.altiusTeamId) continue;
      const clubShort = clubShortNameForTeam(t.code, t.name);
      let club = clubShort ? opts.clubsByShortName.get(clubShort) : undefined;
      if (!club) {
        unmappedTeams.push({ code: t.code, name: t.name, competition: c.title });
        if (opts.createMissingClubs === false) continue;
        club = ensureImportedClub(t, grade, out.newClubs, opts.clubsByShortName, now, by);
      }
      const teamId = `team-altius-${t.altiusTeamId}`;
      codeToTeamId.set(t.code, teamId);
      if (teamCtx.has(t.altiusTeamId)) continue; // already owned by an earlier competition
      teamCtx.set(t.altiusTeamId, { teamId, clubId: club.id, clubShort: club.shortName, name: t.name, scId: seasonCompetitionId, comp: c });
      teamDocs.set(teamId, {
        teamId,
        clubId: club.id,
        canonicalTeamId: `team-altius-${club.shortName.toLowerCase()}-${gradeKey}-${slug(t.code)}`,
        promotionHistory: [],
        name: t.name,
        displayName: t.name,
        gender,
        ageCategory,
        division: { name: grade, level: divisionLevelFromGrade(grade), shortName: t.code },
        roster: [],
        leadership: { viceCaptains: [] },
        season,
        seasonCompetitionId,
        competition: grade,
        grade,
        ageGroupLabel: ageGroupLabel(c.category, league),
        competitionDivisionId: divisionId,
        status: "active",
        statistics: { totalRegistered: 0, totalAssigned: 0, totalGoalkeepers: 0, activeMembers: 0, inactiveMembers: 0, injuredMembers: 0 },
        altius: { teamId: t.altiusTeamId, code: t.code, orgId: t.altiusOrgId, logoUrl: t.logoUrl, finalStanding: t.finalStanding },
        updatedAt: now,
        updatedBy: by,
      });
    }

    // Fixtures
    const numericRounds = c.matches.map((m) => (typeof m.round === "number" ? m.round : 0));
    const maxRound = Math.max(0, ...numericRounds);
    const isFinalMatch = (m: AltiusMatchRow) => isFinalsPhase(m.phaseLabel);
    const finalsDays = [...new Set(
      c.matches.filter(isFinalMatch).map((m) => (m.localDateTime ?? "").slice(0, 10)),
    )].sort();
    // League games Altius left without a round number take the round played on the same day
    const roundByDay = new Map<string, number>();
    for (const m of c.matches) {
      if (typeof m.round === "number" && m.localDateTime) roundByDay.set(m.localDateTime.slice(0, 10), m.round);
    }
    const roundFor = (m: AltiusMatchRow): number => {
      const day = (m.localDateTime ?? "").slice(0, 10);
      if (isFinalMatch(m)) return maxRound + 1 + Math.max(0, finalsDays.indexOf(day));
      if (typeof m.round === "number") return m.round;
      if (roundByDay.has(day)) return roundByDay.get(day)!;
      // nearest earlier dated round, else 1
      const earlier = [...roundByDay.entries()].filter(([d]) => d <= day).sort().pop();
      return earlier ? earlier[1] : 1;
    };

    for (const m of c.matches) {
      if (!m.altiusMatchId) continue;
      if (m.scoreText === "BYE" || /^bye$/i.test(m.awayCode ?? "") || /^bye$/i.test(m.homeCode ?? "")) continue;

      const homeTeamId = resolveTeamId(m.homeTeamId, m.homeCode, codeToTeamId, teamCtx);
      const awayTeamId = resolveTeamId(m.awayTeamId, m.awayCode, codeToTeamId, teamCtx);
      if (!homeTeamId || !awayTeamId) {
        warnings.push(`${c.title} match ${m.matchNo} (${m.homeCode} v ${m.awayCode}): team not mapped — skipped`);
        continue;
      }

      const isFinal = isFinalMatch(m);
      const round = roundFor(m);
      const { status, result } = fixtureStatusAndResult(m, homeTeamId, awayTeamId);
      const start = localToIso(m.localDateTime, m.timezone);
      const detail = h.matchDetails[m.altiusMatchId];
      const v = resolveVenue(detail?.details?.["Venue"], m.pitch);

      if (!venueDocs.has(v.venueId)) {
        venueDocs.set(v.venueId, {
          venueId: v.venueId,
          associationId: assoc,
          name: v.venueName,
          shortCode: (v.known?.shortCode ?? v.venueName.slice(0, 24)).slice(0, 24),
          status: "active",
          address: v.known?.address ?? {
            street: "Address to be confirmed", suburb: "Brisbane", city: "Brisbane", state: "QLD", postcode: "4000", country: "Australia",
          },
          geo: null,
          pitches: [],
          notes: v.known ? "Imported from Altius; address from bha.org.au playing venues." : `Imported from Altius (“${v.altiusVenueText ?? v.altiusPitchText}”). Address not yet confirmed.`,
          createdBy: by,
          updatedBy: by,
        });
      }
      const vd = venueDocs.get(v.venueId)!;
      if (!vd.pitches.some((p: Doc) => p.pitchId === v.pitchId)) {
        vd.pitches.push({ pitchId: v.pitchId, label: v.pitchLabel, surface: /grass/i.test(v.pitchLabel) ? "grass" : v.known?.surface ?? "turf" });
      }

      const fixtureId = `fx-altius-${m.altiusMatchId}`;
      const fx: Doc = {
        fixtureId,
        seasonCompetitionId,
        competitionId,
        owningAssociationId: assoc,
        round,
        homeTeamId,
        awayTeamId,
        status,
        venueId: v.venueId,
        venueName: v.venueName,
        pitchId: v.pitchId,
        addressLine: v.known ? `${v.known.address.street}, ${v.known.address.suburb} ${v.known.address.state} ${v.known.address.postcode}` : null,
        scheduledStart: start,
        scheduledEnd: null,
        timezone: m.timezone || "Australia/Brisbane",
        published: true,
        publishedAt: nowIso,
        result,
        resultStatus: status === "completed" ? "approved" : null,
        resultSubmittedAt: status === "completed" ? nowIso : null,
        resultSubmittedBy: status === "completed" ? by : null,
        resultApprovedAt: status === "completed" ? nowIso : null,
        resultApprovedBy: status === "completed" ? by : null,
        legacyMatchId: m.altiusMatchId,
        matchLevel: isFinal ? "finals" : "league",
        umpires: null,
        matchEvents: null,
        altius: {
          matchId: m.altiusMatchId,
          matchNo: m.matchNo,
          phaseLabel: m.phaseLabel,
          status: m.status,
          scoreText: m.scoreText,
          pitch: m.pitch,
          venue: detail?.details?.["Venue"] ?? null,
          weather: detail?.details?.["Weather at Pushback"] ?? null,
          officials: detail?.officials ?? [],
          awards: detail?.awards ?? [],
          sourceUrl: `https://hockeybrisbane.altius.live/matches/${m.altiusMatchId}`,
        },
        updatedAt: nowIso,
        updatedBy: by,
      };
      fixtureByAltius.set(m.altiusMatchId, fx);
      out.fixtures.push(fx);

      if (!detail) continue;

      // Which lineup belongs to which side: match by team name, else by order (home first)
      const sideTeamId = (teamName: string, idx?: number): string | null => {
        const hn = teamCtx.get(idFromTeamId(homeTeamId))?.name;
        const an = teamCtx.get(idFromTeamId(awayTeamId))?.name;
        if (teamName && hn && sameTeam(teamName, hn)) return homeTeamId;
        if (teamName && an && sameTeam(teamName, an)) return awayTeamId;
        if (idx === 0) return homeTeamId;
        if (idx === 1) return awayTeamId;
        return null;
      };

      // Appearances (players) + staff
      detail.lineups.forEach((lu, idx) => {
        const teamId = sideTeamId(lu.team, idx);
        if (!teamId) return;
        const ctx = teamCtx.get(idFromTeamId(teamId));
        if (!ctx) return;
        const lineup: Doc = {
          lineupId: `lu-altius-${m.altiusMatchId}-${idFromTeamId(teamId)}`,
          fixtureId,
          seasonCompetitionId,
          teamId,
          players: [] as Doc[],
          staff: [] as Doc[],
          source: "altius",
          updatedAt: now,
        };
        for (const p of lu.players) {
          if (!p.altiusPlayerId) continue;
          const rec = playerApps.get(p.altiusPlayerId) ?? { name: p.name, apps: [] };
          const f0 = playerFlags(p.name, p.gk, p.captain);
          rec.apps.push({ teamId, clubId: ctx.clubId, league, date: isoDay(start), shirt: p.shirt, gk: f0.gk, captain: f0.captain });
          playerApps.set(p.altiusPlayerId, rec);
          const shirt = Number.parseInt(p.shirt, 10);
          const flags = playerFlags(p.name, p.gk, p.captain);
          lineup.players.push({
            memberId: memberIdForPlayer(p.altiusPlayerId),
            shirtNumber: Number.isFinite(shirt) ? shirt : null,
            isGoalkeeper: flags.gk,
            isCaptain: flags.captain,
            ...parseEntry(p.played),
          });
        }
        for (const s of lu.staff) {
          if (!s.name) continue;
          const roleId = /manager/i.test(s.role) ? "role-team-manager" : "role-coach";
          const id = memberIdForStaff(s.name, ctx.clubShort);
          const rec = staffApps.get(id) ?? { name: s.name, roleId, clubId: ctx.clubId, teams: new Set<string>() };
          rec.teams.add(teamId);
          staffApps.set(id, rec);
          lineup.staff.push({ memberId: id, role: titleCase(s.role) });
        }
        if (lineup.players.length || lineup.staff.length) out.lineups.push(lineup);
      });

      // Match events
      const events: Doc[] = [];
      detail.goals.forEach((g, i) => {
        const teamId = sideTeamId(g.team);
        if (!teamId || !g.altiusPlayerId) {
          warnings.push(`${fixtureId}: goal by "${g.name}" (${g.team}) not linked to a player — skipped`);
          return;
        }
        events.push({
          eventId: `ev-${m.altiusMatchId}-g${i + 1}`,
          kind: /stroke/i.test(g.action) ? "penalty_stroke_goal" : "goal",
          teamId,
          memberId: memberIdForPlayer(g.altiusPlayerId),
          assistMemberId: null,
          period: null,
          minute: g.minute != null ? Math.min(150, Math.max(0, g.minute)) : null,
          notes: g.action || null,
        });
      });
      detail.cards.forEach((cd, i) => {
        const teamId = sideTeamId(cd.team);
        const kind = /^\s*R/i.test(cd.type) ? "red_card" : /^\s*Y/i.test(cd.type) ? "yellow_card" : /^\s*G/i.test(cd.type) ? "green_card" : null;
        if (!teamId || !cd.altiusPlayerId || !kind) return;
        events.push({
          eventId: `ev-${m.altiusMatchId}-c${i + 1}`,
          kind,
          teamId,
          memberId: memberIdForPlayer(cd.altiusPlayerId),
          assistMemberId: null,
          period: null,
          minute: cd.minute != null ? Math.min(150, Math.max(0, cd.minute)) : null,
          notes: [cd.type, cd.umpire ? `Umpire: ${cd.umpire}` : ""].filter(Boolean).join(" · ") || null,
        });
      });
      fx.matchEvents = events.length ? events : null;

      // Officials → members + umpire slots
      const slots: Doc[] = [];
      for (const o of detail.officials) {
        if (!o.name) continue;
        const name = o.name.replace(/\s*\([A-Z]{3}\)\s*$/, "").trim();
        const id = memberIdForOfficial(name);
        const rec = officials.get(id) ?? { name, roles: new Set<string>(), altiusIds: new Set<string>() };
        rec.roles.add(o.role.trim());
        if (o.altiusOfficialId) rec.altiusIds.add(o.altiusOfficialId);
        officials.set(id, rec);
        slots.push({
          umpireType: slug(o.role).replace(/-/g, "_") || "umpire",
          umpireId: id,
          qualificationTier: null,
          allocationStatus: "accepted",
          dateAllocated: nowIso,
          dateAccepted: nowIso,
          isStandby: /reserve/i.test(o.role),
        });
      }
      fx.umpires = slots.length ? slots : null;
    }

    // Awards (competition level): [award, player, team]
    for (const [award, player, team] of c.awards) {
      if (!award || !player) continue;
      const awardType = /goalkeeper/i.test(award) ? "goalkeeper"
        : /goal ?scorer/i.test(award) ? "top_goal_scorer"
        : /young|rookie/i.test(award) ? "rookie"
        : /player of the (tournament|competition|season)/i.test(award) ? "player_of_competition"
        : null;
      if (!awardType) continue;
      const pName = player.replace(/\((GK|C)\)/g, "").trim();
      const teamEntry = [...teamCtx.values()].find((t) => t.comp === c && sameTeam(t.name, team ?? ""));
      const pid = findPlayerId(c, pName, teamEntry ? teamEntry.teamId : null, h, playerApps);
      if (!pid) {
        warnings.push(`${c.title}: award "${award}" for ${player} — player not found`);
        continue;
      }
      out.awards.push({
        awardRecordId: `award-altius-${c.altiusCompetitionId}-${slug(award)}`,
        context: "league",
        seasonCompetitionId,
        tournamentId: null,
        awardType,
        fixtureId: null,
        memberId: memberIdForPlayer(pid),
        memberDisplayName: splitAltiusName(pName).displayName,
        teamId: teamEntry?.teamId ?? null,
        teamName: team ?? null,
        awardLabelSnapshot: award,
        notes: "Imported from Altius",
        createdBy: by,
      });
    }
  }

  // ── People: Altius issues a new player id per team registration, so group ids
  //    by (name, club) into one person. Same name at different clubs stays separate.
  const people = new Map<string, { pids: string[]; name: string; apps: Appearance[] }>();
  for (const [pid, rec] of playerApps) {
    const clubId = rec.apps[0]?.clubId ?? "";
    const key = `${slug(splitAltiusName(rec.name).displayName)}|${clubId}`;
    const g = people.get(key) ?? { pids: [], name: rec.name, apps: [] };
    g.pids.push(pid);
    g.apps.push(...rec.apps);
    people.set(key, g);
  }
  const canonical = new Map<string, string>(); // per-team member id → person member id
  for (const g of people.values()) {
    g.pids.sort((a, b) => Number(a) - Number(b));
    const id = memberIdForPlayer(g.pids[0]!);
    for (const pid of g.pids) canonical.set(memberIdForPlayer(pid), id);
  }
  const canon = (memberId: string) => canonical.get(memberId) ?? memberId;
  for (const fx of out.fixtures) {
    for (const e of (fx.matchEvents as Doc[] | null) ?? []) e.memberId = canon(e.memberId);
  }
  for (const a of out.awards) a.memberId = canon(a.memberId);
  for (const lu of out.lineups) for (const p of lu.players as Doc[]) p.memberId = canon(p.memberId);

  // ── Members: players ────────────────────────────────────────────────────────
  for (const g of people.values()) {
    const rec = g;
    const memberId = memberIdForPlayer(g.pids[0]!);
    const { firstName, lastName, displayName } = splitAltiusName(rec.name);
    const byTeam = groupCount(rec.apps, (a) => a.teamId);
    const byClub = groupCount(rec.apps, (a) => a.clubId);
    const primaryClubId = maxKey(byClub)!;
    const primaryTeamId = maxKey(byTeam)!;
    const leagues = new Set(rec.apps.map((a) => a.league));
    const membershipType = leagues.has("JHL") ? "junior" : [...leagues].every((l) => l === "MHL") ? "masters" : "senior";
    const roleId = membershipType === "junior" ? "role-junior-player" : "role-player";
    const isGk = rec.apps.filter((a) => a.gk).length > rec.apps.length / 2;
    const allMens = [...new Set(rec.apps.map((a) => teamCtx.get(idFromTeamId(a.teamId))?.comp.category ?? ""))].every((cat) => /\bmens\b/i.test(cat));
    const shirt = Number(maxKey(groupCount(rec.apps, (a) => a.shirt)));
    const firstDate = rec.apps.map((a) => a.date).filter(Boolean).sort()[0] ?? `${season}-01-01`;

    const teams = Object.keys(byTeam).map((teamId) => {
      const td = teamDocs.get(teamId)!;
      const apps = rec.apps.filter((a) => a.teamId === teamId);
      const tShirt = Number(maxKey(groupCount(apps, (a) => a.shirt)));
      return {
        teamId,
        clubId: td.clubId,
        teamName: td.name,
        ageCategory: td.ageCategory,
        divisionLevel: td.division.level,
        gender: td.gender,
        grade: td.grade,
        ageGroupLabel: td.ageGroupLabel,
        competitionDivisionId: td.competitionDivisionId,
        roleId,
        registrationType: teamId === primaryTeamId ? "registered" : "assigned",
        position: apps.some((a) => a.gk) ? "Goalkeeper" : undefined,
        jerseyNumber: tShirt >= 1 && tShirt <= 99 ? tShirt : undefined,
        isCaptain: apps.some((a) => a.captain),
        isViceCaptain: false,
        status: "active",
        season,
        joinedDate: new Date(apps.map((a) => a.date).filter(Boolean).sort()[0] ?? `${season}-01-01`),
        appearances: apps.length,
      };
    });

    // Team rosters
    for (const t of teams) {
      const td = teamDocs.get(t.teamId)!;
      td.roster.push({
        memberId,
        roleId,
        roleCategory: "Participant",
        registrationType: t.registrationType,
        position: t.position,
        jerseyNumber: t.jerseyNumber,
        status: "active",
        joinedDate: t.joinedDate,
        notes: `${t.appearances} appearance${t.appearances === 1 ? "" : "s"} (Altius)`,
      });
    }

    out.members.push(baseMember({
      memberId, clubId: primaryClubId, firstName, lastName, displayName,
      genderId: allMens ? "gender-male" : "",
      roles: [roleId],
      membershipType, season, joinDate: firstDate, by, now,
      playerInfo: {
        primaryPosition: isGk ? "Goalkeeper" : "",
        secondaryPosition: "",
        jerseyNumber: shirt >= 1 && shirt <= 99 ? String(shirt) : null,
        preferredFoot: null,
        position: isGk ? "Goalkeeper" : "",
      },
      teams,
      altius: {
        playerId: g.pids[0],
        playerIds: g.pids,
        name: rec.name,
        appearances: rec.apps.length,
        sourceUrls: g.pids.map((id) => `https://hockeybrisbane.altius.live/players/${id}`),
      },
    }));

    // Registrations: one association registration, one per club played for
    out.associationRegistrations.push({
      registrationId: `AREG-${assoc}-${memberId}-${season}`,
      memberId,
      associationId: assoc,
      seasonYear: season,
      status: "active",
      roleIds: [roleId],
      ageCategory: membershipType,
      playerClassification: "",
      fees: [],
      source: "altius",
      registeredDate: new Date(firstDate),
      approvedDate: new Date(firstDate),
      updatedAt: now,
    });
    for (const clubId of Object.keys(byClub)) {
      out.clubRegistrations.push({
        registrationId: `CREG-${clubId}-${memberId}-${season}`,
        memberId,
        clubId,
        registrationType: clubId === primaryClubId ? "primary" : "secondary",
        seasonYear: season,
        status: "active",
        roleIds: [roleId],
        ageCategory: membershipType,
        fees: [],
        membershipType,
        source: "altius",
        registeredDate: new Date(firstDate),
        approvedDate: new Date(firstDate),
        updatedAt: now,
      });
    }
  }

  // ── Members: team staff ─────────────────────────────────────────────────────
  for (const [memberId, s] of staffApps) {
    const { firstName, lastName, displayName } = splitAltiusName(s.name);
    for (const teamId of s.teams) {
      const td = teamDocs.get(teamId);
      if (!td || td.roster.some((r: Doc) => r.memberId === memberId)) continue;
      td.roster.push({
        memberId, roleId: s.roleId, roleCategory: "Official", registrationType: "assigned",
        status: "active", joinedDate: new Date(`${season}-01-01`), notes: "Team staff (Altius lineup)",
      });
    }
    out.members.push(baseMember({
      memberId, clubId: s.clubId, firstName, lastName, displayName, genderId: "",
      roles: [s.roleId], membershipType: "senior", season, joinDate: `${season}-01-01`, by, now,
      playerInfo: null, teams: [],
      altius: { staffName: s.name, teams: [...s.teams] },
    }));
  }

  // ── Members: match officials ────────────────────────────────────────────────
  for (const [memberId, o] of officials) {
    const { firstName, lastName, displayName } = splitAltiusName(o.name);
    out.members.push(baseMember({
      memberId, clubId: null, firstName, lastName, displayName, genderId: "",
      roles: [[...o.roles].some((r) => /umpire/i.test(r)) ? "role-umpire" : "role-volunteer"],
      membershipType: "senior", season, joinDate: `${season}-01-01`, by, now, playerInfo: null, teams: [],
      altius: { officialName: o.name, officialRoles: [...o.roles], matchOfficialIds: [...o.altiusIds] },
    }));
  }

  // ── Team statistics + captain ───────────────────────────────────────────────
  for (const td of teamDocs.values()) {
    const players = td.roster.filter((r: Doc) => r.roleCategory === "Participant");
    td.statistics = {
      totalRegistered: players.filter((r: Doc) => r.registrationType === "registered").length,
      totalAssigned: players.filter((r: Doc) => r.registrationType === "assigned").length,
      totalGoalkeepers: players.filter((r: Doc) => r.position === "Goalkeeper").length,
      activeMembers: td.roster.length,
      inactiveMembers: 0,
      injuredMembers: 0,
    };
    const caps = new Map<string, number>();
    for (const [pid, rec] of playerApps) {
      const n = rec.apps.filter((a) => a.teamId === td.teamId && a.captain).length;
      if (n) caps.set(canon(memberIdForPlayer(pid)), (caps.get(canon(memberIdForPlayer(pid))) ?? 0) + n);
    }
    const captain = maxKey(Object.fromEntries(caps));
    if (captain) td.leadership = { captain, viceCaptains: [] };
  }

  out.teams = [...teamDocs.values()];
  out.venues = [...venueDocs.values()];

  // Sanity: does the scraped score match the goal events?
  for (const fx of out.fixtures) {
    if (fx.status !== "completed" || !fx.result || fx.result.resultType !== "normal" || !fx.matchEvents) continue;
    const goals = (fx.matchEvents as Doc[]).filter((e) => e.kind === "goal" || e.kind === "penalty_stroke_goal");
    const hg = goals.filter((e) => e.teamId === fx.homeTeamId).length;
    const ag = goals.filter((e) => e.teamId === fx.awayTeamId).length;
    if (hg !== fx.result.homeScore || ag !== fx.result.awayScore) {
      warnings.push(`${fx.fixtureId}: goal events ${hg}-${ag} ≠ score ${fx.result.homeScore}-${fx.result.awayScore}`);
    }
  }

  return out;
}

// ── internals ─────────────────────────────────────────────────────────────────

/** Altius marks captain/keeper in the name: "(C)", "(GK)" or "(C, GK)". */
export function playerFlags(name: string, gk: boolean, captain: boolean): { gk: boolean; captain: boolean } {
  const tags = [...name.matchAll(/\(([^)]*)\)/g)].flatMap((m) => m[1]!.split(/[,\s]+/).map((t) => t.toUpperCase()));
  return { gk: gk || tags.includes("GK"), captain: captain || tags.includes("C") };
}

/**
 * Altius line-up "Min" column: "X" = started; "12" = came on in the 12th minute;
 * "15+" = came on at the start of the period ending at 15'; blank / "DNP" = did not play.
 */
export function parseEntry(raw: string | null | undefined): { started: boolean; minuteEntered: number | null; didNotPlay: boolean } {
  const v = (raw ?? "").trim().toUpperCase();
  if (v === "X") return { started: true, minuteEntered: null, didNotPlay: false };
  const n = v.match(/^(\d{1,3})\+?$/);
  if (n) return { started: false, minuteEntered: Math.min(200, Number(n[1])), didNotPlay: false };
  if (v === "S") return { started: false, minuteEntered: null, didNotPlay: false };
  return { started: false, minuteEntered: null, didNotPlay: true };
}

const titleCase = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** Minimal club for an Altius organisation that isn't in the clubs collection (e.g. visiting Gold Coast clubs). */
function ensureImportedClub(
  t: { code: string; name: string; logoUrl: string | null; altiusOrgId: string | null },
  grade: string,
  newClubs: Doc[],
  clubsByShortName: Map<string, ClubRef>,
  now: Date,
  by: string,
): ClubRef {
  const shortName = ((t.code || "").trim().split(/\s+/)[0] || slug(t.name).slice(0, 6)).toUpperCase();
  const existing = clubsByShortName.get(shortName);
  if (existing) return existing;
  const base = t.name
    .replace(new RegExp(`\\s*${grade.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i"), "")
    .replace(/\s*(#\d+|\d+)\s*$/, "")
    .trim();
  const name = /hockey|club/i.test(base) ? base : `${base} Hockey Club`;
  const ref: ClubRef = { id: `club-altius-${slug(shortName)}`, shortName, name };
  clubsByShortName.set(shortName, ref);
  newClubs.push({
    id: ref.id,
    name,
    shortName,
    slug: slug(name),
    parentAssociationId: null,
    logo: t.logoUrl ?? "",
    colors: { primary: "#06054e", secondary: "#ffd700", accent: "#ffffff" },
    address: { street: "", suburb: "", city: "", state: "QLD", postcode: "", country: "Australia" },
    contact: { email: "", phone: "", website: "" },
    socialMedia: {},
    committee: [],
    active: true,
    memberSequence: 0,
    externalRefs: { altius: { orgId: t.altiusOrgId, code: shortName, importedAt: now.toISOString() } },
    notes: "Created by the Altius 2026 import for a visiting club not in BHA's club list. Review and complete.",
    updatedAt: now.toISOString(),
    updatedBy: by,
  });
  return ref;
}

function idFromTeamId(teamId: string): string {
  return teamId.replace(/^team-altius-/, "");
}

function sameTeam(a: string, b: string): boolean {
  const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9#]+/g, " ").replace(/\bqueensland\b/g, "qld").trim();
  return n(a) === n(b);
}

function resolveTeamId(
  altiusTeamId: string | null,
  code: string | null,
  codeToTeamId: Map<string, string>,
  teamCtx: Map<string, { teamId: string }>,
): string | null {
  if (altiusTeamId && teamCtx.has(altiusTeamId)) return teamCtx.get(altiusTeamId)!.teamId;
  if (code && codeToTeamId.has(code)) return codeToTeamId.get(code)!;
  return null;
}

/** Finals are labelled by phase (Semi Final, Grand Final, Gold Medal…); league games carry the grade name. */
export function isFinalsPhase(phaseLabel: string | null | undefined): boolean {
  const p = (phaseLabel ?? "").trim();
  if (!p) return false;
  if (/^(BHL|JHL|MHL)\b/i.test(p)) return false;
  return /final|semi|medal|play.?off|elimination|qualif/i.test(p);
}

export function fixtureStatusAndResult(m: AltiusMatchRow, homeTeamId: string, awayTeamId: string) {
  const st = (m.status ?? "").toLowerCase();
  const s = m.score;
  if (/cancel/.test(st)) return { status: "cancelled" as const, result: null };
  if (/postpon/.test(st)) return { status: "postponed" as const, result: null };
  if (/(official|complete)/.test(st) && s) {
    const forfeit = /forfeit/.test(st);
    return {
      status: "completed" as const,
      result: {
        resultType: forfeit ? ("forfeit" as const) : ("normal" as const),
        homeScore: s.h,
        awayScore: s.a,
        shootoutHomeScore: s.soH,
        shootoutAwayScore: s.soA,
        forfeitingTeamId: forfeit ? (s.h < s.a ? homeTeamId : s.a < s.h ? awayTeamId : null) : null,
        notes: isFinalsPhase(m.phaseLabel) ? m.phaseLabel : null,
      },
    };
  }
  return { status: "scheduled" as const, result: null };
}

function groupCount<T>(arr: T[], key: (t: T) => string): Record<string, number> {
  const o: Record<string, number> = {};
  for (const a of arr) o[key(a)] = (o[key(a)] ?? 0) + 1;
  return o;
}

function maxKey(o: Record<string, number>): string | null {
  let best: string | null = null;
  let n = -1;
  for (const [k, v] of Object.entries(o)) if (v > n) { best = k; n = v; }
  return best;
}

function findPlayerId(
  c: AltiusCompetition,
  name: string,
  teamId: string | null,
  _h: AltiusHarvest,
  playerApps: Map<string, { name: string; apps: Appearance[] }>,
): string | null {
  const norm = (s: string) => s.replace(/\((GK|C)\)/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  const target = norm(name);
  const fromStats = [...c.scorers, ...c.cards].find((p) => p.altiusPlayerId && norm(p.name) === target);
  if (fromStats?.altiusPlayerId) return fromStats.altiusPlayerId;
  for (const [pid, rec] of playerApps) {
    if (norm(rec.name) !== target) continue;
    if (!teamId || rec.apps.some((a) => a.teamId === teamId)) return pid;
  }
  return null;
}

function baseMember(p: {
  memberId: string;
  clubId: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
  genderId: string;
  roles: string[];
  membershipType: string;
  season: string;
  joinDate: string;
  by: string;
  now: Date;
  playerInfo: Doc | null;
  teams: Doc[];
  altius: Doc;
}): Doc {
  // The importer collects source details in a scratch `altius` object; they are
  // stored as proper member fields (never under a vendor-named key).
  return modernizeMemberFields({
    memberId: p.memberId,
    clubId: p.clubId,
    personalInfo: {
      firstName: p.firstName,
      lastName: p.lastName,
      displayName: p.displayName,
      dateOfBirth: "",
      gender: p.genderId,
      photoUrl: "",
      socialMedia: [],
    },
    contact: {
      primaryEmail: "",
      emailOwnership: "Own",
      additionalEmails: [],
      phone: "",
      mobile: "",
      emergencyContact: { name: "", relationship: "", phone: "" },
    },
    address: { street: "", suburb: "", state: "QLD", postcode: "", country: "Australia" },
    membership: {
      joinDate: p.joinDate,
      membershipType: p.membershipType,
      status: "Active",
      seasonYear: p.season,
      expiryDate: `${p.season}-12-31`,
      renewalDate: null,
      // The members list and club-scoped queries read the club from here.
      ...(p.clubId ? { clubId: p.clubId } : {}),
    },
    roles: p.roles,
    playerInfo: p.playerInfo ?? {
      primaryPosition: "", secondaryPosition: "", jerseyNumber: null, preferredFoot: null, position: "",
    },
    socialMedia: { facebook: "", instagram: "", twitter: "", tiktok: "", linkedin: "" },
    communicationPreferences: {
      preferredMethod: "Email", emailFrequency: "All", smsNotifications: false, pushNotifications: false, socialMediaUpdates: false,
    },
    medical: { conditions: "", medications: "", allergies: "", doctorName: "", doctorPhone: "" },
    emergencyContacts: [],
    familyRelationships: [],
    notes: "Imported from the previous system. Contact details not available — complete before use.",
    status: { banned: false, bannedUntil: null, banReason: null, bannedBy: null },
    teams: p.teams,
    family: null,
    userId: null,
    altius: p.altius,
    updatedAt: p.now,
    updatedBy: p.by,
  });
}
