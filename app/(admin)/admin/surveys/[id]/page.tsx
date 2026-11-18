"use client";

// A survey's results: how many answered, each question's answers, and a download.

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Download, Loader2, Pencil } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import type { SurveyResults, QuestionResult } from "@/lib/surveys/aggregate";

interface Head { surveyId: string; title: string; status: string; anonymous: boolean; closesAt: string; subject?: { label?: string; startDate?: string; endDate?: string; location?: string } }

function Bar({ pct, label, right }: { pct: number; label: string; right: string }) {
  return (
    <div className="mb-2">
      <div className="mb-0.5 flex justify-between text-sm font-semibold text-slate-700"><span>{label}</span><span className="tabular-nums text-slate-500">{right}</span></div>
      <div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-teal-500" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>
    </div>
  );
}

function Question({ q, n }: { q: QuestionResult; n: number }) {
  const maxDist = Math.max(1, ...(q.distribution ?? []).map((d) => d.count));
  return (
    <section className="rounded-2xl border-2 border-slate-100 bg-white p-5">
      <h3 className="mb-3 text-sm font-black text-slate-800">{n}. {q.text} <span className="ml-1 text-xs font-bold text-slate-400">{q.answered} answered</span></h3>
      {q.choices && q.choices.map((c) => <Bar key={c.id} pct={c.percent} label={c.label} right={`${c.count} · ${c.percent}%`} />)}
      {q.otherAnswers && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-medium text-slate-600">{q.otherAnswers.map((t, i) => <li key={i}>Other: {t}</li>)}</ul>}
      {q.distribution && (
        <>
          <p className="mb-2 text-2xl font-black text-[#06054e]">{q.average ?? "–"}{q.type === "rating" ? " / 5" : " / 10"}{q.nps !== undefined && <span className="ml-3 text-sm font-bold text-slate-500">Net promoter score {q.nps > 0 ? "+" : ""}{q.nps}</span>}</p>
          <div className="flex h-24 items-end gap-1.5">
            {q.distribution.map((d) => (
              <div key={d.value} className="flex flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] font-bold text-slate-500">{d.count || ""}</span>
                <div className="w-full rounded-t bg-teal-500" style={{ height: `${(d.count / maxDist) * 70}px`, minHeight: d.count ? 3 : 0 }} />
                <span className="text-xs font-black text-slate-600">{d.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {q.ranking && (
        <ol className="space-y-1.5">
          {q.ranking.map((r, i) => (
            <li key={r.id} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#06054e] text-xs font-black text-white">{i + 1}</span>
              <span className="flex-1">{r.label}</span>
              <span className="text-xs font-bold text-slate-500">avg position {r.averagePosition || "–"} · {r.firstChoices} first</span>
            </li>
          ))}
        </ol>
      )}
      {q.texts && (q.texts.length === 0 ? <p className="text-sm font-medium text-slate-500">No written answers.</p> : <ul className="max-h-72 space-y-2 overflow-y-auto">{q.texts.map((t, i) => <li key={i} className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">{t}</li>)}</ul>)}
    </section>
  );
}

export default function SurveyResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [head, setHead] = useState<Head | null>(null);
  const [results, setResults] = useState<SurveyResults | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/surveys/${encodeURIComponent(id)}/results`, { credentials: "include" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Couldn't load");
      setHead(d.survey); setResults(d.results);
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't load"); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const close = async () => {
    if (!window.confirm("Close this survey now? People will no longer be able to answer.")) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/surveys/${encodeURIComponent(id)}/close`, { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Couldn't close it");
      toast.success("Survey closed");
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't close it"); } finally { setBusy(false); }
  };

  const sub = head?.subject?.label ? [head.subject.label, head.subject.startDate && `${head.subject.startDate}${head.subject.endDate ? ` to ${head.subject.endDate}` : ""}`, head.subject.location].filter(Boolean).join(" · ") : undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <PageHeader
        eyebrow="Survey results"
        title={head?.title ?? "Survey"}
        subtitle={<><Link href="/admin/surveys" className="underline">← All surveys</Link>{sub ? ` · ${sub}` : ""}</>}
        aside={head && (
          <div className="flex flex-wrap gap-2">
            {head.status !== "closed" && <Link href={`/admin/surveys/${id}/edit`} className="inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-2 text-sm font-black text-[#06054e]"><Pencil size={14} /> Edit</Link>}
            {head.status === "open" && <button type="button" disabled={busy} onClick={close} className="rounded-xl bg-white/95 px-3 py-2 text-sm font-black text-red-700">Close now</button>}
            <a href={`/api/admin/surveys/${encodeURIComponent(id)}/results?format=csv`} className="inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-2 text-sm font-black text-[#06054e]"><Download size={14} /> Download CSV</a>
          </div>
        )}
      />
      {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : !results || !head ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[["Answered", results.responses.toLocaleString()], ["Asked", results.invited.toLocaleString()], ["Response rate", results.responseRate === null ? "–" : `${results.responseRate}%`]].map(([k, v]) => (
              <div key={k} className="rounded-2xl border-2 border-slate-100 bg-white p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{k}</p><p className="text-3xl font-black text-[#06054e]">{v}</p></div>
            ))}
          </div>
          <p className="text-xs font-bold text-slate-500">{head.status === "open" ? "Open" : head.status === "scheduled" ? "Scheduled" : "Closed"} · {head.anonymous ? "Anonymous" : "Answers are linked to names"}</p>
          {!results.visible ? (
            <p className="rounded-2xl bg-amber-50 p-6 text-sm font-bold text-amber-900">This survey is anonymous, so results stay hidden until {results.needed} more {results.needed === 1 ? "person has" : "people have"} answered. That keeps a few answers from being traced to a person.</p>
          ) : (
            results.questions.map((q, i) => <Question key={q.questionId} q={q} n={i + 1} />)
          )}
        </>
      )}
    </div>
  );
}
