// lib/reports/committee.ts
// Committee reports from registrations: how many people registered each season, who came back (retention), who plays
// by age group and gender, registered coaches, umpires and technical officials, and where young players go to school.
// Pure: the service loads the registrations and people; this works out the figures.

import { AGE_ORDER, ageGroup, genderLabel, roleKinds, type Gender } from "@/lib/reports/groups";
import { groupKey, type School } from "@/lib/members/school";

export interface Reg { memberId: string; season: string; clubId?: string; roles: string[]; at?: string | null }
export interface Person { gender?: string; dob?: string; name?: string; school?: School | null }

interface Seat { roles: Set<string>; clubs: Set<string>; first: string | null }
type SeasonMap = Map<string, Map<string, Seat>>;

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function bySeason(regs: Reg[]): SeasonMap {
  const out: SeasonMap = new Map();
  for (const r of regs) {
    if (!r.memberId || !/^\d{4}$/.test(String(r.season))) continue;
    const m = out.get(r.season) ?? new Map<string, Seat>();
    const s = m.get(r.memberId) ?? { roles: new Set<string>(), clubs: new Set<string>(), first: null };
    for (const role of r.roles) s.roles.add(role);
    if (r.clubId) s.clubs.add(r.clubId);
    if (r.at && (!s.first || r.at < s.first)) s.first = r.at;
    m.set(r.memberId, s); out.set(r.season, m);
  }
  return out;
}
const kinds = (s: Seat) => roleKinds([...s.roles]);
const countKind = (m: Map<string, Seat> | undefined, k: keyof ReturnType<typeof roleKinds>) => (m ? [...m.values()].filter((s) => kinds(s)[k]).length : 0);

export interface TrendRow { season: string; people: number; players: number; coaches: number; umpires: number; technical: number }
export interface RetentionRow { season: string; previous: number; retained: number; lapsed: number; returning: number; brandNew: number; rate: number }
export interface Cell { label: string; total: number; Female: number; Male: number; Other: number; Unknown: number }
export interface RateRow { label: string; cohort: number; retained: number; rate: number }
export interface Count { label: string; count: number }
export interface OfficialRow { memberId: string; name: string; roles: string[]; clubs: string[] }

export interface CommitteeReport {
  season: string;
  seasons: string[];
  totals: { members: number; players: number; coaches: number; umpires: number; technical: number; femalePlayers: number; malePlayers: number };
  trend: TrendRow[];
  retention: RetentionRow[];
  retentionByAge: RateRow[];
  retentionByGender: RateRow[];
  members: Cell[];
  players: Cell[];
  monthly: { month: string; current: number; previous: number }[];
  officials: { coaches: OfficialRow[]; umpires: OfficialRow[]; technical: OfficialRow[] };
  school: { districts: Count[]; schools: (Count & { district: string })[]; atSchool: number; notAtSchool: number; notRecorded: number; youngCoverage: number };
  clubs: { clubId: string; name: string; people: number; players: number; previous: number; retained: number; rate: number }[];
}

const emptyCell = (label: string): Cell => ({ label, total: 0, Female: 0, Male: 0, Other: 0, Unknown: 0 });
function cells(ids: Iterable<string>, people: Map<string, Person>, year: number): Cell[] {
  const by = new Map<string, Cell>();
  for (const id of ids) {
    const p = people.get(id), g = ageGroup(p?.dob, year), gen: Gender = genderLabel(p?.gender);
    const c = by.get(g) ?? emptyCell(g);
    c.total++; c[gen]++; by.set(g, c);
  }
  return AGE_ORDER.filter((a) => by.has(a)).map((a) => by.get(a)!);
}
const rates = (cohort: string[], now: Map<string, Seat> | undefined, label: (id: string) => string, order?: string[]): RateRow[] => {
  const by = new Map<string, RateRow>();
  for (const id of cohort) {
    const k = label(id), r = by.get(k) ?? { label: k, cohort: 0, retained: 0, rate: 0 };
    r.cohort++; if (now?.has(id)) r.retained++; by.set(k, r);
  }
  const rows = [...by.values()].map((r) => ({ ...r, rate: pct(r.retained, r.cohort) }));
  return order ? order.filter((o) => by.has(o)).map((o) => rows.find((r) => r.label === o)!) : rows.sort((a, b) => b.cohort - a.cohort);
};

export function buildCommitteeReport(o: { regs: Reg[]; people: Map<string, Person>; season: string; clubNames?: Map<string, string>; years?: number }): CommitteeReport {
  const sets = bySeason(o.regs), year = Number(o.season), prev = String(year - 1);
  const seasons = [...sets.keys()].filter((s) => s <= o.season).sort().slice(-(o.years ?? 8));
  if (!seasons.includes(o.season)) seasons.push(o.season);
  const cur = sets.get(o.season) ?? new Map<string, Seat>(), before = sets.get(prev);
  const trend: TrendRow[] = [], retention: RetentionRow[] = [];
  for (const s of [...sets.keys()].sort()) {
    const m = sets.get(s)!;
    if (seasons.includes(s)) trend.push({ season: s, people: m.size, players: countKind(m, "player"), coaches: countKind(m, "coach"), umpires: countKind(m, "umpire"), technical: countKind(m, "technical") });
    const p = sets.get(String(Number(s) - 1));
    if (seasons.includes(s) && p) {
      const retained = [...p.keys()].filter((id) => m.has(id)).length;
      const fresh = [...m.keys()].filter((id) => !p.has(id));
      const earlier = new Set<string>();
      for (const [es, em] of sets) if (es < String(Number(s) - 1)) for (const id of em.keys()) earlier.add(id);
      const returning = fresh.filter((id) => earlier.has(id)).length;
      retention.push({ season: s, previous: p.size, retained, lapsed: p.size - retained, returning, brandNew: fresh.length - returning, rate: pct(retained, p.size) });
    }
  }

  const players = [...cur].filter(([, s]) => kinds(s).player).map(([id]) => id);
  const playerCells = cells(players, o.people, year);
  const cohort = before ? [...before.keys()] : [];
  const prevYear = year - 1;
  const retentionByAge = rates(cohort, cur, (id) => ageGroup(o.people.get(id)?.dob, prevYear), AGE_ORDER);
  const retentionByGender = rates(cohort, cur, (id) => genderLabel(o.people.get(id)?.gender), ["Female", "Male", "Other", "Unknown"]);

  const monthOf = (m: Map<string, Seat> | undefined) => { const a = Array(12).fill(0); for (const s of m?.values() ?? []) { const t = s.first ? new Date(s.first) : null; if (t && !Number.isNaN(t.getTime())) a[t.getUTCMonth()]++; } return a as number[]; };
  const mc = monthOf(cur), mp = monthOf(before);

  const officials = { coaches: [] as OfficialRow[], umpires: [] as OfficialRow[], technical: [] as OfficialRow[] };
  for (const [id, s] of cur) {
    const k = kinds(s), row: OfficialRow = { memberId: id, name: o.people.get(id)?.name ?? "Member", roles: [...s.roles], clubs: [...s.clubs].map((c) => o.clubNames?.get(c) ?? c) };
    if (k.coach) officials.coaches.push(row); if (k.umpire) officials.umpires.push(row); if (k.technical) officials.technical.push(row);
  }
  for (const list of Object.values(officials)) list.sort((a, b) => a.name.localeCompare(b.name));

  const districts = new Map<string, Count>(), schools = new Map<string, Count & { district: string }>();
  let atSchool = 0, notAtSchool = 0, notRecorded = 0, young = 0, youngRecorded = 0;
  for (const id of cur.keys()) {
    const p = o.people.get(id), sc = p?.school, isYoung = ageGroup(p?.dob, year) !== "Unknown" && year - new Date(String(p?.dob)).getFullYear() <= 18;
    if (isYoung) { young++; if (sc) youngRecorded++; }
    if (!sc) { notRecorded++; continue; }
    if (!sc.attends) { notAtSchool++; continue; }
    atSchool++;
    if (sc.district) { const k = groupKey(sc.district); const d = districts.get(k) ?? { label: sc.district, count: 0 }; d.count++; districts.set(k, d); }
    if (sc.name) { const k = groupKey(sc.name); const d = schools.get(k) ?? { label: sc.name, count: 0, district: sc.district ?? "" }; d.count++; schools.set(k, d); }
  }
  const byCount = <T extends Count>(m: Map<string, T>) => [...m.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const clubSets = new Map<string, { cur: Set<string>; prev: Set<string>; players: Set<string> }>();
  for (const r of o.regs) {
    if (!r.clubId || (r.season !== o.season && r.season !== prev)) continue;
    const c = clubSets.get(r.clubId) ?? { cur: new Set(), prev: new Set(), players: new Set() };
    (r.season === o.season ? c.cur : c.prev).add(r.memberId);
    if (r.season === o.season && roleKinds(r.roles).player) c.players.add(r.memberId);
    clubSets.set(r.clubId, c);
  }
  const clubs = [...clubSets].map(([clubId, c]) => { const retained = [...c.prev].filter((id) => c.cur.has(id)).length; return { clubId, name: o.clubNames?.get(clubId) ?? clubId, people: c.cur.size, players: c.players.size, previous: c.prev.size, retained, rate: pct(retained, c.prev.size) }; }).filter((c) => c.people || c.previous).sort((a, b) => b.people - a.people);

  const gp = (g: Gender) => playerCells.reduce((s, c) => s + c[g], 0);
  return {
    season: o.season, seasons,
    totals: { members: cur.size, players: players.length, coaches: officials.coaches.length, umpires: officials.umpires.length, technical: officials.technical.length, femalePlayers: gp("Female"), malePlayers: gp("Male") },
    trend, retention: retention.filter((r) => seasons.includes(r.season)), retentionByAge, retentionByGender,
    members: cells(cur.keys(), o.people, year), players: playerCells,
    monthly: MONTHS.map((month, i) => ({ month, current: mc[i], previous: mp[i] })),
    officials,
    school: { districts: byCount(districts).slice(0, 20), schools: byCount(schools).slice(0, 25), atSchool, notAtSchool, notRecorded, youngCoverage: pct(youngRecorded, young) },
    clubs,
  };
}

const q = (v: string | number) => { const s = String(v); return /^[=+\-@]/.test(s) ? `"'${s.replace(/"/g, '""')}"` : /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

/** Everything as one spreadsheet, a section at a time. */
export function committeeCsv(r: CommitteeReport, title: string): string {
  const rows: (string | number)[][] = [[title, `Season ${r.season}`], []];
  rows.push(["Registration trend"], ["Season", "People", "Players", "Coaches", "Umpires", "Technical officials"], ...r.trend.map((t) => [t.season, t.people, t.players, t.coaches, t.umpires, t.technical]), []);
  rows.push(["Retention"], ["Season", "Registered last season", "Registered again", "Did not return", "Returning after a break", "New", "Retention %"], ...r.retention.map((t) => [t.season, t.previous, t.retained, t.lapsed, t.returning, t.brandNew, t.rate]), []);
  rows.push([`Retention by age group (${Number(r.season) - 1} to ${r.season})`], ["Age group", "Registered last season", "Registered again", "Retention %"], ...r.retentionByAge.map((t) => [t.label, t.cohort, t.retained, t.rate]), []);
  rows.push(["Retention by gender"], ["Gender", "Registered last season", "Registered again", "Retention %"], ...r.retentionByGender.map((t) => [t.label, t.cohort, t.retained, t.rate]), []);
  for (const [name, list] of [["All members", r.members], ["Players", r.players]] as const) rows.push([`${name} by age group and gender`], ["Age group", "Total", "Female", "Male", "Other", "Not stated"], ...list.map((c) => [c.label, c.total, c.Female, c.Male, c.Other, c.Unknown]), []);
  rows.push(["Registered coaches, umpires and technical officials"], ["Role", "Name", "Clubs"], ...(["coaches", "umpires", "technical"] as const).flatMap((k) => r.officials[k].map((o) => [k === "technical" ? "Technical official" : k === "coaches" ? "Coach" : "Umpire", o.name, o.clubs.join("; ")])), []);
  rows.push(["School districts"], ["District", "Members"], ...r.school.districts.map((d) => [d.label, d.count]), [], ["Schools"], ["School", "District", "Members"], ...r.school.schools.map((d) => [d.label, d.district, d.count]), []);
  if (r.clubs.length > 1) rows.push(["Clubs"], ["Club", "People", "Players", "Registered last season", "Registered again", "Retention %"], ...r.clubs.map((c) => [c.name, c.people, c.players, c.previous, c.retained, c.rate]));
  return rows.map((row) => row.map(q).join(",")).join("\n");
}
