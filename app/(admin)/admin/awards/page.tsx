"use client";

// Committee: set up the club's end-of-season awards, open nominations, and judge them.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";

interface Program { programId: string; title: string; seasonYear: string; status: string; closesAt: string | null; categories: { categoryId: string; name: string }[] }
const STATUS: Record<string, string> = { draft: "Draft", open: "Nominations open", judging: "Judging", announced: "Announced" };
const TONE: Record<string, string> = { draft: "bg-slate-100 text-slate-700", open: "bg-amber-100 text-amber-800", judging: "bg-sky-100 text-sky-800", announced: "bg-emerald-100 text-emerald-800" };

export default function AwardsAdminPage() {
  const [data, setData] = useState<{ club: { name: string }; programs: Program[]; defaultCategories: { name: string; description?: string }[] } | null>(null);
  const [denied, setDenied] = useState(false);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [closes, setCloses] = useState("");
  const [cats, setCats] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/award-programs", { credentials: "include" }).catch(() => null);
    if (r?.status === 403) { setDenied(true); return; }
    if (r?.ok) { const d = await r.json(); setData(d); setCats((c) => c || d.defaultCategories.map((x: { name: string }) => x.name).join("\n")); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    setBusy(true);
    try {
      const categories = cats.split("\n").map((n) => n.trim()).filter(Boolean).map((name) => ({ name, description: data?.defaultCategories.find((d) => d.name === name)?.description }));
      const r = await fetch("/api/admin/award-programs", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seasonYear: year, categories, closesAt: closes ? `${closes}T23:59:00+10:00` : null }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Failed");
      toast.success("Awards created. Open nominations when you're ready.");
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <PageHeader eyebrow="Awards" title="Season awards" subtitle={data ? `${data.club.name}: members nominate, the committee chooses winners, and everyone sees the honour roll.` : "Members nominate, the committee chooses winners."} />
      {denied ? <p className="rounded-2xl bg-white p-6 text-center text-sm font-semibold text-slate-500">This page is for club committee.</p> : !data ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div> : (
        <>
          <section className="space-y-2">
            {data.programs.length === 0 && <p className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-400">No season awards yet. Set up this season's below.</p>}
            {data.programs.map((p) => (
              <Link key={p.programId} href={`/admin/awards/${p.programId}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-slate-100 bg-white px-4 py-3 hover:border-amber-200">
                <div><p className="font-black text-slate-800">{p.title}</p><p className="text-xs font-semibold text-slate-500">{p.categories.length} awards{p.closesAt ? ` · nominations close ${new Date(p.closesAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Brisbane" })}` : ""}</p></div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${TONE[p.status]}`}>{STATUS[p.status] ?? p.status}</span>
              </Link>
            ))}
          </section>
          <section className="space-y-3 rounded-2xl border-2 border-slate-100 bg-white p-4">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">New season awards</h2>
            <div className="flex flex-wrap gap-3">
              <label className="text-sm font-bold text-slate-700">Season<input value={year} onChange={(e) => setYear(e.target.value)} className="ml-2 w-20 rounded-lg border-2 border-slate-200 px-2 py-1" /></label>
              <label className="text-sm font-bold text-slate-700">Nominations close<input type="date" value={closes} onChange={(e) => setCloses(e.target.value)} className="ml-2 rounded-lg border-2 border-slate-200 px-2 py-1" /></label>
            </div>
            <label className="block text-sm font-bold text-slate-700">Awards (one per line)<textarea value={cats} onChange={(e) => setCats(e.target.value)} rows={7} className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-medium" /></label>
            <button type="button" disabled={busy} onClick={create} className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-black text-white disabled:opacity-40">{busy ? "Creating…" : "Create"}</button>
          </section>
        </>
      )}
    </div>
  );
}
