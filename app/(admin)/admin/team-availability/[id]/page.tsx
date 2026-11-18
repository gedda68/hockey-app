"use client";

// Who's in, maybe, out, away, and yet to answer for one match.

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import type { Bucket, RsvpSummary } from "@/lib/rsvp/logic";

interface Req { requestId: string; title: string; teamName: string; matchDate: string; startsAt?: string; venue?: string; note?: string; squadSize: number | null; status: string; canRemind: boolean }

const COLUMNS: { key: Bucket; label: string; tone: string }[] = [
  { key: "in", label: "In", tone: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  { key: "maybe", label: "Maybe", tone: "bg-amber-50 border-amber-200 text-amber-800" },
  { key: "out", label: "Out", tone: "bg-red-50 border-red-200 text-red-800" },
  { key: "away", label: "Marked away", tone: "bg-slate-100 border-slate-200 text-slate-700" },
  { key: "noReply", label: "No reply yet", tone: "bg-sky-50 border-sky-200 text-sky-800" },
];

export default function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [req, setReq] = useState<Req | null>(null);
  const [sum, setSum] = useState<RsvpSummary | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/rsvp/${encodeURIComponent(id)}`, { credentials: "include" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Couldn't load");
      setReq(d.request); setSum(d.summary);
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't load"); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const act = async (action: string, done: (d: Record<string, number>) => string) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/rsvp/${encodeURIComponent(id)}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Failed");
      toast.success(done(d));
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };

  const day = req && new Date(req.startsAt ?? `${req.matchDate}T00:00:00+10:00`).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "Australia/Brisbane" });
  const time = req?.startsAt ? new Date(req.startsAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Brisbane" }) : "";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <PageHeader eyebrow="Squad availability" title={req?.title ?? "Match"} subtitle={<><Link href="/admin/team-availability" className="underline">← All requests</Link>{req ? ` · ${req.teamName} · ${day}${time ? `, ${time}` : ""}${req.venue ? ` · ${req.venue}` : ""}` : ""}</>} />
      {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : !req || !sum ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div> : (
        <>
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border-2 border-slate-100 bg-white p-5">
            <p className="text-3xl font-black text-[#06054e]">{sum.counts.in}{req.squadSize ? <span className="text-lg text-slate-400"> / {req.squadSize}</span> : null} <span className="text-base font-bold text-slate-500">in</span></p>
            {sum.needed !== null && <p className={`text-sm font-black ${sum.needed ? "text-amber-700" : "text-emerald-700"}`}>{sum.needed ? `Need ${sum.needed} more` : "Squad is full"}</p>}
            <div className="ml-auto flex flex-wrap gap-2">
              {req.status === "open" && <button disabled={busy || !req.canRemind || !sum.counts.noReply} onClick={() => act("remind", (d) => `Reminded ${d.reminded} ${d.reminded === 1 ? "person" : "people"}`)} className="rounded-xl bg-[#06054e] px-4 py-2 text-sm font-black text-white disabled:opacity-40">Remind {sum.counts.noReply + sum.counts.away ? `${sum.counts.noReply + sum.counts.away}` : ""} who haven't answered</button>}
              {req.status === "open" && <button disabled={busy} onClick={() => act("sync", (d) => d.added ? `Added ${d.added} new ${d.added === 1 ? "player" : "players"}` : "Everyone on the roster has been asked")} className="rounded-xl border-2 border-slate-200 px-4 py-2 text-sm font-black text-slate-700">Ask new players</button>}
              {req.status === "open" ? <button disabled={busy} onClick={() => act("close", () => "Closed")} className="rounded-xl border-2 border-slate-200 px-4 py-2 text-sm font-black text-slate-700">Close</button> : <button disabled={busy} onClick={() => act("reopen", () => "Reopened")} className="rounded-xl border-2 border-slate-200 px-4 py-2 text-sm font-black text-slate-700">Reopen</button>}
            </div>
          </div>
          {sum.total === 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">Nobody has been asked: this team has no players on its roster.</p>}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {COLUMNS.map((c) => (
              <section key={c.key} className={`rounded-2xl border-2 p-4 ${c.tone}`}>
                <h3 className="mb-2 text-sm font-black">{c.label} <span className="opacity-60">({sum.counts[c.key]})</span></h3>
                {sum.buckets[c.key].length === 0 ? <p className="text-xs font-semibold opacity-60">Nobody</p> : (
                  <ul className="space-y-1.5">
                    {sum.buckets[c.key].map((p) => (
                      <li key={p.inviteId} className="text-sm font-bold text-slate-800">
                        {p.name}{p.answeredByParent && p.answer ? <span className="ml-1 text-[11px] font-semibold text-slate-500">(parent)</span> : null}
                        {p.note && <span className="block text-xs font-medium text-slate-600">{p.note}</span>}
                        {c.key === "noReply" && p.remindersSent > 0 && <span className="block text-[11px] font-semibold text-slate-500">Reminded {p.remindersSent}×</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
          <p className="text-xs font-semibold text-slate-500">"Marked away" are people who haven't answered but have told the club they're unavailable on that date.</p>
        </>
      )}
    </div>
  );
}
