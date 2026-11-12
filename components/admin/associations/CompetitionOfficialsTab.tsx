"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, X } from "lucide-react";

interface Slot { umpireType: string; umpireId: string; name: string; allocationStatus?: string; isStandby?: boolean; [k: string]: unknown }
interface Match { fixtureId: string; round: number; scheduledStart: string | null; status: string; home: string; away: string; umpires: Slot[] }
interface Official { umpireId: string; displayName: string; levelLabel: string | null; available: boolean }

const TYPES = ["umpire", "technical", "reserve"];
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "No date");
const statusTone: Record<string, string> = {
  accepted: "bg-emerald-50 text-emerald-700", declined: "bg-red-50 text-red-700", assigned: "bg-slate-100 text-slate-600",
};

export default function CompetitionOfficialsTab({ associationId, seasonCompetitionId }: { associationId: string; seasonCompetitionId: string }) {
  const base = `/api/admin/season-competitions/${encodeURIComponent(seasonCompetitionId)}`;
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unassigned">("all");
  const [adding, setAdding] = useState<string | null>(null);
  const [pick, setPick] = useState("");
  const [type, setType] = useState("umpire");
  const [msg, setMsg] = useState<{ id: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${base}/officials`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to load");
      setMatches(j.matches); setOfficials(j.officials);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }, [base]);
  useEffect(() => { void load(); }, [load]);

  const rows = useMemo(
    () => (matches ?? []).filter((m) => filter === "all" || (m.umpires.length === 0 && m.status !== "completed" && m.status !== "cancelled")),
    [matches, filter],
  );

  const save = async (m: Match, umpires: Slot[]) => {
    setBusy(true); setMsg(null);
    // `name` is display-only; the API schema is strict.
    const body = { umpires: umpires.map(({ name: _n, ...rest }) => rest) };
    const r = await fetch(`${base}/fixtures/${encodeURIComponent(m.fixtureId)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg({ id: m.fixtureId, text: j.error ?? "Could not save" }); return; }
    setAdding(null); setPick("");
    await load();
  };

  if (error) return <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>;
  if (!matches) return <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />;

  const a = `/admin/associations/${encodeURIComponent(associationId)}`;
  const withNone = matches.filter((m) => m.umpires.length === 0 && m.status !== "completed" && m.status !== "cancelled").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {([["all", `All matches (${matches.length})`], ["unassigned", `Needs officials (${withNone})`]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${filter === k ? "bg-[#06054e] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{l}</button>
          ))}
        </div>
        <nav className="flex flex-wrap gap-3 text-xs font-bold text-[#06054e]">
          <Link className="underline-offset-2 hover:underline" href={`${a}/umpire-payments?seasonCompetitionId=${encodeURIComponent(seasonCompetitionId)}`}>Umpire payments</Link>
          <Link className="underline-offset-2 hover:underline" href={`${a}/officiating-report?seasonCompetitionId=${encodeURIComponent(seasonCompetitionId)}`}>Officiating report</Link>
          <Link className="underline-offset-2 hover:underline" href={`${a}/official-register`}>Official register</Link>
        </nav>
      </div>

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {rows.map((m) => (
          <li key={m.fixtureId} className="space-y-2 px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-bold text-[#06054e]"><span className="text-xs font-extrabold text-slate-400">R{m.round}</span> {m.home} <span className="font-normal text-slate-400">v</span> {m.away}</p>
              <p className="text-xs text-slate-500">{fmt(m.scheduledStart)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {m.umpires.map((u, i) => (
                <span key={`${u.umpireId}-${i}`} className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 py-1 pl-3 pr-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">{u.umpireType}{u.isStandby ? " · standby" : ""}</span>
                  {u.name}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${statusTone[u.allocationStatus ?? "assigned"] ?? statusTone.assigned}`}>{u.allocationStatus ?? "assigned"}</span>
                  <button disabled={busy} aria-label={`Remove ${u.name}`} className="rounded-full p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    onClick={() => void save(m, m.umpires.filter((_, j) => j !== i))}><X size={12} /></button>
                </span>
              ))}
              {m.umpires.length === 0 && <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700"><AlertTriangle size={12} /> No officials</span>}
              <button onClick={() => { setAdding(adding === m.fixtureId ? null : m.fixtureId); setPick(""); setMsg(null); }}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-[#06054e] ring-1 ring-[#06054e]/30 hover:bg-[#06054e]/5"><Plus size={12} /> Add</button>
            </div>

            {adding === m.fixtureId && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3">
                <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Official" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Choose an official…</option>
                  {officials.map((o) => <option key={o.umpireId} value={o.umpireId}>{o.displayName}{o.levelLabel ? ` · ${o.levelLabel}` : ""}{o.available ? "" : " (unavailable)"}</option>)}
                </select>
                <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Role" className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <button disabled={!pick || busy} onClick={() => void save(m, [...m.umpires, { umpireType: type, umpireId: pick, name: "", isStandby: type === "reserve" }])}
                  className="rounded-xl bg-[#06054e] px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Assign</button>
              </div>
            )}
            {msg?.id === m.fixtureId && <p role="alert" className="text-xs font-semibold text-red-600">{msg.text}</p>}
          </li>
        ))}
        {rows.length === 0 && <li className="p-8 text-center text-sm text-slate-500">{filter === "unassigned" ? "Every upcoming match has officials." : "No matches."}</li>}
      </ul>
      {officials.length === 0 && <p className="text-xs text-slate-500">No officials in the register yet — add them under Official register to assign them here.</p>}
    </div>
  );
}
