"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import SurveyForm, { type SurveyView } from "@/components/surveys/SurveyForm";

export default function AnswerSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [survey, setSurvey] = useState<SurveyView | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(`/api/member/surveys/${encodeURIComponent(id)}`, { credentials: "include" })
      .then(async (r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => setSurvey(d.survey))
      .catch(() => setMissing(true));
  }, [id]);

  const submit = useCallback(async (answers: unknown[]) => {
    const r = await fetch(`/api/member/surveys/${encodeURIComponent(id)}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Couldn't send your answers");
    return d.thanks as string;
  }, [id]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <PageHeader eyebrow="Have your say" title={survey?.title ?? "Survey"} subtitle={<Link href="/admin/my-surveys" className="underline">← My surveys</Link>} />
      {missing ? (
        <p className="rounded-2xl bg-slate-50 p-6 text-sm font-bold text-slate-600">We couldn't find that survey. It may have closed.</p>
      ) : !survey ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : (
        <SurveyForm survey={survey} compact onSubmit={submit} />
      )}
    </div>
  );
}
