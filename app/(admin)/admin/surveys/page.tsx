"use client";

// Surveys: run surveys for a team, club, association or everyone, and see what came back.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { LEVEL_LABELS, PURPOSE_LABELS, type Purpose, type SurveyLevel } from "@/lib/surveys/types";

interface Row { surveyId: string; title: string; status: string; level: SurveyLevel; purpose: Purpose; subject?: { label?: string }; closesAt: string; invited?: number; answered: number; anonymous: boolean }

const badge: Record<string, string> = { draft: "bg-slate-100 text-slate-600", scheduled: "bg-sky-100 text-sky-800", open: "bg-emerald-100 text-emerald-800", closed: "bg-slate-200 text-slate-600" };

export default function SurveysPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/admin/surveys", { credentials: "include" })
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "Couldn't load"); return d; })
      .then((d) => setRows(d.surveys ?? []))
      .catch((e) => { setError(e instanceof Error ? e.message : "Couldn't load"); setRows([]); });
  }, []);
  const when = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <PageHeader
        eyebrow="Communications"
        title="Surveys"
        subtitle="Ask your team, club, association or everyone. Feedback on a competition or event, how you're doing, or a decision."
        aside={<Link href="/admin/surveys/new" className="inline-flex items-center gap-2 rounded-xl bg-white/95 px-4 py-2 text-sm font-black text-[#06054e] shadow"><Plus size={16} /> New survey</Link>}
      />
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
      {rows === null ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : rows.length === 0 && !error ? (
        <p className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-600">No surveys yet. Create one, or start from a ready-made survey such as end-of-season club feedback.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((s) => {
            const pct = s.invited ? Math.round((s.answered / s.invited) * 100) : null;
            return (
              <li key={s.surveyId}>
                <Link href={s.status === "draft" ? `/admin/surveys/${s.surveyId}/edit` : `/admin/surveys/${s.surveyId}`} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-slate-100 bg-white p-4 transition hover:border-teal-300">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-slate-800">{s.title}</p>
                    <p className="text-xs font-semibold text-slate-500">{PURPOSE_LABELS[s.purpose]}{s.subject?.label ? `: ${s.subject.label}` : ""} · {LEVEL_LABELS[s.level].split(" (")[0]} · {s.status === "closed" ? "Closed" : "Closes"} {when(s.closesAt)}{s.anonymous ? " · Anonymous" : ""}</p>
                  </div>
                  {s.status !== "draft" && <p className="text-sm font-black text-slate-700">{s.answered.toLocaleString()}{s.invited ? ` / ${s.invited.toLocaleString()}` : ""} answered{pct !== null ? ` (${pct}%)` : ""}</p>}
                  <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${badge[s.status] ?? badge.draft}`}>{s.status}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
