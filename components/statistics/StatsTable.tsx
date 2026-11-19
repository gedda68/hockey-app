"use client";
// A ranked stats table (real data), ten rows a page; each table pages on its own.
import { useState } from "react";

const PAGE_SIZE = 10;

export interface StatsColumn { key: string; label: string; align?: "left" | "right" }
export interface StatsRowData { id: string; cells: Record<string, string | number>; sub?: string; icon?: { src?: string; alt: string } }

function ClubIcon({ src, alt }: { src?: string; alt: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className="h-8 w-8 shrink-0 rounded-full bg-slate-100 object-contain" />;
  }
  return <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#06054e] text-[10px] font-black text-yellow-200">{alt.trim().slice(0, 2).toUpperCase() || "?"}</span>;
}

export default function StatsTable({ title, columns, rows, empty = "No results recorded yet." }: { title: string; columns: StatsColumn[]; rows: StatsRowData[]; empty?: string }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const cur = Math.min(page, pages - 1); // the list can shrink when filters change
  const start = cur * PAGE_SIZE;
  const shown = rows.slice(start, start + PAGE_SIZE);
  const btn = "rounded-lg border border-slate-200 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#06054e] enabled:hover:bg-slate-100 disabled:opacity-30";
  return (
    <section className="rounded-3xl bg-white p-5 shadow-lg">
      <h3 className="mb-3 border-b-2 border-slate-200 pb-3 text-base font-black uppercase italic text-[#06054e]">{title}</h3>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm font-bold text-slate-400">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                <th className="w-8 py-2 text-left">#</th>
                {columns.map((c) => (
                  <th key={c.key} className={`py-2 ${c.align === "left" ? "text-left" : "text-right"}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r, j) => { const i = start + j; return (
                <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className={`py-2.5 font-black ${i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-600" : "text-slate-600"}`}>{i + 1}</td>
                  {columns.map((c, ci) => (
                    <td key={c.key} className={`py-2.5 ${c.align === "left" ? "text-left" : "text-right font-bold text-[#06054e]"}`}>
                      {ci === 0 ? (
                        <div className="flex items-center gap-2.5">
                          {r.icon && <ClubIcon src={r.icon.src} alt={r.icon.alt} />}
                          <div className="min-w-0"><span className="font-bold text-[#06054e]">{r.cells[c.key]}</span>{r.sub && <span className="block text-[11px] font-normal text-slate-400">{r.sub}</span>}</div>
                        </div>
                      ) : r.cells[c.key]}
                    </td>
                  ))}
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <span className="text-[11px] font-bold text-slate-400">{start + 1}–{start + shown.length} of {rows.length}</span>
          <div className="flex items-center gap-2">
            <button type="button" className={btn} disabled={cur === 0} onClick={() => setPage(cur - 1)} aria-label={`Previous page of ${title}`}>Prev</button>
            <span className="text-[11px] font-bold text-slate-500">{cur + 1} / {pages}</span>
            <button type="button" className={btn} disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} aria-label={`Next page of ${title}`}>Next</button>
          </div>
        </div>
      )}
    </section>
  );
}
