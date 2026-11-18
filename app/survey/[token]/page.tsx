"use client";

// The page behind the link in a survey email. No sign-in: the link is the person's own invitation.

import { use, useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import SurveyForm, { type SurveyView } from "@/components/surveys/SurveyForm";

export default function EmailSurveyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [survey, setSurvey] = useState<SurveyView | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/public/surveys/${encodeURIComponent(token)}`)
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "This survey link isn't valid"); return d; })
      .then((d) => setSurvey(d.survey))
      .catch((e) => setError(e instanceof Error ? e.message : "This survey link isn't valid"));
  }, [token]);

  const submit = useCallback(async (answers: unknown[]) => {
    const r = await fetch(`/api/public/surveys/${encodeURIComponent(token)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Couldn't send your answers");
    return d.thanks as string;
  }, [token]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-2xl rounded-3xl bg-white p-6 shadow-lg md:p-8">
        {error ? (
          <p className="text-center text-sm font-bold text-slate-600">{error}</p>
        ) : !survey ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : (
          <SurveyForm survey={survey} onSubmit={submit} />
        )}
      </div>
    </main>
  );
}
