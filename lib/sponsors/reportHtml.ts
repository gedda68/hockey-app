// lib/sponsors/reportHtml.ts — a one-sponsor report as a page the club can send, or print to PDF. Pure.

import { SOURCE_LABELS, type SponsorLine } from "@/lib/sponsors/report";

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (v: number) => v.toLocaleString("en-AU");
const dateText = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const delta = (c: number | null) => (c === null ? "" : `<span class="delta ${c >= 0 ? "up" : "down"}">${c >= 0 ? "▲" : "▼"} ${Math.abs(c)}% on the previous period</span>`);

export interface SponsorPage { orgName: string; sponsor: SponsorLine; range: { from: string; to: string }; reach?: { members: number } | null; color?: string; generatedAt: Date }

export function renderSponsorPage(p: SponsorPage): string {
  const s = p.sponsor, color = /^#[0-9a-f]{6}$/i.test(p.color ?? "") ? p.color! : "#06054e";
  const max = Math.max(1, ...s.daily.map((d) => d.impressions));
  const W = 720, H = 140, bw = W / Math.max(1, s.daily.length);
  const bars = s.daily.map((d, i) => `<rect x="${(i * bw).toFixed(2)}" y="${(H - (d.impressions / max) * H).toFixed(2)}" width="${Math.max(1, bw - 1).toFixed(2)}" height="${((d.impressions / max) * H).toFixed(2)}" fill="${color}" opacity="0.85"><title>${esc(d.day)}: ${d.impressions} shown, ${d.clicks} clicks</title></rect>`).join("");
  const sources = (Object.keys(SOURCE_LABELS) as (keyof typeof SOURCE_LABELS)[]).filter((k) => s.bySource[k].impressions || s.bySource[k].clicks).map((k) => `<tr><td>${esc(SOURCE_LABELS[k])}</td><td>${n(s.bySource[k].impressions)}</td><td>${n(s.bySource[k].clicks)}</td></tr>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(s.label)} sponsorship report</title><style>
body{font-family:Arial,Helvetica,sans-serif;color:#334155;max-width:760px;margin:24px auto;padding:0 16px}
h1{color:${color};margin:0 0 4px;font-size:26px}.sub{color:#64748b;margin:0 0 24px}
.cards{display:flex;gap:12px;flex-wrap:wrap;margin:0 0 24px}.card{flex:1;min-width:150px;border:2px solid #e2e8f0;border-radius:14px;padding:14px}
.card b{display:block;font-size:30px;color:${color}}.card span{font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.05em;color:#64748b}
.delta{display:block;font-size:12px;margin-top:4px}.up{color:#047857}.down{color:#b91c1c}
table{width:100%;border-collapse:collapse;margin:8px 0 24px}th,td{text-align:left;padding:8px;border-bottom:1px solid #e2e8f0;font-size:14px}th{font-size:12px;text-transform:uppercase;color:#64748b}
h2{font-size:16px;margin:24px 0 6px}.foot{font-size:12px;color:#94a3b8;margin-top:32px}@media print{body{margin:0}}
</style></head><body>
<h1>${esc(s.label)}</h1>
<p class="sub">Sponsorship report for ${esc(p.orgName)} · ${esc(dateText(p.range.from))} to ${esc(dateText(p.range.to))}</p>
<div class="cards">
<div class="card"><b>${n(s.impressions)}</b><span>Times your logo was shown</span>${delta(s.impressionsChange)}</div>
<div class="card"><b>${n(s.clicks)}</b><span>Visits to your website</span>${delta(s.clicksChange)}</div>
<div class="card"><b>${s.ctr}%</b><span>Click-through rate</span></div>
${p.reach ? `<div class="card"><b>${n(p.reach.members)}</b><span>Members in the club</span></div>` : ""}
</div>
<h2>Shown each day</h2>
<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Daily impressions">${bars}</svg>
${sources ? `<h2>Where it was seen</h2><table><thead><tr><th>Where</th><th>Shown</th><th>Clicks</th></tr></thead><tbody>${sources}</tbody></table>` : ""}
<p class="foot">Counts are page views and link clicks, added up by day. No names, accounts or device details are recorded. Generated ${esc(p.generatedAt.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Brisbane" }))}.</p>
</body></html>`;
}
