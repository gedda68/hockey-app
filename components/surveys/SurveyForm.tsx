"use client";

// components/surveys/SurveyForm.tsx
// Answering a survey. Used on the My surveys page, in the pop-up and on the email link page.

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, Loader2, Star } from "lucide-react";
import type { AnswerValue, SurveyQuestion } from "@/lib/surveys/types";

export interface SurveyView {
  surveyId: string;
  title: string;
  intro?: string;
  thanks?: string;
  anonymous: boolean;
  closesAt: string;
  subject?: { label?: string; startDate?: string; endDate?: string; location?: string };
  questions: SurveyQuestion[];
  status: string;
  alreadyAnswered: boolean;
  declined?: boolean;
  onBehalfOf?: string;
}

interface State { value: AnswerValue | undefined; other: string }

const fmtDay = (d?: string) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "");

function Scale({ q, value, onChange }: { q: SurveyQuestion; value: number | undefined; onChange: (n: number) => void }) {
  const [lo, hi] = q.type === "rating" ? [1, 5] : [0, 10];
  const items = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={q.text}>
        {items.map((n) =>
          q.type === "rating" ? (
            <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} of 5`} onClick={() => onChange(n)} className="p-0.5">
              <Star size={30} className={value !== undefined && n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
            </button>
          ) : (
            <button key={n} type="button" role="radio" aria-checked={value === n} onClick={() => onChange(n)}
              className={`h-10 w-10 rounded-lg border-2 text-sm font-black transition ${value === n ? "border-[#06054e] bg-[#06054e] text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"}`}>{n}</button>
          ),
        )}
      </div>
      {(q.lowLabel || q.highLabel) && (
        <div className="mt-1 flex justify-between text-xs font-semibold text-slate-500"><span>{q.lowLabel}</span><span>{q.highLabel}</span></div>
      )}
    </div>
  );
}

function Ranking({ q, value, onChange }: { q: SurveyQuestion; value: string[] | undefined; onChange: (v: string[]) => void }) {
  const order = value && value.length ? value : (q.options ?? []).map((o) => o.id);
  const label = (id: string) => q.options?.find((o) => o.id === id)?.label ?? id;
  const move = (i: number, d: -1 | 1) => {
    const next = [...order];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <ol className="space-y-1.5">
      {order.map((id, i) => (
        <li key={id} className="flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3 py-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#06054e] text-xs font-black text-white">{i + 1}</span>
          <span className="flex-1 text-sm font-semibold text-slate-800">{label(id)}</span>
          <button type="button" aria-label={`Move ${label(id)} up`} disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowUp size={16} /></button>
          <button type="button" aria-label={`Move ${label(id)} down`} disabled={i === order.length - 1} onClick={() => move(i, 1)} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowDown size={16} /></button>
        </li>
      ))}
    </ol>
  );
}

export default function SurveyForm({
  survey, onSubmit, onDecline, declineLabel = "Not now", compact = false,
}: {
  survey: SurveyView;
  onSubmit: (answers: { questionId: string; value: AnswerValue; other?: string }[]) => Promise<string | void>;
  onDecline?: () => void | Promise<void>;
  declineLabel?: string;
  compact?: boolean;
}) {
  const [state, setState] = useState<Record<string, State>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [thanks, setThanks] = useState<string | null>(null);
  const set = (id: string, patch: Partial<State>) => setState((s) => ({ ...s, [id]: { value: s[id]?.value, other: s[id]?.other ?? "", ...patch } }));

  const missing = useMemo(
    () => survey.questions.filter((q) => {
      const a = state[q.id];
      const v = a?.value;
      const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
      if (q.type === "ranking") return false; // a ranking left alone is the order shown
      return q.required && empty && !(q.allowOther && a?.other?.trim());
    }),
    [state, survey.questions],
  );

  if (survey.alreadyAnswered || thanks !== null) {
    return (
      <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6 text-center">
        <Check className="mx-auto mb-2 text-emerald-600" size={32} />
        <p className="text-lg font-black text-emerald-900">{thanks !== null ? "Thank you!" : "You've already answered this survey"}</p>
        <p className="mt-1 text-sm font-medium text-emerald-800">{thanks || survey.thanks || "Your answers have been received."}</p>
      </div>
    );
  }
  if (survey.status !== "open") {
    return <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-600">This survey is closed.</div>;
  }

  const submit = async () => {
    setError("");
    if (missing.length) { setError(`Please answer: ${missing[0].text}`); return; }
    setBusy(true);
    try {
      const answers = survey.questions.flatMap((q) => {
        const a = state[q.id];
        const value = q.type === "ranking" ? (a?.value && (a.value as string[]).length ? a.value : (q.options ?? []).map((o) => o.id)) : a?.value;
        if ((value === undefined || value === null || value === "") && !a?.other?.trim()) return [];
        return [{ questionId: q.id, value: (value ?? null) as AnswerValue, ...(a?.other?.trim() ? { other: a.other.trim() } : {}) }];
      });
      const msg = await onSubmit(answers);
      setThanks(typeof msg === "string" ? msg : "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send your answers");
    } finally { setBusy(false); }
  };

  const closes = new Date(survey.closesAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", timeZone: "Australia/Brisbane" });
  const subjectLine = [survey.subject?.label, survey.subject?.startDate && `${fmtDay(survey.subject.startDate)}${survey.subject.endDate && survey.subject.endDate !== survey.subject.startDate ? ` – ${fmtDay(survey.subject.endDate)}` : ""}`, survey.subject?.location].filter(Boolean).join(" · ");

  return (
    <div className="space-y-5">
      {!compact && (
        <div>
          <h2 className="text-2xl font-black text-[#06054e]">{survey.title}</h2>
          {subjectLine && <p className="mt-1 text-sm font-bold text-slate-600">{subjectLine}</p>}
        </div>
      )}
      {survey.onBehalfOf && <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-900">Answering on behalf of {survey.onBehalfOf}.</p>}
      {survey.intro && <p className="whitespace-pre-line text-sm font-medium text-slate-700">{survey.intro}</p>}
      <p className="text-xs font-bold text-slate-500">
        {survey.anonymous ? "Your answers are anonymous: they are kept apart from your name." : "Your answers will be seen by the people running this survey."} Closes {closes}.
      </p>

      {survey.questions.map((q, i) => {
        const a = state[q.id];
        return (
          <fieldset key={q.id} className="rounded-2xl border-2 border-slate-100 bg-white p-4">
            <legend className="px-1 text-sm font-black text-slate-800">{i + 1}. {q.text}{q.required && <span className="text-red-500"> *</span>}</legend>
            {q.help && <p className="mb-2 text-xs font-medium text-slate-500">{q.help}</p>}
            {q.type === "single" && (
              <div className="space-y-1.5">
                {q.options!.map((o) => (
                  <label key={o.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-semibold ${a?.value === o.id ? "border-[#06054e] bg-slate-50" : "border-slate-200"}`}>
                    <input type="radio" name={q.id} checked={a?.value === o.id} onChange={() => set(q.id, { value: o.id })} /> {o.label}
                  </label>
                ))}
              </div>
            )}
            {q.type === "multi" && (
              <div className="space-y-1.5">
                {q.options!.map((o) => {
                  const list = (a?.value as string[] | undefined) ?? [];
                  return (
                    <label key={o.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-semibold ${list.includes(o.id) ? "border-[#06054e] bg-slate-50" : "border-slate-200"}`}>
                      <input type="checkbox" checked={list.includes(o.id)} onChange={(e) => set(q.id, { value: e.target.checked ? [...list, o.id] : list.filter((x) => x !== o.id) })} /> {o.label}
                    </label>
                  );
                })}
              </div>
            )}
            {q.type === "yes_no" && (
              <div className="flex gap-2">
                {(["yes", "no"] as const).map((v) => (
                  <button key={v} type="button" onClick={() => set(q.id, { value: v })} className={`rounded-xl border-2 px-6 py-2 text-sm font-black capitalize ${a?.value === v ? "border-[#06054e] bg-[#06054e] text-white" : "border-slate-200 text-slate-700 hover:border-slate-400"}`}>{v}</button>
                ))}
              </div>
            )}
            {(q.type === "rating" || q.type === "scale10") && <Scale q={q} value={a?.value as number | undefined} onChange={(n) => set(q.id, { value: n })} />}
            {q.type === "ranking" && <Ranking q={q} value={a?.value as string[] | undefined} onChange={(v) => set(q.id, { value: v })} />}
            {q.type === "text" && (
              <textarea rows={3} maxLength={2000} value={(a?.value as string) ?? ""} onChange={(e) => set(q.id, { value: e.target.value })} className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-teal-400" />
            )}
            {q.allowOther && (
              <input type="text" placeholder="Other (please say)" maxLength={300} value={a?.other ?? ""} onChange={(e) => set(q.id, { other: e.target.value })} className="mt-2 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-medium outline-none focus:border-teal-400" />
            )}
          </fieldset>
        );
      })}

      {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={submit} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#06054e] px-6 py-3 text-sm font-black text-white disabled:opacity-60">
          {busy && <Loader2 className="animate-spin" size={16} />} Send my answers
        </button>
        {onDecline && <button type="button" onClick={() => void onDecline()} className="text-sm font-bold text-slate-500 hover:text-slate-800">{declineLabel}</button>}
      </div>
    </div>
  );
}
