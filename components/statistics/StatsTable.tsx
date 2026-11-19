// A ranked stats table (real data). Server-safe: no client state.
export interface StatsColumn { key: string; label: string; align?: "left" | "right" }
export interface StatsRowData { id: string; cells: Record<string, string | number>; sub?: string }

export default function StatsTable({ title, columns, rows, empty = "No results recorded yet." }: { title: string; columns: StatsColumn[]; rows: StatsRowData[]; empty?: string }) {
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
              {rows.map((r, i) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className={`py-2.5 font-black ${i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-600" : "text-slate-600"}`}>{i + 1}</td>
                  {columns.map((c, ci) => (
                    <td key={c.key} className={`py-2.5 ${c.align === "left" ? "text-left" : "text-right font-bold text-[#06054e]"}`}>
                      {ci === 0 ? (<><span className="font-bold text-[#06054e]">{r.cells[c.key]}</span>{r.sub && <span className="block text-[11px] font-normal text-slate-400">{r.sub}</span>}</>) : r.cells[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
