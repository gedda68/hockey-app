"use client";

// components/surveys/SurveyBuilder.tsx
// Create or edit a survey: what it's about, who it goes to, the questions, and how it is delivered.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import {
  AUDIENCE_GROUPS, GROUP_LABELS, LEVEL_LABELS, PURPOSE_LABELS, PURPOSES, QUESTION_TYPES, QUESTION_TYPE_LABELS,
  type AudienceGroup, type Purpose, type SurveyInput, type SurveyLevel, type SurveyQuestion,
} from "@/lib/surveys/types";
import { SURVEY_TEMPLATES } from "@/lib/surveys/templates";

interface Options {
  levels: SurveyLevel[];
  associations: { id: string; name: string }[];
  clubs: { id: string; name: string }[];
  teams: { id: string; clubId: string; name: string }[];
  competitions: { id: string; label: string }[];
  tournaments: { id: string; label: string; startDate: string; endDate: string; location: string }[];
  defaults: { associationId: string; clubId: string };
}

const inputCls = "w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-400";
const labelCls = "mb-1 block text-xs font-black uppercase tracking-wide text-slate-500";
const card = "rounded-2xl border-2 border-slate-100 bg-white p-5 space-y-4";

const toLocal = (iso: string) => { const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : "");

async function api(url: string, init?: RequestInit) {
  const r = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Something went wrong");
  return d;
}

const blankQuestion = (n: number): SurveyQuestion => ({ id: `q${Date.now().toString(36)}${n}`, type: "single", text: "", required: true, options: [{ id: "o1", label: "" }, { id: "o2", label: "" }] });

function emptySurvey(): SurveyInput {
  const open = new Date(); open.setMinutes(0, 0, 0);
  const close = new Date(open.getTime() + 14 * 86400000);
  return {
    title: "", intro: "", thanks: "Thank you for your feedback.", purpose: "general", subject: { type: "none", label: "" },
    level: "club", scopeId: "", includeBelow: true,
    audience: { teamIds: [], maxAge: null, includeGuardians: true, groups: [], participantsOf: null },
    questions: [blankQuestion(1)], delivery: { inApp: true, popup: false, email: true }, anonymous: true,
    opensAt: open.toISOString(), closesAt: close.toISOString(), remindDaysBefore: 3,
  };
}

export default function SurveyBuilder({ surveyId }: { surveyId?: string }) {
  const router = useRouter();
  const [opts, setOpts] = useState<Options | null>(null);
  const [s, setS] = useState<SurveyInput | null>(null);
  const [status, setStatus] = useState("draft");
  const [busy, setBusy] = useState(false);
  const [reach, setReach] = useState<{ people: number; emailable: number; parents: number; capped: boolean } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const o: Options = await api("/api/admin/surveys/options");
        setOpts(o);
        if (surveyId) {
          const d = await api(`/api/admin/surveys/${encodeURIComponent(surveyId)}`);
          setS(d.survey as SurveyInput);
          setStatus(d.survey.status);
        } else {
          const base = emptySurvey();
          const level: SurveyLevel = o.levels.includes("club") && o.defaults.clubId ? "club" : o.levels.includes("association") && o.defaults.associationId ? "association" : o.levels[0];
          setS({ ...base, level, scopeId: level === "club" ? o.defaults.clubId : level === "association" ? o.defaults.associationId : "" });
        }
      } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't load"); }
    })();
  }, [surveyId]);

  const locked = status !== "draft";
  const patch = (p: Partial<SurveyInput>) => setS((cur) => (cur ? { ...cur, ...p } : cur));
  const patchAudience = (p: Partial<SurveyInput["audience"]>) => setS((cur) => (cur ? { ...cur, audience: { ...cur.audience, ...p } } : cur));
  const setQ = (i: number, p: Partial<SurveyQuestion>) => setS((cur) => cur && { ...cur, questions: cur.questions.map((q, j) => (j === i ? { ...q, ...p } : q)) });

  // How many people it will go to, as the audience changes.
  useEffect(() => {
    if (!s || locked || (s.level !== "global" && !s.scopeId)) { setReach(null); return; }
    let live = true;
    const t = setTimeout(async () => {
      try {
        const r = await api("/api/admin/surveys/preview", { method: "POST", body: JSON.stringify({ level: s.level, scopeId: s.scopeId, includeBelow: s.includeBelow, audience: s.audience }) });
        if (live) setReach(r);
      } catch { if (live) setReach(null); }
    }, 500);
    return () => { live = false; clearTimeout(t); };
  }, [s?.level, s?.scopeId, s?.includeBelow, s?.audience, locked]); // eslint-disable-line react-hooks/exhaustive-deps

  const teamsForScope = useMemo(() => {
    if (!opts || !s) return [];
    if (s.level === "club") return opts.teams.filter((t) => t.clubId === s.scopeId);
    return opts.teams;
  }, [opts, s?.level, s?.scopeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyTemplate = (key: string) => {
    const t = SURVEY_TEMPLATES.find((x) => x.key === key);
    if (!t || !s) return;
    if (s.title && !window.confirm("Replace what you've written with this template?")) return;
    patch({ title: t.title, intro: t.intro, purpose: t.purpose, anonymous: t.anonymous, subject: { type: t.subjectType, label: "" }, questions: t.questions.map((q) => ({ ...q, options: q.options?.map((o) => ({ ...o })) })) });
  };

  const save = useCallback(async (publish: boolean) => {
    if (!s) return;
    setBusy(true);
    try {
      let id = surveyId;
      if (id) await api(`/api/admin/surveys/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(s) });
      else id = (await api("/api/admin/surveys", { method: "POST", body: JSON.stringify(s) })).survey.surveyId as string;
      if (publish && status === "draft") {
        if (!window.confirm(`Send this survey to ${reach ? `${reach.people.toLocaleString()} people` : "the audience"}? Questions can't be changed once it's published.`)) { setBusy(false); if (!surveyId) router.replace(`/admin/surveys/${id}/edit`); return; }
        const r = await api(`/api/admin/surveys/${encodeURIComponent(id!)}/publish`, { method: "POST" });
        toast.success(`${r.status === "open" ? "Published" : "Scheduled"} for ${r.invited.toLocaleString()} people${r.emailed ? `, ${r.emailed} emailed` : ""}`);
      } else toast.success("Saved");
      router.push(`/admin/surveys/${id}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save"); }
    finally { setBusy(false); }
  }, [s, surveyId, status, reach, router]);

  if (!opts || !s) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>;

  const scopeOptions = s.level === "association" ? opts.associations : s.level === "club" ? opts.clubs : s.level === "team" ? opts.teams.map((t) => ({ id: t.id, name: t.name })) : [];
  const subjectNeeded = s.purpose === "competition" || s.purpose === "event" || s.purpose === "topic";
  const part = s.audience.participantsOf;

  return (
    <div className="space-y-5">
      {locked && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">This survey is {status}. You can change its wording, closing date and reminder. The questions and audience are locked so answers stay comparable.</p>}

      {!surveyId && (
        <section className={card}>
          <h2 className="text-sm font-black text-[#06054e]">Start from a ready-made survey</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {SURVEY_TEMPLATES.map((t) => (
              <button key={t.key} type="button" onClick={() => applyTemplate(t.key)} className="rounded-xl border-2 border-slate-200 p-3 text-left transition hover:border-teal-400">
                <span className="block text-sm font-black text-slate-800">{t.name}</span>
                <span className="block text-xs font-medium text-slate-500">{t.description}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className={card}>
        <h2 className="text-sm font-black text-[#06054e]">What it's about</h2>
        <div><label className={labelCls}>Title</label><input className={inputCls} value={s.title} maxLength={140} onChange={(e) => patch({ title: e.target.value })} placeholder="e.g. Should we have an artificial surface?" /></div>
        <div>
          <label className={labelCls}>Introduction (shown above the questions)</label>
          <textarea rows={3} className={inputCls} value={s.intro} maxLength={1500} onChange={(e) => patch({ intro: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Kind of survey</label>
            <select className={inputCls} disabled={locked} value={s.purpose} onChange={(e) => { const purpose = e.target.value as Purpose; patch({ purpose, subject: { type: purpose === "competition" ? "competition" : purpose === "event" ? "tournament" : purpose === "topic" ? "topic" : "none", label: "" }, audience: { ...s.audience, participantsOf: null } }); }}>
              {PURPOSES.map((p) => <option key={p} value={p}>{PURPOSE_LABELS[p]}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Thank-you message</label>
            <input className={inputCls} value={s.thanks} maxLength={500} onChange={(e) => patch({ thanks: e.target.value })} />
          </div>
        </div>

        {s.purpose === "competition" && (
          <div>
            <label className={labelCls}>Which competition</label>
            <select className={inputCls} disabled={locked} value={s.subject.id ?? ""} onChange={(e) => { const c = opts.competitions.find((x) => x.id === e.target.value); patch({ subject: { type: "competition", id: c?.id, label: c?.label ?? "" } }); if (!c) patchAudience({ participantsOf: null }); }}>
              <option value="">Choose a competition…</option>
              {opts.competitions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        )}
        {s.purpose === "event" && (
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Tournament we hold (or type your own below)</label>
              <select className={inputCls} disabled={locked} value={s.subject.id ?? ""} onChange={(e) => { const t = opts.tournaments.find((x) => x.id === e.target.value); if (t) patch({ subject: { type: "tournament", id: t.id, label: t.label, startDate: t.startDate || undefined, endDate: t.endDate || undefined, location: t.location || undefined } }); else { patch({ subject: { type: "event", label: s.subject.label } }); patchAudience({ participantsOf: null }); } }}>
                <option value="">Another event…</option>
                {opts.tournaments.map((t) => <option key={t.id} value={t.id}>{t.label}{t.startDate ? ` (${t.startDate})` : ""}</option>)}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-3"><label className={labelCls}>Event name</label><input className={inputCls} disabled={locked} value={s.subject.label} onChange={(e) => patch({ subject: { ...s.subject, label: e.target.value } })} placeholder="e.g. U16 State Titles" /></div>
              <div><label className={labelCls}>From</label><input type="date" className={inputCls} disabled={locked} value={s.subject.startDate ?? ""} onChange={(e) => patch({ subject: { ...s.subject, startDate: e.target.value || undefined } })} /></div>
              <div><label className={labelCls}>To</label><input type="date" className={inputCls} disabled={locked} value={s.subject.endDate ?? ""} onChange={(e) => patch({ subject: { ...s.subject, endDate: e.target.value || undefined } })} /></div>
              <div><label className={labelCls}>Where</label><input className={inputCls} disabled={locked} value={s.subject.location ?? ""} onChange={(e) => patch({ subject: { ...s.subject, location: e.target.value || undefined } })} placeholder="e.g. Maryborough" /></div>
            </div>
          </div>
        )}
        {s.purpose === "topic" && (
          <div><label className={labelCls}>Topic</label><input className={inputCls} disabled={locked} value={s.subject.label} maxLength={160} onChange={(e) => patch({ subject: { type: "topic", label: e.target.value } })} placeholder="e.g. Artificial surface, club upgrades" /></div>
        )}
        {!subjectNeeded && <p className="text-xs font-medium text-slate-500">{s.purpose === "general" ? "A general survey needs nothing more here." : "This will be about the people in the audience you pick below."}</p>}
      </section>

      <section className={card}>
        <h2 className="text-sm font-black text-[#06054e]">Who it goes to</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Level</label>
            <select className={inputCls} disabled={locked} value={s.level} onChange={(e) => { const level = e.target.value as SurveyLevel; patch({ level, scopeId: level === "club" ? opts.defaults.clubId : level === "association" ? opts.defaults.associationId : "" }); }}>
              {opts.levels.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
            </select>
          </div>
          {s.level !== "global" && (
            <div>
              <label className={labelCls}>{s.level === "association" ? "Association" : s.level === "club" ? "Club" : "Team"}</label>
              <select className={inputCls} disabled={locked} value={s.scopeId} onChange={(e) => patch({ scopeId: e.target.value })}>
                <option value="">Choose…</option>
                {scopeOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          )}
        </div>
        {s.level === "association" && (
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" disabled={locked} checked={s.includeBelow} onChange={(e) => patch({ includeBelow: e.target.checked })} /> Include the associations and clubs below it (a state survey reaches its regions and clubs)</label>
        )}

        <div>
          <label className={labelCls}>Only these groups (leave all off for everyone)</label>
          <div className="flex flex-wrap gap-2">
            {AUDIENCE_GROUPS.map((g: AudienceGroup) => {
              const on = s.audience.groups.includes(g);
              return <button key={g} type="button" disabled={locked} onClick={() => patchAudience({ groups: on ? s.audience.groups.filter((x) => x !== g) : [...s.audience.groups, g] })} className={`rounded-full border-2 px-3 py-1 text-xs font-black ${on ? "border-[#06054e] bg-[#06054e] text-white" : "border-slate-200 text-slate-600"}`}>{GROUP_LABELS[g]}</button>;
            })}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={labelCls}>Only people this age or younger</label><input type="number" min={4} max={99} disabled={locked} className={inputCls} value={s.audience.maxAge ?? ""} onChange={(e) => patchAudience({ maxAge: e.target.value ? Number(e.target.value) : null })} placeholder="No age limit" /></div>
          <label className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" disabled={locked} checked={s.audience.includeGuardians} onChange={(e) => patchAudience({ includeGuardians: e.target.checked })} /> Ask parents/guardians for juniors (under 18)</label>
        </div>
        {s.level !== "team" && s.level !== "global" && teamsForScope.length > 0 && (
          <div>
            <label className={labelCls}>Only these teams</label>
            <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
              {teamsForScope.map((t) => { const on = s.audience.teamIds.includes(t.id); return <button key={t.id} type="button" disabled={locked} onClick={() => patchAudience({ teamIds: on ? s.audience.teamIds.filter((x) => x !== t.id) : [...s.audience.teamIds, t.id] })} className={`rounded-full border-2 px-2.5 py-0.5 text-xs font-bold ${on ? "border-teal-600 bg-teal-600 text-white" : "border-slate-200 text-slate-600"}`}>{t.name}</button>; })}
            </div>
          </div>
        )}
        {s.subject.id && (s.subject.type === "competition" || s.subject.type === "tournament") && (
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" disabled={locked} checked={!!part} onChange={(e) => patchAudience({ participantsOf: e.target.checked ? { type: s.subject.type === "competition" ? "competition" : "tournament", id: s.subject.id! } : null })} />
            Only people who took part in {s.subject.label}
          </label>
        )}
        {reach && !locked && (
          <p className="rounded-xl bg-teal-50 px-3 py-2 text-sm font-bold text-teal-900">
            Goes to {reach.people.toLocaleString()} {reach.people === 1 ? "person" : "people"}{reach.capped ? " (at least; very large audiences are capped)" : ""}. {reach.emailable.toLocaleString()} can be emailed{reach.parents ? `, ${reach.parents.toLocaleString()} are parents answering for a junior` : ""}.
          </p>
        )}
      </section>

      <section className={card}>
        <h2 className="text-sm font-black text-[#06054e]">Questions</h2>
        {s.questions.map((q, i) => (
          <div key={q.id} className="space-y-3 rounded-xl border-2 border-slate-100 p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#06054e] text-xs font-black text-white">{i + 1}</span>
              <select className={`${inputCls} max-w-[16rem]`} disabled={locked} value={q.type} onChange={(e) => { const type = e.target.value as SurveyQuestion["type"]; setQ(i, { type, options: ["single", "multi", "ranking"].includes(type) ? (q.options?.length ? q.options : [{ id: "o1", label: "" }, { id: "o2", label: "" }]) : undefined, allowOther: type === "single" || type === "multi" ? q.allowOther : undefined }); }}>
                {QUESTION_TYPES.map((t) => <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>)}
              </select>
              <div className="ml-auto flex gap-1">
                <button type="button" aria-label="Move up" disabled={locked || i === 0} onClick={() => setS((c) => { if (!c) return c; const a = [...c.questions]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return { ...c, questions: a }; })} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowUp size={16} /></button>
                <button type="button" aria-label="Move down" disabled={locked || i === s.questions.length - 1} onClick={() => setS((c) => { if (!c) return c; const a = [...c.questions]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; return { ...c, questions: a }; })} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowDown size={16} /></button>
                <button type="button" aria-label="Remove question" disabled={locked || s.questions.length === 1} onClick={() => patch({ questions: s.questions.filter((_, j) => j !== i) })} className="rounded p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-30"><Trash2 size={16} /></button>
              </div>
            </div>
            <input className={inputCls} disabled={locked} value={q.text} maxLength={300} onChange={(e) => setQ(i, { text: e.target.value })} placeholder="Write the question" />
            <input className={inputCls} disabled={locked} value={q.help ?? ""} maxLength={300} onChange={(e) => setQ(i, { help: e.target.value })} placeholder="Help text (optional)" />
            {q.options && (
              <div>
                <label className={labelCls}>{q.type === "ranking" ? "Items to put in order" : "Choices"} (one per line)</label>
                <textarea rows={Math.min(8, Math.max(3, q.options.length + 1))} disabled={locked} className={inputCls} value={q.options.map((o) => o.label).join("\n")} onChange={(e) => setQ(i, { options: e.target.value.split("\n").map((label, j) => ({ id: q.options?.[j]?.id ?? `o${Date.now().toString(36)}${j}`, label })) })} />
              </div>
            )}
            {(q.type === "rating" || q.type === "scale10") && (
              <div className="grid gap-3 sm:grid-cols-2">
                <input className={inputCls} disabled={locked} value={q.lowLabel ?? ""} maxLength={60} onChange={(e) => setQ(i, { lowLabel: e.target.value })} placeholder="Low end label, e.g. Poor" />
                <input className={inputCls} disabled={locked} value={q.highLabel ?? ""} maxLength={60} onChange={(e) => setQ(i, { highLabel: e.target.value })} placeholder="High end label, e.g. Excellent" />
              </div>
            )}
            <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-700">
              <label className="flex items-center gap-2"><input type="checkbox" disabled={locked} checked={q.required} onChange={(e) => setQ(i, { required: e.target.checked })} /> Required</label>
              {(q.type === "single" || q.type === "multi") && <label className="flex items-center gap-2"><input type="checkbox" disabled={locked} checked={!!q.allowOther} onChange={(e) => setQ(i, { allowOther: e.target.checked })} /> Allow an "Other" answer</label>}
            </div>
          </div>
        ))}
        <button type="button" disabled={locked || s.questions.length >= 40} onClick={() => patch({ questions: [...s.questions, blankQuestion(s.questions.length + 1)] })} className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-2 text-sm font-black text-slate-600 hover:border-teal-400 disabled:opacity-40"><Plus size={16} /> Add a question</button>
      </section>

      <section className={card}>
        <h2 className="text-sm font-black text-[#06054e]">How it's sent</h2>
        <div className="space-y-2 text-sm font-semibold text-slate-700">
          <label className="flex items-start gap-2"><input className="mt-1" type="checkbox" disabled={locked} checked={s.delivery.inApp} onChange={(e) => patch({ delivery: { ...s.delivery, inApp: e.target.checked } })} /> A notification in the app, and an entry under My surveys</label>
          <label className="flex items-start gap-2"><input className="mt-1" type="checkbox" disabled={locked} checked={s.delivery.popup} onChange={(e) => patch({ delivery: { ...s.delivery, popup: e.target.checked } })} /> Also open it as a pop-up form the next time they use the app</label>
          <label className="flex items-start gap-2"><input className="mt-1" type="checkbox" disabled={locked} checked={s.delivery.email} onChange={(e) => patch({ delivery: { ...s.delivery, email: e.target.checked } })} /> Email with a personal link (works without signing in)</label>
          <label className="flex items-start gap-2"><input className="mt-1" type="checkbox" disabled={locked} checked={s.anonymous} onChange={(e) => patch({ anonymous: e.target.checked })} /> Anonymous: answers are kept apart from names, and results stay hidden until 5 people have answered</label>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className={labelCls}>Opens</label><input type="datetime-local" disabled={locked} className={inputCls} value={toLocal(s.opensAt)} onChange={(e) => patch({ opensAt: fromLocal(e.target.value) })} /></div>
          <div><label className={labelCls}>Closes</label><input type="datetime-local" className={inputCls} value={toLocal(s.closesAt)} onChange={(e) => patch({ closesAt: fromLocal(e.target.value) })} /></div>
          <div>
            <label className={labelCls}>Reminder to non-responders</label>
            <select className={inputCls} value={s.remindDaysBefore ?? ""} onChange={(e) => patch({ remindDaysBefore: e.target.value ? Number(e.target.value) : null })}>
              <option value="">No reminder</option>
              {[1, 2, 3, 5, 7].map((d) => <option key={d} value={d}>{d} day{d > 1 ? "s" : ""} before it closes</option>)}
            </select>
          </div>
        </div>
        {s.remindDaysBefore && !s.delivery.email && <p className="text-xs font-semibold text-slate-500">Reminders go by email to people who haven't answered. Turn email on to send them.</p>}
      </section>

      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={() => save(false)} className="rounded-xl border-2 border-[#06054e] px-6 py-3 text-sm font-black text-[#06054e] disabled:opacity-60">{locked ? "Save changes" : "Save draft"}</button>
        {!locked && <button type="button" disabled={busy} onClick={() => save(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#06054e] px-6 py-3 text-sm font-black text-white disabled:opacity-60">{busy && <Loader2 className="animate-spin" size={16} />} Save and publish</button>}
      </div>
    </div>
  );
}
