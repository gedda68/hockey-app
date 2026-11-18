"use client";

// components/surveys/SurveyPopup.tsx
// A pop-up form for surveys sent with "also open as a pop-up". Shows one at a time, on any admin page.
// "Remind me later" hides it for this visit; "Don't show this again" stops the pop-up (the survey stays under My surveys).

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import SurveyForm, { type SurveyView } from "@/components/surveys/SurveyForm";

const SNOOZE = "survey-popup-snoozed";
const snoozed = (): string[] => { try { return JSON.parse(sessionStorage.getItem(SNOOZE) || "[]"); } catch { return []; } };

export default function SurveyPopup() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [survey, setSurvey] = useState<SurveyView | null>(null);

  const find = useCallback(async () => {
    try {
      const list = await fetch("/api/member/surveys", { credentials: "include" }).then((r) => (r.ok ? r.json() : { surveys: [] }));
      const skip = snoozed();
      const next = (list.surveys ?? []).find((s: { popup: boolean; state: string; open: boolean; surveyId: string }) => s.popup && s.state === "pending" && s.open && !skip.includes(s.surveyId));
      if (!next) return;
      const d = await fetch(`/api/member/surveys/${encodeURIComponent(next.surveyId)}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null));
      if (d?.survey && !d.survey.alreadyAnswered) setSurvey(d.survey);
    } catch { /* a pop-up is never worth an error */ }
  }, []);

  const uid = user ? String((user as { memberId?: string; id?: string }).memberId ?? (user as { id?: string }).id ?? "me") : "";
  useEffect(() => {
    if (!uid) return;
    const t = setTimeout(find, 4000); // let the page settle first
    return () => clearTimeout(t);
  }, [uid, find]);

  if (!survey || pathname?.startsWith("/admin/my-surveys")) return null;

  const close = (remember: boolean) => {
    if (remember) { try { sessionStorage.setItem(SNOOZE, JSON.stringify([...snoozed(), survey.surveyId])); } catch { /* ignore */ } }
    setSurvey(null);
    // Another waiting survey can follow.
    setTimeout(find, 500);
  };

  const url = `/api/member/surveys/${encodeURIComponent(survey.surveyId)}`;
  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={survey.title}>
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-xl font-black text-[#06054e]">{survey.title}</h2>
          <button type="button" aria-label="Remind me later" onClick={() => close(true)} className="rounded-full p-1 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <SurveyForm
          survey={survey}
          compact
          declineLabel="Don't show this again"
          onDecline={async () => { await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decline: true }) }).catch(() => undefined); close(false); }}
          onSubmit={async (answers) => {
            const r = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }) });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(d.error || "Couldn't send your answers");
            setTimeout(() => close(false), 2500);
            return d.thanks as string;
          }}
        />
        <button type="button" onClick={() => close(true)} className="mt-3 text-xs font-bold text-slate-500 hover:text-slate-800">Remind me later</button>
      </div>
    </div>
  );
}
