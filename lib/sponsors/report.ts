// lib/sponsors/report.ts
// Sponsor reports: how often each sponsor's logo was shown and clicked, compared with the period before, as a table,
// a CSV and a page a club can hand to the sponsor. Pure: the database side is in ./service.

export type Source = "site" | "portal";
export const SOURCE_LABELS: Record<Source, string> = { site: "Public website", portal: "Members' portal" };

export interface DailyRow { partnerRef: string; label: string; day: string; source?: string; clicks?: number; impressions?: number }

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
const dayOf = (t: number) => new Date(t).toISOString().slice(0, 10);
export const MAX_DAYS = 366;

/** The dates asked for, made sensible: last 30 days when missing, the right way round, never more than a year. */
export function cleanRange(from?: string | null, to?: string | null, today: string = dayOf(Date.now())): { from: string; to: string } {
  let t = to && DAY_RE.test(to) ? to : today;
  let f = from && DAY_RE.test(from) ? from : dayOf(ms(t) - 29 * 86400_000);
  if (Number.isNaN(ms(t))) t = today;
  if (Number.isNaN(ms(f))) f = dayOf(ms(t) - 29 * 86400_000);
  if (f > t) [f, t] = [t, f];
  if ((ms(t) - ms(f)) / 86400_000 + 1 > MAX_DAYS) f = dayOf(ms(t) - (MAX_DAYS - 1) * 86400_000);
  return { from: f, to: t };
}

export const daysIn = (from: string, to: string) => Math.round((ms(to) - ms(from)) / 86400_000) + 1;
export const fillDays = (from: string, to: string) => Array.from({ length: daysIn(from, to) }, (_, i) => dayOf(ms(from) + i * 86400_000));

/** The period of the same length straight before this one. */
export function previousRange(from: string, to: string): { from: string; to: string } {
  const n = daysIn(from, to);
  return { from: dayOf(ms(from) - n * 86400_000), to: dayOf(ms(from) - 86400_000) };
}

/** Click-through rate as a percentage with two decimals; 0 when nothing was shown. */
export const ctr = (clicks: number, impressions: number) => (impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0);

/** Change from the previous period as a whole percentage; null when there is nothing to compare with. */
export const change = (now: number, before: number): number | null => (before > 0 ? Math.round(((now - before) / before) * 100) : null);

export interface Tally { impressions: number; clicks: number }
export interface SponsorLine {
  partnerRef: string; label: string; impressions: number; clicks: number; ctr: number;
  previous: Tally; impressionsChange: number | null; clicksChange: number | null;
  bySource: Record<Source, Tally>; daily: { day: string; impressions: number; clicks: number }[];
}
export interface Report { range: { from: string; to: string }; previousRange: { from: string; to: string }; sponsors: SponsorLine[]; totals: Tally & { ctr: number } }

const srcOf = (s?: string): Source => (s === "portal" ? "portal" : "site");

/** `listed` are today's sponsors, so one with no activity still appears (with zeros) and the club can see that. */
export function buildReport(rows: DailyRow[], prevRows: DailyRow[], range: { from: string; to: string }, listed: { partnerRef: string; label: string }[] = []): Report {
  const days = fillDays(range.from, range.to);
  const lines = new Map<string, SponsorLine>();
  const line = (ref: string, label: string) => {
    let l = lines.get(ref);
    if (!l) lines.set(ref, (l = { partnerRef: ref, label, impressions: 0, clicks: 0, ctr: 0, previous: { impressions: 0, clicks: 0 }, impressionsChange: null, clicksChange: null, bySource: { site: { impressions: 0, clicks: 0 }, portal: { impressions: 0, clicks: 0 } }, daily: days.map((day) => ({ day, impressions: 0, clicks: 0 })) }));
    if (label && !l.label) l.label = label;
    return l;
  };
  for (const p of listed) line(p.partnerRef, p.label);
  const dayIndex = new Map(days.map((d, i) => [d, i]));
  for (const r of rows) {
    const i = dayIndex.get(r.day);
    if (i === undefined) continue;
    const l = line(r.partnerRef, r.label), imp = Number(r.impressions) || 0, clk = Number(r.clicks) || 0;
    l.impressions += imp; l.clicks += clk;
    l.bySource[srcOf(r.source)].impressions += imp; l.bySource[srcOf(r.source)].clicks += clk;
    l.daily[i].impressions += imp; l.daily[i].clicks += clk;
  }
  for (const r of prevRows) { const l = lines.get(r.partnerRef); if (l) { l.previous.impressions += Number(r.impressions) || 0; l.previous.clicks += Number(r.clicks) || 0; } }
  const sponsors = [...lines.values()].map((l) => ({ ...l, ctr: ctr(l.clicks, l.impressions), impressionsChange: change(l.impressions, l.previous.impressions), clicksChange: change(l.clicks, l.previous.clicks) }))
    .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks || a.label.localeCompare(b.label));
  const impressions = sponsors.reduce((s, l) => s + l.impressions, 0), clicks = sponsors.reduce((s, l) => s + l.clicks, 0);
  return { range, previousRange: previousRange(range.from, range.to), sponsors, totals: { impressions, clicks, ctr: ctr(clicks, impressions) } };
}

const csvCell = (v: string | number) => { const s = String(v); return /^[=+\-@]/.test(s) || /[",\n]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"` : s; };

/** One row per sponsor, then the daily figures: opens straight in a spreadsheet. */
export function reportCsv(r: Report): string {
  const out = [["Sponsor", "Impressions", "Clicks", "Click-through rate %", "Impressions previous period", "Clicks previous period", "Website impressions", "Website clicks", "Portal impressions", "Portal clicks"]];
  for (const s of r.sponsors) out.push([s.label, s.impressions, s.clicks, s.ctr, s.previous.impressions, s.previous.clicks, s.bySource.site.impressions, s.bySource.site.clicks, s.bySource.portal.impressions, s.bySource.portal.clicks] as never);
  out.push([], ["Day", "Sponsor", "Impressions", "Clicks"] as never);
  for (const s of r.sponsors) for (const d of s.daily) if (d.impressions || d.clicks) out.push([d.day, s.label, d.impressions, d.clicks] as never);
  return out.map((row) => row.map(csvCell).join(",")).join("\n");
}
