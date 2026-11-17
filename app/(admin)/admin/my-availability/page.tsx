// Tell your club when you can't make it (or when you're free).

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

import PageHeader from "@/components/admin/PageHeader";
interface Entry { availabilityId: string; kind: "unavailable" | "available"; from: string; to: string; note?: string }

const inputCls = "w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-400";
const labelCls = "mb-1 block text-xs font-black uppercase tracking-wide text-slate-400";
const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

export default function MyAvailabilityPage() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [kind, setKind] = useState<Entry["kind"]>("unavailable");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/member/my-availability", { credentials: "include" }).catch(() => null);
    setEntries(r?.ok ? (await r.json()).entries ?? [] : []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/member/my-availability", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, from, to: to || from, note }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Failed");
      toast.success("Saved");
      setFrom(""); setTo(""); setNote("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const r = await fetch(`/api/member/my-availability?id=${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" });
    if (r.ok) { toast.success("Removed"); await load(); } else toast.error("Couldn't remove it");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <PageHeader eyebrow="Personal" title="My availability" subtitle="Mark dates you can't make it, so selectors, coaches and officials allocators know." />

      <div className="space-y-4 rounded-2xl border-2 border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>I am</label>
            <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as Entry["kind"])}>
              <option value="unavailable">Unavailable</option>
              <option value="available">Available</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>From</label>
            <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>To (optional)</label>
            <input type="date" className={inputCls} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Note (optional)</label>
          <input className={inputCls} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Away on holiday" />
        </div>
        <button disabled={saving || !from} onClick={add} className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-black text-white hover:bg-teal-700 disabled:opacity-50">
          {saving ? "Saving…" : "Add"}
        </button>
      </div>

      {entries === null ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-400">Nothing marked. You're assumed available.</div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.availabilityId} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3">
              <span className={`rounded-lg px-2.5 py-1 text-xs font-black ${e.kind === "unavailable" ? "bg-red-100 text-red-700" : "bg-teal-100 text-teal-700"}`}>
                {e.kind === "unavailable" ? "Unavailable" : "Available"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-700">{e.from === e.to ? fmt(e.from) : `${fmt(e.from)} to ${fmt(e.to)}`}</p>
                {e.note && <p className="truncate text-xs font-semibold text-slate-400">{e.note}</p>}
              </div>
              <button onClick={() => remove(e.availabilityId)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Remove">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
