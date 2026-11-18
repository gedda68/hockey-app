"use client";

// "Can you play on …?" requests from the coach or manager (and for my children, as their parent), answered with one tap.

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import AnswerButtons from "@/components/rsvp/AnswerButtons";
import type { RsvpAnswer } from "@/lib/rsvp/logic";

interface Row { inviteId: string; title: string; teamName: string; matchDate: string; startsAt: string | null; venue: string; note: string; playerName: string; forChild: boolean; answer: RsvpAnswer | null; answerNote: string; closed: boolean }

const when = (r: Row) => {
  const d = new Date(r.startsAt ?? `${r.matchDate}T00:00:00+10:00`);
  const day = d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "Australia/Brisbane" });
  return r.startsAt ? `${day}, ${d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Brisbane" })}` : day;
};

export default function MyRequests() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const load = useCallback(async () => {
    const r = await fetch("/api/member/rsvp", { credentials: "include" }).catch(() => null);
    setRows(r?.ok ? (await r.json()).requests ?? [] : []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const answer = async (inviteId: string, a: RsvpAnswer, note: string) => {
    const r = await fetch(`/api/member/rsvp/${encodeURIComponent(inviteId)}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer: a, note }) });
    if (!r.ok) { toast.error((await r.json().catch(() => ({}))).error || "Couldn't save your answer"); return; }
    setRows((cur) => cur && cur.map((x) => (x.inviteId === inviteId ? { ...x, answer: a, answerNote: note } : x)));
    toast.success(a === "in" ? "Great, you're in" : a === "maybe" ? "Marked as maybe" : "Thanks for letting us know");
  };

  if (!rows || rows.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Can you play?</h2>
      {rows.map((r) => (
        <div key={r.inviteId} className="space-y-3 rounded-2xl border-2 border-teal-100 bg-white p-5 shadow-sm">
          <div>
            <p className="text-base font-black text-[#06054e]">{r.forChild ? `Can ${r.playerName.split(" ")[0]} play on ` : "Can you play on "}{when(r)}?</p>
            <p className="text-xs font-semibold text-slate-500">{r.teamName} · {r.title}{r.venue ? ` · ${r.venue}` : ""}</p>
            {r.note && <p className="mt-1 text-sm font-medium text-slate-600">{r.note}</p>}
          </div>
          <AnswerButtons current={r.answer} initialNote={r.answerNote} disabled={r.closed} onAnswer={(a, n) => answer(r.inviteId, a, n)} />
          {r.closed && <p className="text-xs font-bold text-slate-400">This match is no longer taking answers.</p>}
        </div>
      ))}
    </section>
  );
}
