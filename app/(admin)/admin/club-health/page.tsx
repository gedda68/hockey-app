// Club health: what's missing or wrong in the club's data.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

interface Issue { memberId?: string; teamId?: string; name: string; detail: string }
interface Check { id: string; title: string; severity: "high" | "medium" | "low"; why: string; count: number; issues: Issue[] }
interface Health { checkedAt: string; score: number; totals: { members: number; activeMembers: number; teams: number }; checks: Check[] }

const TONE = { high: "bg-red-100 text-red-700", medium: "bg-amber-100 text-amber-700", low: "bg-slate-100 text-slate-600" } as const;

export default function ClubHealthPage() {
  const [data, setData] = useState<Health | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/club-health", { credentials: "include" })
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "Couldn't run the check"); setData(d); })
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't run the check"));
  }, []);

  if (error) return <div className="p-6 text-sm font-bold text-red-600">{error}</div>;
  if (!data) return <div className="p-6"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
  const problems = data.checks.filter((c) => c.count > 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#06054e]">Club health</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">{data.totals.activeMembers} active members · {data.totals.teams} teams · checked {new Date(data.checkedAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}</p>
        </div>
        <div className="text-right"><div className="text-4xl font-black text-[#06054e]">{data.score}</div><div className="text-xs font-black uppercase text-slate-400">out of 100</div></div>
      </div>

      {problems.length === 0 ? (
        <p className="rounded-2xl border-2 border-emerald-100 bg-emerald-50 p-6 text-center text-sm font-bold text-emerald-700">Nothing to fix. Your club's data looks healthy.</p>
      ) : (
        <ul className="space-y-3">
          {problems.map((c) => (
            <li key={c.id} className="rounded-2xl border-2 border-slate-100 bg-white p-4 shadow-sm">
              <button className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpen(open === c.id ? null : c.id)}>
                <div>
                  <div className="font-black text-slate-800">{c.title}</div>
                  <div className="text-xs font-semibold text-slate-500">{c.why}</div>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-black ${TONE[c.severity]}`}>{c.count}</span>
              </button>
              {open === c.id && (
                <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100 text-sm">
                  {c.issues.map((i, n) => (
                    <li key={`${i.memberId ?? i.teamId ?? n}`} className="flex justify-between gap-3 py-2">
                      {i.memberId ? <Link className="font-bold text-teal-700 hover:underline" href={`/admin/members/${i.memberId}`}>{i.name}</Link> : <span className="font-bold text-slate-700">{i.name}</span>}
                      <span className="text-slate-500">{i.detail}</span>
                    </li>
                  ))}
                  {c.count > c.issues.length && <li className="py-2 text-xs font-semibold text-slate-400">and {c.count - c.issues.length} more</li>}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
