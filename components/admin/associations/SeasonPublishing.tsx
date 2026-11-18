"use client";
// Season → divisions → rounds publishing workflow.
import { useCallback, useEffect, useState } from "react";

type Round = { round: number; label: string; finals: boolean; total: number; published: number };
type Division = { seasonCompetitionId: string; status: string; label: string; total: number; published: number; rounds: Round[] };

export default function SeasonPublishing({ associationId }: { associationId: string }) {
  const [season, setSeason] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<string[]>([]);
  const [divs, setDivs] = useState<Division[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async (s?: string | null) => {
    const res = await fetch(`/api/admin/associations/${encodeURIComponent(associationId)}/publishing${s ? `?season=${encodeURIComponent(s)}` : ""}`, { credentials: "include" });
    const j = await res.json();
    if (!res.ok) { setMsg({ ok: false, text: j.error ?? "Could not load" }); return; }
    setSeason(j.season); setSeasons(j.seasons ?? []); setDivs(j.divisions ?? []);
  }, [associationId]);
  useEffect(() => { void load(null); }, [load]);

  const api = (id: string) => `/api/admin/season-competitions/${encodeURIComponent(id)}`;
  const send = async (url: string, method: string, body: unknown) => {
    const res = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(String(j.error ?? "Could not update"));
  };
  const run = async (text: string, fn: () => Promise<void>) => {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ ok: true, text }); await load(season); } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); } finally { setBusy(false); }
  };
  const publishDivision = async (d: Division) => {
    if (d.status === "draft") await send(api(d.seasonCompetitionId), "PATCH", { status: "published" });
    await send(`${api(d.seasonCompetitionId)}/fixtures/publish`, "POST", { published: true });
  };
  const unpublishDivision = async (d: Division) => {
    await send(`${api(d.seasonCompetitionId)}/fixtures/publish`, "POST", { published: false });
    if (d.status === "published") await send(api(d.seasonCompetitionId), "PATCH", { status: "draft" });
  };
  const publishRound = async (d: Division, r: Round, value: boolean) => {
    if (value && d.status === "draft") await send(api(d.seasonCompetitionId), "PATCH", { status: "published" });
    await send(`${api(d.seasonCompetitionId)}/fixtures/publish`, "POST", { published: value, round: r.round });
  };
  const chosen = divs.filter((d) => picked.has(d.seasonCompetitionId));
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const btn = "rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-[#06054e] transition hover:bg-slate-50 disabled:opacity-40";
  const badge = (s: string) => <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-slate-600">{s.replace("_", " ")}</span>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-xs font-black uppercase text-slate-500">Season{" "}
          <select className="ml-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold normal-case" value={season ?? ""} onChange={(e) => { setPicked(new Set()); setOpen(null); void load(e.target.value); }}>
            {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <button className={btn} onClick={() => setPicked(new Set(divs.map((d) => d.seasonCompetitionId)))}>Select all</button>
        <button className={btn} onClick={() => setPicked(new Set())}>Clear</button>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <button className={btn} disabled={busy || !chosen.length} onClick={() => run(`Published ${chosen.length} divisions`, async () => { for (const d of chosen) await publishDivision(d); })}>Publish selected ({chosen.length})</button>
          <button className={btn} disabled={busy || !chosen.length} onClick={() => run(`Unpublished ${chosen.length} divisions`, async () => { for (const d of chosen) await unpublishDivision(d); })}>Unpublish selected</button>
        </div>
      </div>
      {msg && <p role="status" className={`text-sm font-bold ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}

      <ul className="space-y-3">
        {divs.map((d) => (
          <li key={d.seasonCompetitionId} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-3 p-4">
              <input type="checkbox" aria-label={`Select ${d.label}`} checked={picked.has(d.seasonCompetitionId)} onChange={() => toggle(d.seasonCompetitionId)} />
              <button className="text-left font-black text-[#06054e]" onClick={() => setOpen(open === d.seasonCompetitionId ? null : d.seasonCompetitionId)}>{d.label}</button>
              {badge(d.status)}
              <span className="text-sm font-bold text-slate-500">{d.published} of {d.total} matches published</span>
              <div className="flex gap-2 sm:ml-auto">
                <button className={btn} disabled={busy} onClick={() => run(`Published ${d.label}`, () => publishDivision(d))}>Publish division</button>
                <button className={btn} disabled={busy || (d.published === 0 && d.status !== "published")} onClick={() => run(`Unpublished ${d.label}`, () => unpublishDivision(d))}>Unpublish</button>
                <button className={btn} onClick={() => setOpen(open === d.seasonCompetitionId ? null : d.seasonCompetitionId)}>{open === d.seasonCompetitionId ? "Hide rounds" : "Rounds"}</button>
              </div>
            </div>
            {open === d.seasonCompetitionId && (
              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {d.rounds.length === 0 && <li className="p-4 text-sm font-semibold text-slate-500">No matches yet.</li>}
                {d.rounds.map((r) => (
                  <li key={r.round} className="flex flex-wrap items-center gap-3 px-4 py-2">
                    <span className="w-32 text-sm font-black text-slate-700">{r.label}</span>
                    <span className="text-sm font-bold text-slate-500">{r.published} of {r.total} published</span>
                    <div className="flex gap-2 sm:ml-auto">
                      <button className={btn} disabled={busy || r.published === r.total} onClick={() => run(`Published ${r.label}`, () => publishRound(d, r, true))}>Publish</button>
                      <button className={btn} disabled={busy || r.published === 0} onClick={() => run(`Unpublished ${r.label}`, () => publishRound(d, r, false))}>Unpublish</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
        {divs.length === 0 && <li className="text-sm font-semibold text-slate-500">No competitions for this season yet.</li>}
      </ul>
    </div>
  );
}
