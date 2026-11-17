// Matches you're appointed to as an official, with accept and decline.

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";

import PageHeader from "@/components/admin/PageHeader";
interface Duty {
  fixtureId: string; seasonCompetitionId: string; slotIndex: number; umpireType: string;
  allocationStatus?: string; isStandby?: boolean; scheduledStart?: string | null; venueName?: string | null; round?: number;
}

const when = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Time to be confirmed";

export default function MyDutiesPage() {
  const [duties, setDuties] = useState<Duty[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/member/my-umpire-assignments", { credentials: "include" }).catch(() => null);
    setDuties(r?.ok ? (await r.json()).assignments ?? [] : []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const respond = async (d: Duty, allocationStatus: "accepted" | "declined") => {
    const key = `${d.fixtureId}-${d.slotIndex}`;
    setBusy(key);
    try {
      const r = await fetch("/api/member/my-umpire-assignments", {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixtureId: d.fixtureId, seasonCompetitionId: d.seasonCompetitionId, slotIndex: d.slotIndex, allocationStatus }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Failed");
      toast.success(allocationStatus === "accepted" ? "Accepted" : "Declined");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const now = Date.now();
  const upcoming = (duties ?? []).filter((d) => !d.scheduledStart || new Date(d.scheduledStart).getTime() >= now - 6 * 3600_000);
  const earlier = (duties ?? []).filter((d) => !upcoming.includes(d));

  const card = (d: Duty, actions: boolean) => {
    const key = `${d.fixtureId}-${d.slotIndex}`;
    const status = d.allocationStatus ?? "offered";
    return (
      <div key={key} className="flex flex-col gap-3 rounded-2xl border-2 border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-base font-black text-slate-800">
            {d.umpireType || "Official"}{d.isStandby ? " (standby)" : ""}{d.round ? ` · Round ${d.round}` : ""}
          </p>
          <p className="text-xs font-semibold text-slate-500">{when(d.scheduledStart)}</p>
          {d.venueName && <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-slate-400"><MapPin size={12} />{d.venueName}</p>}
        </div>
        {actions && status !== "declined" ? (
          <div className="flex items-center gap-2">
            {status === "accepted" ? (
              <span className="rounded-lg bg-teal-100 px-2.5 py-1 text-xs font-black text-teal-700">Accepted</span>
            ) : (
              <button disabled={busy === key} onClick={() => respond(d, "accepted")} className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-black text-white hover:bg-teal-700 disabled:opacity-60">Accept</button>
            )}
            <button disabled={busy === key} onClick={() => respond(d, "declined")} className="rounded-xl border-2 border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-60">Decline</button>
          </div>
        ) : (
          <span className="self-start rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black capitalize text-slate-500 sm:self-center">{status}</span>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <PageHeader eyebrow="Personal" title="My duties" subtitle="Matches you've been allocated to as an umpire or official." />
      {duties === null ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : duties.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-400">
          You haven't been allocated to any matches.
        </div>
      ) : (
        <>
          <div className="space-y-3">{upcoming.map((d) => card(d, true))}</div>
          {earlier.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Earlier</h2>
              {earlier.map((d) => card(d, false))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
