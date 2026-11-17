// components/nominations/NominationOptions.tsx
// "Where can I nominate?" for the signed-in member: every open team with the positions they may
// apply for (and, greyed out, the ones they can't with the reason).

"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, Loader2, Calendar, MapPin, Clock, Lock, Trophy } from "lucide-react";
import { toast } from "sonner";

import NominationSection from "@/components/nominations/NominationSection";
interface Verdict {
  position: string;
  label: string;
  allowed: boolean;
  reason?: string;
  alreadyNominated?: boolean;
}
interface Option {
  ageGroup: string;
  season: string;
  tournamentTitle: string;
  tournamentGender: string;
  tournamentLocation: string;
  tournamentStartDate: string;
  tournamentEndDate: string;
  daysRemaining: number;
  positions: Verdict[];
}
interface Payload {
  season: string;
  isPlayer: boolean;
  ageInSeason: number | null;
  options: Option[];
}

export default function NominationOptions({
  onNominatePlayer,
  onLoaded,
}: {
  /** Player nominations go through the existing fee/medical flow. */
  onNominatePlayer: (ageGroup: string) => void;
  onLoaded?: (info: { isPlayer: boolean }) => void;
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/member/nomination-options", { credentials: "include" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Could not load your nomination options");
      setData(d);
      onLoaded?.({ isPlayer: !!d.isPlayer });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your nomination options");
    }
  }, [onLoaded]);

  useEffect(() => { void load(); }, [load]);

  async function nominate(o: Option, v: Verdict) {
    if (v.position === "player") return onNominatePlayer(o.ageGroup);
    const key = `${o.ageGroup}::${v.position}`;
    setBusy(key);
    try {
      const res = await fetch("/api/member/nominations", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season: o.season, ageGroup: o.ageGroup, position: v.position }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Nomination failed");
      toast.success(`Nominated as ${v.label} for ${o.ageGroup}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nomination failed");
    } finally {
      setBusy(null);
    }
  }

  if (error) return null; // the existing player flow below still works; don't block the page
  if (!data) {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-100 p-8 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading your nomination options…
      </div>
    );
  }

  return (
    <NominationSection
      icon={<Trophy size={22} />}
      title="Teams you can nominate for"
      subtitle={<>
        {data.season} season{data.ageInSeason != null ? ` · you are ${data.ageInSeason} this season` : ""}
        {data.isPlayer ? "" : " · no player role on your record, so player nominations aren't offered"}
      </>}
    >
      {data.options.length === 0 ? (
        <p className="py-8 text-center text-sm font-black uppercase text-slate-600">No teams are open for nomination right now</p>
      ) : (
        <div className="space-y-4">
          {data.options.map((o) => {
            const ok = o.positions.filter((p) => p.allowed);
            const done = o.positions.filter((p) => p.alreadyNominated);
            const blocked = o.positions.filter((p) => !p.allowed && !p.alreadyNominated);
            return (
              <div key={o.ageGroup} className="rounded-2xl border-2 border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 bg-[#06054e] text-white rounded-lg text-xs font-black uppercase">{o.ageGroup}</span>
                  <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-black uppercase">
                    {o.tournamentGender === "mixed" ? "Mixed" : o.tournamentGender === "female" ? "Female" : "Male"}
                  </span>
                </div>
                <h3 className="font-black text-[#06054e] text-lg leading-tight">{o.tournamentTitle}</h3>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-bold text-slate-600 mt-1">
                  {o.tournamentLocation && <span className="flex items-center gap-1"><MapPin size={12} />{o.tournamentLocation}</span>}
                  {o.tournamentStartDate && <span className="flex items-center gap-1"><Calendar size={12} />{o.tournamentStartDate}</span>}
                  <span className="flex items-center gap-1"><Clock size={12} />{o.daysRemaining === 0 ? "Closes today" : `${o.daysRemaining} day${o.daysRemaining === 1 ? "" : "s"} left`}</span>
                </div>

                {done.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {done.map((p) => (
                      <span key={p.position} className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-xl text-xs font-black">
                        <CheckCircle size={13} /> Nominated: {p.label}
                      </span>
                    ))}
                  </div>
                )}

                {ok.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {ok.map((p) => (
                      <button key={p.position} type="button" disabled={busy === `${o.ageGroup}::${p.position}`}
                        onClick={() => void nominate(o, p)}
                        className="px-4 py-2 bg-[#06054e] text-white rounded-xl font-black uppercase text-xs hover:bg-[#0a0870] disabled:opacity-60 shadow">
                        {busy === `${o.ageGroup}::${p.position}` ? "Submitting…" : `Nominate as ${p.label}`}
                      </button>
                    ))}
                  </div>
                ) : done.length === 0 ? (
                  <p className="mt-4 text-xs font-bold text-slate-600">You aren&apos;t eligible for any position in this team.</p>
                ) : null}

                {blocked.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {blocked.map((p) => (
                      <li key={p.position} className="flex items-start gap-1.5 text-[11px] font-bold text-slate-600">
                        <Lock size={11} className="mt-0.5 shrink-0" />
                        <span><span className="text-slate-600">{p.label}:</span> {p.reason}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </NominationSection>
  );
}
