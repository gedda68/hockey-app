"use client";

// End-of-season awards: nominate someone while nominations are open, and see the winners once they're announced.

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";

interface Cat { categoryId: string; name: string; description?: string }
interface Mine { nominationId: string; categoryId: string; nomineeName: string; reason: string }
interface Program { programId: string; title: string; seasonYear: string; closesAt: string | null; categories: Cat[]; max: number; mine: Mine[] }
interface Honour { programId: string; title: string; seasonYear: string; awards: { name: string; winners: string[] }[] }

function NominateForm({ program, onDone }: { program: Program; onDone: () => void }) {
  const [categoryId, setCategoryId] = useState(program.categories[0]?.categoryId ?? "");
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ memberId: string; name: string }[]>([]);
  const [nominee, setNominee] = useState<{ memberId: string; name: string } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (v: string) => {
    setQ(v); setNominee(null);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) { setFound([]); return; }
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/member/awards/members?q=${encodeURIComponent(v.trim())}`, { credentials: "include" }).catch(() => null);
      setFound(r?.ok ? (await r.json()).members : []);
    }, 250);
  };
  const submit = async () => {
    if (!nominee) return;
    setBusy(true);
    try {
      const r = await fetch("/api/member/awards", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "nominate", programId: program.programId, categoryId, nomineeId: nominee.memberId, reason }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Failed");
      toast.success(`Nominated ${nominee.name}`);
      setQ(""); setFound([]); setNominee(null); setReason("");
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };
  const cat = program.categories.find((c) => c.categoryId === categoryId);
  return (
    <div className="space-y-3 rounded-2xl border-2 border-amber-100 bg-white p-4">
      <p className="font-black text-slate-800">Nominate someone</p>
      <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold">
        {program.categories.map((c) => <option key={c.categoryId} value={c.categoryId}>{c.name}</option>)}
      </select>
      {cat?.description && <p className="text-xs font-semibold text-slate-500">{cat.description}</p>}
      <div className="relative">
        <input value={nominee ? nominee.name : q} onChange={(e) => search(e.target.value)} placeholder="Start typing a member's name" className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold" />
        {!nominee && found.length > 0 && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-lg">
            {found.map((m) => <button key={m.memberId} type="button" onClick={() => { setNominee(m); setFound([]); }} className="block w-full px-3 py-2 text-left text-sm font-semibold hover:bg-amber-50">{m.name}</button>)}
          </div>
        )}
      </div>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={800} placeholder="Why do they deserve it? A sentence or two is plenty." className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-medium" />
      <button type="button" disabled={busy || !nominee || reason.trim().length < 15} onClick={submit} className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-black text-white disabled:opacity-40">{busy ? "Sending…" : "Send nomination"}</button>
    </div>
  );
}

export default function SeasonAwardsPage() {
  const [data, setData] = useState<{ club: { name: string } | null; open: Program[]; announced: Honour[] } | null>(null);
  const load = useCallback(async () => {
    const r = await fetch("/api/member/awards", { credentials: "include" }).catch(() => null);
    setData(r?.ok ? await r.json() : { club: null, open: [], announced: [] });
  }, []);
  useEffect(() => { void load(); }, [load]);

  const withdraw = async (nominationId: string) => {
    if (!window.confirm("Withdraw this nomination?")) return;
    const r = await fetch("/api/member/awards", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "withdraw", nominationId }) });
    if (!r.ok) toast.error((await r.json().catch(() => ({}))).error || "Failed");
    await load();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <PageHeader eyebrow="Awards" title="Season awards" subtitle={data?.club ? `Nominate the people who made ${data.club.name}'s season, and see who took out the awards.` : "Nominate the people who made your club's season."} />
      {!data ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div> : (
        <>
          {data.open.map((p) => (
            <section key={p.programId} className="space-y-3">
              <div>
                <h2 className="text-lg font-black text-slate-800">{p.title}</h2>
                <p className="text-xs font-semibold text-slate-500">Nominations {p.closesAt ? `close ${new Date(p.closesAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", timeZone: "Australia/Brisbane" })}` : "are open"}. Up to {p.max} people for each award. Your reasons go to the committee only.</p>
              </div>
              <NominateForm program={p} onDone={load} />
              {p.mine.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Your nominations</h3>
                  {p.mine.map((n) => (
                    <div key={n.nominationId} className="flex items-start justify-between gap-3 rounded-2xl border-2 border-slate-100 bg-white px-4 py-3">
                      <div>
                        <p className="text-sm font-black text-slate-800">{n.nomineeName} <span className="font-semibold text-slate-400">· {p.categories.find((c) => c.categoryId === n.categoryId)?.name}</span></p>
                        <p className="text-sm font-medium text-slate-600">{n.reason}</p>
                      </div>
                      <button type="button" onClick={() => withdraw(n.nominationId)} className="text-xs font-black text-red-600">Withdraw</button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
          {data.open.length === 0 && data.announced.length === 0 && <p className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-400">Nominations aren't open right now.</p>}
          {data.announced.map((h) => (
            <section key={h.programId} className="space-y-2">
              <h2 className="text-lg font-black text-slate-800">🏆 {h.title}</h2>
              <div className="overflow-hidden rounded-2xl border-2 border-amber-100 bg-white">
                {h.awards.map((a) => (
                  <div key={a.name} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-50 px-4 py-3 last:border-0">
                    <span className="text-sm font-black text-slate-500">{a.name}</span>
                    <span className="text-sm font-black text-amber-700">{a.winners.join(" & ")}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
