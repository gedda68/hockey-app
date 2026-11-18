"use client";
// Hand-built SVG charts for the committee reports: categorical hues in fixed order, one axis, a legend, hover tooltips, a table view.

import { useState } from "react";

export const HUES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"]; // blue, orange, aqua, yellow (validated)
const INK = "#1f2937", MUTED = "#6b7280", GRID = "#e5e7eb";

function niceMax(n: number) { if (n <= 4) return 4; const p = 10 ** Math.floor(Math.log10(n)); const f = n / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }

export function Legend({ items }: { items: string[] }) {
  return <div className="flex flex-wrap gap-4 mb-2">{items.map((l, i) => <span key={l} className="flex items-center gap-1.5 text-xs font-bold" style={{ color: INK }}><span className="inline-block w-3 h-3 rounded-sm" style={{ background: HUES[i] }} />{l}</span>)}</div>;
}

type Tip = { x: number; y: number; text: string } | null;

function Frame({ w, h, max, children, tip }: { w: number; h: number; max: number; children: React.ReactNode; tip: Tip }) {
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img">
        {ticks.map((t) => { const y = 10 + (h - 50) * (1 - t / max); return <g key={t}><line x1={44} x2={w - 8} y1={y} y2={y} stroke={GRID} strokeWidth={1} /><text x={38} y={y + 4} fontSize={11} textAnchor="end" fill={MUTED}>{t}</text></g>; })}
        {children}
      </svg>
      {tip && <div className="absolute pointer-events-none px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 shadow-lg whitespace-pre" style={{ left: `${(tip.x / w) * 100}%`, top: `${(tip.y / h) * 100}%`, transform: "translate(-50%,-110%)", color: INK }}>{tip.text}</div>}
    </div>
  );
}

/** Bars by category, stacked by series (e.g. age group by gender). */
export function StackedBars({ labels, series, names }: { labels: string[]; series: number[][]; names: string[] }) {
  const [tip, setTip] = useState<Tip>(null);
  const w = Math.max(520, labels.length * 54 + 60), h = 280, plotH = h - 50, left = 44;
  const totals = labels.map((_, i) => series.reduce((s, a) => s + (a[i] ?? 0), 0));
  const max = niceMax(Math.max(1, ...totals)), slot = (w - left - 8) / Math.max(1, labels.length), bw = Math.min(30, slot - 8);
  return (
    <div>
      <Legend items={names} />
      <Frame w={w} h={h} max={max} tip={tip}>
        {labels.map((l, i) => {
          let y = 10 + plotH; const x = left + slot * i + (slot - bw) / 2;
          const tipText = `${l}: ${totals[i]}\n` + names.map((n, k) => `${n} ${series[k][i] ?? 0}`).join("  ");
          return (
            <g key={l} onMouseEnter={() => setTip({ x: x + bw / 2, y: 10 + plotH - (totals[i] / max) * plotH, text: tipText })} onMouseLeave={() => setTip(null)}>
              <rect x={left + slot * i} y={10} width={slot} height={plotH + 30} fill="transparent" />
              {series.map((a, k) => { const v = a[i] ?? 0; if (!v) return null; const hh = Math.max(2, (v / max) * plotH - 2); y -= hh + 2; return <rect key={k} x={x} y={y + 2} width={bw} height={hh} rx={k === series.length - 1 ? 4 : 0} fill={HUES[k]} />; })}
              <text x={x + bw / 2} y={h - 24} fontSize={10} textAnchor="middle" fill={MUTED}>{l.replace("Under ", "U").replace("Masters ", "M")}</text>
            </g>
          );
        })}
      </Frame>
    </div>
  );
}

/** Lines over categories (seasons or months), one per series. */
export function Lines({ labels, series, names }: { labels: string[]; series: number[][]; names: string[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const w = 560, h = 260, plotH = h - 50, left = 44, step = (w - left - 16) / Math.max(1, labels.length - 1);
  const max = niceMax(Math.max(1, ...series.flat()));
  const px = (i: number) => (labels.length === 1 ? left + (w - left) / 2 : left + step * i), py = (v: number) => 10 + plotH * (1 - v / max);
  const tip: Tip = hover === null ? null : { x: px(hover), y: Math.min(...series.map((a) => py(a[hover] ?? 0))), text: `${labels[hover]}\n` + names.map((n, k) => `${n} ${series[k][hover] ?? 0}`).join("\n") };
  return (
    <div>
      {names.length > 1 && <Legend items={names} />}
      <Frame w={w} h={h} max={max} tip={tip}>
        {series.map((a, k) => <polyline key={k} fill="none" stroke={HUES[k]} strokeWidth={2} strokeLinejoin="round" points={a.map((v, i) => `${px(i)},${py(v)}`).join(" ")} />)}
        {series.map((a, k) => a.map((v, i) => <circle key={`${k}-${i}`} cx={px(i)} cy={py(v)} r={hover === i ? 5 : 3.5} fill={HUES[k]} stroke="#fff" strokeWidth={2} />))}
        {labels.map((l, i) => <text key={l} x={px(i)} y={h - 24} fontSize={10} textAnchor="middle" fill={MUTED}>{l}</text>)}
        {labels.map((l, i) => <rect key={`h${l}`} x={px(i) - step / 2} y={10} width={Math.max(step, 24)} height={plotH + 30} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />)}
      </Frame>
    </div>
  );
}

/** Horizontal percentage bars, one series. */
export function RateBars({ rows, unit = "%" }: { rows: { label: string; rate: number; note: string; shown?: string }[]; unit?: string }) {
  if (!rows.length) return <p className="text-sm text-slate-400 font-bold">Nothing to show for this season yet.</p>;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} title={r.note}>
          <div className="flex justify-between text-xs font-bold mb-0.5" style={{ color: INK }}><span>{r.label}</span><span>{r.shown ?? `${r.rate}${unit}`} <span style={{ color: MUTED }}>{r.shown ? "" : `· ${r.note}`}</span></span></div>
          <div className="h-3 rounded-full bg-slate-100"><div className="h-3" style={{ width: `${Math.min(100, r.rate)}%`, background: HUES[0], borderRadius: "0 4px 4px 0" }} /></div>
        </div>
      ))}
    </div>
  );
}

/** Same numbers as a table, for screen readers and anyone who prefers figures. */
export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto"><table className="w-full text-sm">
      <thead><tr>{head.map((h, i) => <th key={h} className={`py-1.5 px-2 text-xs font-black uppercase text-slate-500 ${i ? "text-right" : "text-left"}`}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-slate-100">{r.map((c, j) => <td key={j} className={`py-1.5 px-2 font-bold ${j ? "text-right" : "text-left"}`} style={{ color: INK }}>{c}</td>)}</tr>)}</tbody>
    </table></div>
  );
}
