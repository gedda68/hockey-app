// components/nominations/ClubPositionOptions.tsx
// Open club positions (coaching, assistant coaching, admin, committee, management, umpiring) the member may nominate for.

"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, Loader2, Clock, Lock, Briefcase } from "lucide-react";
import { toast } from "sonner";

interface Position {
  windowId: string;
  positionTitle: string;
  kind: string;
  kindLabel: string;
  description: string;
  closeDate: string;
  requiresStatement: boolean;
  allowed: boolean;
  alreadyNominated: boolean;
  reason?: string;
}

export default function ClubPositionOptions() {
  const [data, setData] = useState<{ clubName: string; positions: Position[] } | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [statement, setStatement] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/member/club-positions", { credentials: "include" });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setError(true);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function submit(p: Position) {
    setBusy(true);
    try {
      const res = await fetch("/api/member/club-positions", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ windowId: p.windowId, statement }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Nomination failed");
      toast.success(`Nominated for ${p.positionTitle}`);
      setOpen(null); setStatement("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nomination failed");
    } finally {
      setBusy(false);
    }
  }

  if (error || !data) return null;
  if (data.positions.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-8 mb-6">
      <div className="flex items-center gap-3 mb-1">
        <Briefcase size={22} className="text-[#06054e]" />
        <h2 className="text-2xl font-black uppercase text-[#06054e]">Club positions{data.clubName ? ` — ${data.clubName}` : ""}</h2>
      </div>
      <p className="text-xs font-bold text-slate-400 mb-6">Coaching, assistant coaching, admin, committee, management and umpiring positions that are open now.</p>

      <div className="space-y-3">
        {data.positions.map((p) => (
          <div key={p.windowId} className="rounded-2xl border-2 border-slate-200 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-black uppercase">{p.kindLabel}</span>
                <h3 className="font-black text-[#06054e] text-lg leading-tight mt-1">{p.positionTitle}</h3>
                {p.description && <p className="text-xs font-bold text-slate-500 mt-1">{p.description}</p>}
                <p className="flex items-center gap-1 text-xs font-bold text-slate-400 mt-1"><Clock size={12} /> Closes {p.closeDate}</p>
              </div>
              {p.alreadyNominated ? (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-xl text-xs font-black"><CheckCircle size={13} /> Nominated</span>
              ) : p.allowed ? (
                <button type="button" onClick={() => { setOpen(open === p.windowId ? null : p.windowId); setStatement(""); }}
                  className="px-4 py-2 bg-[#06054e] text-white rounded-xl font-black uppercase text-xs hover:bg-[#0a0870] shadow">
                  Nominate →
                </button>
              ) : null}
            </div>
            {!p.allowed && !p.alreadyNominated && (
              <p className="flex items-start gap-1.5 mt-3 text-[11px] font-bold text-slate-400"><Lock size={11} className="mt-0.5 shrink-0" />{p.reason}</p>
            )}
            {open === p.windowId && p.allowed && (
              <div className="mt-4 space-y-3">
                <label className="block text-xs font-black uppercase text-slate-400">
                  Statement {p.requiresStatement ? "(required)" : "(optional)"}
                </label>
                <textarea value={statement} onChange={(e) => setStatement(e.target.value)} rows={3} maxLength={2000}
                  className="w-full rounded-xl border-2 border-slate-200 p-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#06054e]"
                  placeholder="Why you're interested and any relevant experience" />
                <button type="button" disabled={busy || (p.requiresStatement && !statement.trim())} onClick={() => void submit(p)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-black uppercase text-xs hover:bg-green-700 disabled:opacity-50">
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Submit nomination
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
