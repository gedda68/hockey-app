// What I've been nominated for, and what I've nominated others for. Signed-in only, no lookup form.

"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { MyNomination } from "@/lib/nominations/myNominations";

const BADGE: Record<string, string> = {
  "Under review": "bg-amber-100 text-amber-700",
  Selected: "bg-green-100 text-green-700",
  Unsuccessful: "bg-red-100 text-red-700",
  Withdrawn: "bg-slate-100 text-slate-500",
};

function Card({ n, showNominee }: { n: MyNomination; showNominee: boolean }) {
  const who = n.nominatedBy === "self" ? "You nominated yourself" : `Nominated by ${n.nominatedBy.name}`;
  return (
    <li className="rounded-2xl border-2 border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-black text-slate-800">{n.tournamentTitle ?? `${n.ageGroup} ${n.season}`}</div>
          <div className="text-xs font-semibold text-slate-500">
            {showNominee && n.nomineeName ? `${n.nomineeName} · ` : ""}{n.position} · {n.ageGroup} · {n.season}{n.clubName ? ` · ${n.clubName}` : ""}
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-400">
            {showNominee ? "Nominated by you" : who}
            {n.nominatedAt ? ` · ${new Date(n.nominatedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}` : ""}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${BADGE[n.statusLabel] ?? "bg-slate-100 text-slate-600"}`}>{n.statusLabel}</span>
      </div>
    </li>
  );
}

export default function MyNominations() {
  const [data, setData] = useState<{ aboutMe: MyNomination[]; madeByMe: MyNomination[] } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch("/api/member/my-nominations", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => { setError(true); setData({ aboutMe: [], madeByMe: [] }); });
  }, []);

  return (
    <div id="my-nominations" className="space-y-6">
      {data === null ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : (
        <>
          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">Couldn't load your nominations. Try again shortly.</p>}
          <section className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Nominated for</h2>
            {data.aboutMe.length === 0 ? (
              <p className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-400">You haven't been nominated for anything yet.</p>
            ) : (
              <ul className="space-y-3">{data.aboutMe.map((n) => <Card key={n.nominationId} n={n} showNominee={false} />)}</ul>
            )}
          </section>
          {data.madeByMe.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Nominations I've made</h2>
              <ul className="space-y-3">{data.madeByMe.map((n) => <Card key={n.nominationId} n={n} showNominee />)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
