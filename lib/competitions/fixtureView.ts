// lib/competitions/fixtureView.ts — which matches the Match Day page shows, and the rows of its spreadsheet download.

export interface Timed { round?: unknown; dateTime?: unknown; status?: unknown }
const ms = (m: Timed) => { const t = new Date(String(m.dateTime ?? "")).getTime(); return Number.isFinite(t) ? t : 0; };

/** The year to open on: this year when there is one, otherwise the nearest later year, otherwise the latest. */
export function defaultYear(years: string[], now: Date): string {
  const sorted = [...new Set(years)].sort();
  const y = String(now.getFullYear());
  if (sorted.includes(y)) return y;
  return sorted.find((x) => x > y) ?? sorted[sorted.length - 1] ?? y;
}

/** The next round by date: the round of the earliest match that has not finished; when all are done, the latest round played. */
export function pickNextRound(matches: Timed[], now: Date): string | null {
  const open = matches.filter((m) => ms(m) >= now.getTime() - 6 * 3_600_000).sort((a, b) => ms(a) - ms(b));
  if (open.length) return String(open[0].round ?? "");
  const done = [...matches].sort((a, b) => ms(b) - ms(a));
  return done.length ? String(done[0].round ?? "") : null;
}

export type RoundChoice = "next" | "week" | "all" | string;
export type Resolved = { kind: "all" } | { kind: "week"; start: number; end: number } | { kind: "round"; round: string };

const startOfWeek = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() + ((x.getDay() === 0 ? -6 : 1) - x.getDay())); x.setHours(0, 0, 0, 0); return x; };

export function resolveRound(choice: RoundChoice | undefined, matches: Timed[], now: Date): Resolved {
  const c = (choice ?? "next").trim() || "next";
  if (c === "all") return { kind: "all" };
  if (c === "week") { const s = startOfWeek(now); return { kind: "week", start: s.getTime(), end: s.getTime() + 7 * 86_400_000 }; }
  if (c === "next") { const r = pickNextRound(matches, now); return r === null ? { kind: "all" } : { kind: "round", round: r }; }
  return { kind: "round", round: c };
}

export function selectMatches<T extends Timed>(matches: T[], r: Resolved): T[] {
  if (r.kind === "all") return [...matches].sort((a, b) => ms(a) - ms(b));
  if (r.kind === "week") return matches.filter((m) => ms(m) >= r.start && ms(m) < r.end).sort((a, b) => ms(a) - ms(b));
  return matches.filter((m) => String(m.round) === r.round).sort((a, b) => ms(a) - ms(b));
}

/** A team name whether it arrives as text or as { name }. */
export const teamText = (t: unknown): string => (typeof t === "string" ? t : t && typeof t === "object" && "name" in t ? String((t as { name?: unknown }).name ?? "") : "");

export interface ExportInput { round: unknown; dateTime: unknown; division: string; home: string; away: string; venue: string; status: string; homeScore?: number | null; awayScore?: number | null }
export const EXPORT_HEADER = ["Round", "Date", "Day", "Time", "Division", "Home", "Away", "Venue", "Status", "Score"];

export function exportRows(items: ExportInput[], timeZone = "Australia/Brisbane"): (string | number)[][] {
  const fmt = (o: Intl.DateTimeFormatOptions, d: Date) => new Intl.DateTimeFormat("en-AU", { timeZone, ...o }).format(d);
  return items.map((m) => {
    const d = new Date(String(m.dateTime ?? ""));
    const ok = !Number.isNaN(d.getTime());
    return [typeof m.round === "number" || /^\d+$/.test(String(m.round)) ? Number(m.round) : String(m.round ?? ""), ok ? fmt({ day: "2-digit", month: "short", year: "numeric" }, d) : "", ok ? fmt({ weekday: "long" }, d) : "", ok ? fmt({ hour: "numeric", minute: "2-digit", hour12: true }, d) : "",
      m.division, m.home, m.away, m.venue, m.status, m.homeScore != null && m.awayScore != null ? `${m.homeScore} - ${m.awayScore}` : ""];
  });
}

export const slug = (s: string) => s.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
export const toCsv = (rows: (string | number)[][]) => rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
