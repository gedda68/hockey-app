"use client";

// My surveys: the surveys I've been asked to answer, and the ones I've done.

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardList, Loader2 } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";

interface Row { surveyId: string; title: string; intro?: string; closesAt: string; anonymous: boolean; onBehalfOf: string | null; state: "pending" | "completed" | "declined"; open: boolean; subject?: { label?: string } }

export default function MySurveysPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    fetch("/api/member/surveys", { credentials: "include" }).then((r) => (r.ok ? r.json() : { surveys: [] })).then((d) => setRows(d.surveys ?? [])).catch(() => setRows([]));
  }, []);
  const todo = (rows ?? []).filter((r) => r.state !== "completed" && r.open);
  const done = (rows ?? []).filter((r) => r.state === "completed");
  const closes = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Brisbane" });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <PageHeader eyebrow="Have your say" title="My surveys" subtitle="Questions from your team, club, association or the national body." />
      {rows === null ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : (
        <>
          <section>
            <h2 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">Waiting for your answer</h2>
            {todo.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-600">Nothing waiting. We'll let you know when there's a new survey.</p>
            ) : (
              <ul className="space-y-2">
                {todo.map((s) => (
                  <li key={s.surveyId}>
                    <Link href={`/admin/my-surveys/${encodeURIComponent(s.surveyId)}`} className="flex items-center gap-3 rounded-2xl border-2 border-slate-100 bg-white p-4 transition hover:border-teal-300">
                      <ClipboardList className="shrink-0 text-teal-600" />
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-slate-800">{s.onBehalfOf ? `For ${s.onBehalfOf}: ` : ""}{s.title}</p>
                        <p className="text-xs font-semibold text-slate-500">{s.subject?.label ? `${s.subject.label} · ` : ""}{s.anonymous ? "Anonymous · " : ""}Closes {closes(s.closesAt)}</p>
                      </div>
                      <span className="text-sm font-black text-teal-700">Answer ▸</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {done.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">Answered</h2>
              <ul className="space-y-2">
                {done.map((s) => (
                  <li key={s.surveyId} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">
                    <CheckCircle2 className="text-emerald-600" size={20} /> {s.title}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
