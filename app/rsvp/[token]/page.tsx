"use client";

// The page behind the link in a "can you play?" email. No sign-in: the link is the person's own invitation.

import { use, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import AnswerButtons from "@/components/rsvp/AnswerButtons";
import type { RsvpAnswer } from "@/lib/rsvp/logic";

interface View { title: string; teamName: string; matchDate: string; startsAt: string | null; venue: string; note: string; playerName: string; forChild: boolean; answer: RsvpAnswer | null; answerNote: string; closed: boolean }

export default function RsvpPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [v, setV] = useState<View | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    fetch(`/api/public/rsvp/${encodeURIComponent(token)}`)
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "This link isn't valid"); return d; })
      .then((d) => setV(d.request))
      .catch((e) => setError(e instanceof Error ? e.message : "This link isn't valid"));
  }, [token]);

  const answer = async (a: RsvpAnswer, note: string) => {
    const r = await fetch(`/api/public/rsvp/${encodeURIComponent(token)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer: a, note }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setError(d.error || "Couldn't save your answer"); return; }
    setV((cur) => cur && { ...cur, answer: a, answerNote: note });
    setSaved(a === "in" ? "You're in. See you there!" : a === "maybe" ? "Thanks, we've marked you as a maybe." : "Thanks for letting us know.");
  };

  const d = v ? new Date(v.startsAt ?? `${v.matchDate}T00:00:00+10:00`) : null;
  const day = d?.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Brisbane" });
  const time = v?.startsAt && d ? d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Brisbane" }) : "";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md space-y-5 rounded-3xl bg-white p-6 shadow-lg">
        {error && !v ? <p className="text-center text-sm font-bold text-slate-600">{error}</p> : !v ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : (
          <>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">{v.teamName}</p>
              <h1 className="text-xl font-black text-[#06054e]">{v.forChild ? `Can ${v.playerName.split(" ")[0]} play?` : "Can you play?"}</h1>
              <p className="mt-1 text-sm font-bold text-slate-700">{day}{time ? `, ${time}` : ""}</p>
              <p className="text-sm font-medium text-slate-500">{v.title}{v.venue ? ` · ${v.venue}` : ""}</p>
              {v.note && <p className="mt-2 text-sm font-medium text-slate-600">{v.note}</p>}
            </div>
            <AnswerButtons current={v.answer} initialNote={v.answerNote} disabled={v.closed} onAnswer={answer} />
            {saved && <p className="rounded-xl bg-emerald-50 p-3 text-center text-sm font-bold text-emerald-800">{saved} You can change your answer any time before the match.</p>}
            {error && <p className="text-center text-sm font-bold text-red-600">{error}</p>}
            {v.closed && <p className="text-center text-sm font-bold text-slate-500">This match is no longer taking answers.</p>}
          </>
        )}
      </div>
    </main>
  );
}
