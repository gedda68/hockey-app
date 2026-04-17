"use client";

import { useEffect, useState } from "react";
import { PartyPopper, Trophy, Calendar, Shield } from "lucide-react";
import type { CelebrationAlert } from "@/lib/celebrations/milestones";

function iconFor(alert: CelebrationAlert) {
  if (alert.kind === "birthday") return Calendar;
  if (alert.kind === "wins" || alert.kind === "wins_coached") return Trophy;
  if (alert.kind === "games_coached") return Shield;
  return PartyPopper;
}

export default function CelebrationAlerts({
  memberId,
  clubId,
}: {
  memberId: string;
  clubId?: string;
}) {
  const [alerts, setAlerts] = useState<CelebrationAlert[]>([]);

  useEffect(() => {
    // Prefer session-aware endpoint; fallback to none if unavailable.
    fetch("/api/member/celebrations")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const list = Array.isArray(data?.alerts) ? (data.alerts as CelebrationAlert[]) : [];
        setAlerts(list);
      })
      .catch(() => setAlerts([]));
  }, [memberId, clubId]);

  if (alerts.length === 0) return null;

  return (
    <div className="mb-6 rounded-[2rem] border border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-emerald-50 p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-[#06054e]">
          Celebrations
        </h2>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          {alerts.length} alert{alerts.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {alerts.map((a) => {
          const Icon = iconFor(a);
          return (
            <div
              key={a.id}
              className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-yellow-400/20 p-2 text-[#06054e]">
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black text-slate-900">{a.title}</div>
                  <div className="mt-1 text-xs font-bold text-slate-600 whitespace-pre-wrap">
                    {a.message}
                  </div>
                  {a.scope ? (
                    <div className="mt-2 inline-flex rounded-full bg-slate-900/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-600">
                      {a.scope}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

