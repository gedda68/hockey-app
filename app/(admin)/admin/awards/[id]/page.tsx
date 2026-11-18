"use client";

// One season's awards: open nominations, read who was nominated and why, choose winners, announce.

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";

interface Cat { categoryId: string; name: string; description?: string }
interface Nominee { categoryId: string; nomineeId: string; nomineeName: string; count: number; reasons: { by: string; reason: string }[] }
interface Program { programId: string; title: string; seasonYear: string; status: string; closesAt: string | null; opensAt: string | null; categories: Cat[]; winners: Record<string, { memberId: string; name: string }[]> }

export default function AwardProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<{ program: Program; nominees: Nominee[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/award-programs/${id}`, { credentials: "include" }).catch(() => null);
    if (r?.ok) setData(await r.json()); else toast.error("Couldn't load these awards");
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const patch = async (body: Record<string, unknown>, ok: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/award-programs/${id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Failed");
      toast.success(ok);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); await load(); }
  };
  const toggle = (catId: string, memberId: string) => {
    const cur = (data?.program.winners[catId] ?? []).map((w) => w.memberId);
    const next = cur.includes(memberId) ? cur.filter((x) => x !== memberId) : [...cur, memberId];
    void patch({ action: "winners", categoryId: catId, memberIds: next }, "Saved");
  };

  if (!data) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div>;
  const p = data.program;
  const announced = p.status === "announced";
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <PageHeader eyebrow="Awards" title={p.title} subtitle={`Season ${p.seasonYear}`} />
      <Link href="/admin/awards" className="text-sm font-black text-amber-700">← All season awards</Link>
      <div className="flex flex-wrap gap-2">
        {p.status === "draft" && <button type="button" disabled={busy} onClick={() => patch({ action: "open" }, "Nominations are open", "Open nominations? Club members will be told and can start nominating.")} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-white">Open nominations</button>}
        {p.status === "open" && <button type="button" disabled={busy} onClick={() => patch({ action: "judging" }, "Nominations closed", "Close nominations now?")} className="rounded-xl border-2 border-slate-200 px-4 py-2 text-sm font-black text-slate-700">Close nominations</button>}
        {p.status === "judging" && <button type="button" disabled={busy} onClick={() => patch({ action: "reopen" }, "Nominations reopened")} className="rounded-xl border-2 border-slate-200 px-4 py-2 text-sm font-black text-slate-700">Reopen nominations</button>}
        {(p.status === "judging" || p.status === "open") && <button type="button" disabled={busy} onClick={() => patch({ action: "announce" }, "Winners announced and told", "Announce the winners? They'll be emailed and shown to the whole club. This can't be undone.")} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white">Announce winners</button>}
        {announced && <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-800">Announced</span>}
      </div>
      {p.categories.map((c) => {
        const list = data.nominees.filter((n) => n.categoryId === c.categoryId);
        const won = (p.winners[c.categoryId] ?? []).map((w) => w.memberId);
        return (
          <section key={c.categoryId} className="space-y-2">
            <h2 className="text-lg font-black text-slate-800">{c.name}</h2>
            {c.description && <p className="text-xs font-semibold text-slate-500">{c.description}</p>}
            {list.length === 0 ? <p className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-4 text-sm font-semibold text-slate-400">No nominations.</p> : list.map((n) => (
              <div key={n.nomineeId} className={`space-y-1 rounded-2xl border-2 bg-white p-4 ${won.includes(n.nomineeId) ? "border-amber-300" : "border-slate-100"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black text-slate-800">{n.nomineeName} <span className="text-xs font-semibold text-slate-400">· {n.count} {n.count === 1 ? "nomination" : "nominations"}</span></p>
                  {!announced && <button type="button" disabled={busy} onClick={() => toggle(c.categoryId, n.nomineeId)} className={`rounded-xl px-3 py-1.5 text-xs font-black ${won.includes(n.nomineeId) ? "bg-amber-500 text-white" : "border-2 border-slate-200 text-slate-700"}`}>{won.includes(n.nomineeId) ? "🏆 Winner" : "Make winner"}</button>}
                </div>
                {n.reasons.map((r, i) => <p key={i} className="text-sm font-medium text-slate-600">“{r.reason}” <span className="text-xs font-semibold text-slate-400">— {r.by}</span></p>)}
              </div>
            ))}
            {announced && won.length > 0 && <p className="text-sm font-black text-amber-700">🏆 {p.winners[c.categoryId].map((w) => w.name).join(" & ")}</p>}
          </section>
        );
      })}
    </div>
  );
}
