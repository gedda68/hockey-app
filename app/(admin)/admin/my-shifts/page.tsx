"use client";

// My volunteer shifts: what I'm on, and where my club needs help (canteen, scoring, ground set-up).

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { KIND_LABELS, timeRange, type ShiftKind } from "@/lib/volunteers/logic";

interface Shift { shiftId: string; kind: ShiftKind; label: string; date: string; startTime: string; endTime: string; slots: number; location?: string; notes?: string; free: number; needCover: number; mine: "confirmed" | "swap_requested" | null; withMe: string[]; startsAt: string }

const dayText = (d: string) => new Date(`${d}T00:00:00+10:00`).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "Australia/Brisbane" });
const KIND_TONE: Record<ShiftKind, string> = { canteen: "bg-amber-100 text-amber-800", scoring: "bg-sky-100 text-sky-800", ground_setup: "bg-emerald-100 text-emerald-800", other: "bg-slate-100 text-slate-700" };

export default function MyShiftsPage() {
  const [data, setData] = useState<{ club: { name: string } | null; mine: Shift[]; open: Shift[] } | null>(null);
  const [filter, setFilter] = useState<ShiftKind | "all">("all");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/member/shifts", { credentials: "include" }).catch(() => null);
    setData(r?.ok ? await r.json() : { club: null, mine: [], open: [] });
  }, []);
  useEffect(() => { void load(); }, [load]);

  const act = async (shiftId: string, action: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(shiftId + action);
    try {
      const r = await fetch("/api/member/shifts", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shiftId, action }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Failed");
      toast.success(d.message);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(""); await load(); }
  };

  const open = (data?.open ?? []).filter((s) => filter === "all" || s.kind === filter);
  const groups = open.reduce<Record<string, Shift[]>>((g, s) => ((g[s.date] ??= []).push(s), g), {});
  const Btn = ({ s, action, label, tone, confirmText }: { s: Shift; action: string; label: string; tone: string; confirmText?: string }) => (
    <button type="button" disabled={!!busy} onClick={() => act(s.shiftId, action, confirmText)} className={`rounded-xl px-4 py-2 text-sm font-black disabled:opacity-50 ${tone}`}>{busy === s.shiftId + action ? "…" : label}</button>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <PageHeader eyebrow="Volunteering" title="My shifts" subtitle={data?.club ? `Canteen, scoring and ground set-up at ${data.club.name}. Thank you for helping.` : "Canteen, scoring and ground set-up at your club."} />
      {!data ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div> : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">I'm on</h2>
            {data.mine.length === 0 ? <p className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-400">You haven't signed up for a shift yet.</p> : data.mine.map((s) => (
              <div key={s.shiftId} className="space-y-2 rounded-2xl border-2 border-teal-100 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${KIND_TONE[s.kind]}`}>{s.label}</span>
                  <p className="font-black text-slate-800">{dayText(s.date)}, {timeRange(s)}</p>
                </div>
                <p className="text-xs font-semibold text-slate-500">{[s.location, s.withMe.filter((n) => n !== "You").length ? `With ${s.withMe.filter((n) => n !== "You").join(", ")}` : ""].filter(Boolean).join(" · ")}</p>
                {s.notes && <p className="text-sm font-medium text-slate-600">{s.notes}</p>}
                {s.mine === "swap_requested" ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm font-bold text-amber-700">Cover requested. You're still on until someone takes it.</p>
                    <Btn s={s} action="keep" label="I can do it after all" tone="border-2 border-slate-200 text-slate-700" />
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Btn s={s} action="release" label="I can't make it" tone="border-2 border-red-200 text-red-700" confirmText="Let the club know you can't do this shift? If it's within two days, you stay on until someone covers it." />
                  </div>
                )}
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="mr-2 text-sm font-black uppercase tracking-wide text-slate-500">Help needed</h2>
              {(["all", "canteen", "scoring", "ground_setup", "other"] as const).map((k) => (
                <button key={k} type="button" onClick={() => setFilter(k)} className={`rounded-full border-2 px-3 py-1 text-xs font-black ${filter === k ? "border-[#06054e] bg-[#06054e] text-white" : "border-slate-200 text-slate-600"}`}>{k === "all" ? "All" : KIND_LABELS[k]}</button>
              ))}
            </div>
            {!data.club ? <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">Your account isn't linked to a club yet, so there are no shifts to show.</p> : open.length === 0 ? <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">Nothing needs filling right now.</p> : Object.entries(groups).map(([date, list]) => (
              <div key={date} className="space-y-2">
                <p className="text-sm font-black text-[#06054e]">{dayText(date)}</p>
                {list.map((s) => (
                  <div key={s.shiftId} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-slate-100 bg-white p-4">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-black text-slate-800"><span className={`rounded-full px-2.5 py-0.5 text-xs ${KIND_TONE[s.kind]}`}>{s.label}</span>{timeRange(s)}</p>
                      <p className="text-xs font-semibold text-slate-500">{[s.location, s.free > 0 ? `${s.free} ${s.free === 1 ? "place" : "places"} free` : "", s.needCover ? `${s.needCover} need${s.needCover === 1 ? "s" : ""} cover` : ""].filter(Boolean).join(" · ")}</p>
                      {s.notes && <p className="mt-1 text-xs font-medium text-slate-500">{s.notes}</p>}
                    </div>
                    {s.free > 0 ? <Btn s={s} action="signup" label="Sign up" tone="bg-teal-600 text-white" /> : <Btn s={s} action="takeover" label="Take over" tone="bg-amber-500 text-white" />}
                  </div>
                ))}
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
